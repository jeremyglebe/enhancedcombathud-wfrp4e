const MODULE_ID = "enhancedcombathud-wfrp4e";
const ACTOR_CONFIG_TEMPLATE = `modules/${MODULE_ID}/templates/argon-actor-config.hbs`;
const COMBAT_ITEM_PATTERNS_SETTING = "combatItemPatterns";
const DEFAULT_COMBAT_ITEM_PATTERNS = "*Draught*, *Potion*";
const ARGON_ICON_PATH = "modules/enhancedcombathud/icons";
const CHARACTERISTICS = ["ws", "bs", "s", "t", "i", "ag", "dex", "int", "wp", "fel"];
const COMBAT_CHARACTERISTICS = [
  { key: "ws", icon: `${ARGON_ICON_PATH}/crossed-swords.webp` },
  { key: "bs", icon: `${ARGON_ICON_PATH}/bolt-spell-cast.webp` }
];
const COMBAT_SKILLS = [
  { nameKey: "Dodge", fallback: "Dodge" },
  { nameKey: "Cool", fallback: "Cool" },
  { nameKey: "Endurance", fallback: "Endurance" },
  { nameKey: "Athletics", fallback: "Athletics" },
  { nameKey: "Language", fallback: "Language", specKey: "SPEC.Battle", specFallback: "Battle", trained: true },
  { nameKey: "Heal", fallback: "Heal", trained: true }
];
const WEAPON_LIKE_TRAIT_BASE_NAMES = new Set(["weapon", "bite", "horn", "horns"]);

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, COMBAT_ITEM_PATTERNS_SETTING, {
    name: game.i18n.localize("ECHWFRP4E.Settings.CombatItemPatterns.Name"),
    hint: game.i18n.localize("ECHWFRP4E.Settings.CombatItemPatterns.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: DEFAULT_COMBAT_ITEM_PATTERNS,
    onChange: () => ui.ARGON?.refresh?.()
  });
});

Hooks.on("argonInit", (CoreHUD) => {
  const ARGON = CoreHUD.ARGON;

  class WFRPItemButton extends ARGON.MAIN.BUTTONS.ItemButton {
    get hasTooltip() {
      return Boolean(this.item);
    }

    get quantity() {
      if (this.item?.type !== "weapon") return null;
      if (this.item.weaponGroup.value === "throwing") return this.item.quantity.value;
      return this.item.ammo?.quantity.value ?? null;
    }

    async _onLeftClick(event) {
      ui.ARGON.interceptNextDialog(event.currentTarget);

      const test = this.item.type === "spell"
        ? await this.actor.sheet.castOrChannelPrompt(this.item)
        : await this.actor.setupItem(this.item.id);

      if (test) await test.roll();
    }

    async _onRightClick() {
      this.item.sheet.render(true);
    }

    async getTooltipData() {
      const description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.item.description?.value ?? "",
        { relativeTo: this.item }
      );

      return {
        title: this.item.name,
        description,
        details: getItemDetails(this.item)
      };
    }
  }

  class WFRPCombatItemButton extends WFRPItemButton {
    get quantity() {
      const quantity = getItemQuantity(this.item);
      return Number.isNumeric(quantity) ? quantity : null;
    }

    async _onLeftClick(event) {
      ui.ARGON.interceptNextDialog(event.currentTarget);

      if (this.item.system?.usable && typeof this.item.system.use === "function") {
        await this.item.system.use({ event });
        return;
      }

      if (typeof this.item.postItem === "function") {
        await this.item.postItem();
        return;
      }

      this.item.sheet.render(true);
    }
  }

  class WFRPCharacteristicButton extends ARGON.MAIN.BUTTONS.ItemButton {
    constructor({ key, icon }) {
      super({ item: { img: icon, name: key } });
      this.key = key;
      this._icon = icon;
    }

    get label() {
      return game.i18n.localize(game.wfrp4e.config.characteristics[this.key]);
    }

    get icon() {
      return this._icon;
    }

    async _onLeftClick(event) {
      ui.ARGON.interceptNextDialog(event.currentTarget);
      const test = await this.actor.setupCharacteristic(this.key);
      if (test) await test.roll();
    }
  }

  class WFRPUnarmedButton extends ARGON.MAIN.BUTTONS.ActionButton {
    get item() {
      return game.wfrp4e.config.systemItems.unarmed;
    }

    get label() {
      return this.item.name;
    }

    get icon() {
      return this.item.img;
    }

    async _onLeftClick(event) {
      ui.ARGON.interceptNextDialog(event.currentTarget);
      const test = await this.actor.setupWeapon(this.item);
      await test.roll();
    }
  }

  class WFRPGroupButton extends ARGON.MAIN.BUTTONS.ButtonPanelButton {
    constructor({ id, label, items = [], buttons = null, icon = null, buttonClass = WFRPItemButton }) {
      super();
      this.id = id;
      this._label = label;
      this.items = items;
      this._buttons = buttons;
      this._icon = icon;
      this.buttonClass = buttonClass;
    }

    get label() {
      return this._label;
    }

    get icon() {
      return this._icon ?? this.items[0]?.img ?? "";
    }

    async _getPanel() {
      const buttons = this._buttons ?? this.items.map((item) => new this.buttonClass({ item }));

      return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({
        id: this.id,
        buttons
      });
    }
  }

  class WFRPActionPanel extends ARGON.MAIN.ActionPanel {
    get label() {
      return "ECHWFRP4E.Panel.Actions";
    }

    async _getButtons() {
      const spells = getConfiguredSpells(this.actor);
      const weaponActions = getWeaponActionItems(this.actor);
      const combatSkillButtons = getCombatSkillActions(this.actor).map((action) => {
        if (action.type === "characteristic") return new WFRPCharacteristicButton(action);
        return new WFRPItemButton({ item: action.item });
      });
      const combatItems = getCombatItems(this.actor);
      const buttons = [
        new WFRPItemButton({ item: null, isWeaponSet: true, isPrimary: true, inActionPanel: true }),
        new WFRPItemButton({ item: null, isWeaponSet: true, isPrimary: false, inActionPanel: true }),
        new WFRPUnarmedButton()
      ];

      const groups = [
        ["weapons", "ECHWFRP4E.Group.Weapons", weaponActions],
        ["spells", "ECHWFRP4E.Group.Spells", spells],
        ["prayers", "ECHWFRP4E.Group.Prayers", this.actor.itemTypes.prayer],
        [
          "traits",
          "ECHWFRP4E.Group.Traits",
          this.actor.itemTypes.trait.filter((item) => item.rollable.value && !item.system.disabled)
        ]
      ];

      for (const [id, label, items] of groups) {
        if (items.length) buttons.push(new WFRPGroupButton({ id, label, items }));
      }

      if (combatSkillButtons.length) {
        buttons.push(new WFRPGroupButton({
          id: "combat-skills",
          label: "ECHWFRP4E.Group.Skills",
          buttons: combatSkillButtons,
          icon: `${ARGON_ICON_PATH}/dodging.webp`
        }));
      }

      if (combatItems.length) {
        buttons.push(new WFRPGroupButton({
          id: "combat-items",
          label: "ECHWFRP4E.Group.Items",
          items: combatItems,
          icon: `${ARGON_ICON_PATH}/drink-me.webp`,
          buttonClass: WFRPCombatItemButton
        }));
      }

      return buttons;
    }
  }

  class WFRPPortraitPanel extends ARGON.PORTRAIT.PortraitPanel {
    get configurationTemplate() {
      return ACTOR_CONFIG_TEMPLATE;
    }

    async _getButtons() {
      const buttons = await super._getButtons();
      const openSheetButton = buttons.find((button) => button.id === "open-sheet");

      if (openSheetButton) {
        openSheetButton.icon = "fas fa-user";
        openSheetButton.label = "Open Actor Sheet";
      }

      return buttons;
    }

    get description() {
      if (this.actor.type === "character") return this.actor.details.career.value;
      return this.actor.details.species.value;
    }

    get isDead() {
      return Boolean(this.actor.hasCondition("dead"));
    }

    async getStatBlocks() {
      const wounds = this.actor.status.wounds;
      const advantage = this.actor.status.advantage.value;
      const woundRatio = wounds.max ? wounds.value / wounds.max : 0;
      const woundColor = woundRatio > 0.5 ? "#00ff64" : woundRatio > 0.25 ? "#ffc800" : "#ff3232";

      return [
        [
          { text: `${game.i18n.localize("ECHWFRP4E.Portrait.Wounds")}: ` },
          { text: wounds.value, color: woundColor },
          { text: ` / ${wounds.max}` }
        ],
        [
          { text: `${game.i18n.localize("ECHWFRP4E.Portrait.Advantage")}: ` },
          { text: advantage }
        ]
      ];
    }
  }

  class WFRPDrawerPanel extends ARGON.DRAWER.DrawerPanel {
    get title() {
      return "ECHWFRP4E.Drawer.Title";
    }

    get categories() {
      const characteristics = CHARACTERISTICS.map((key) => {
        const characteristic = this.actor.characteristics[key];
        const roll = async () => {
          const test = await this.actor.setupCharacteristic(key);
          await test.roll();
        };

        return new ARGON.DRAWER.DrawerButton([
          { label: game.i18n.localize(game.wfrp4e.config.characteristics[key]), onClick: roll },
          { label: characteristic.value, onClick: roll },
          { label: characteristic.bonus, onClick: roll }
        ]);
      });

      const skills = getConfiguredSkills(this.actor)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((skill) => {
          const roll = async () => {
            const test = await this.actor.setupSkill(skill);
            await test.roll();
          };

          return new ARGON.DRAWER.DrawerButton([
            { label: skill.name, onClick: roll },
            { label: skill.total.value, onClick: roll },
            {
              label: game.i18n.localize(
                game.wfrp4e.config.characteristicsAbbrev[skill.characteristic.value]
              ),
              onClick: roll
            }
          ]);
        });

      return [
        {
          gridCols: "3fr 1fr 1fr",
          captions: [
            { label: "ECHWFRP4E.Drawer.Characteristics", align: "left" },
            { label: "ECHWFRP4E.Drawer.Value", align: "center" },
            { label: "ECHWFRP4E.Drawer.Bonus", align: "center" }
          ],
          buttons: characteristics
        },
        {
          gridCols: "minmax(0, 3fr) minmax(3.5rem, 1fr) minmax(3.5rem, 1fr)",
          captions: [
            { label: "ECHWFRP4E.Drawer.Skills", align: "left" },
            { label: "ECHWFRP4E.Drawer.Value", align: "center" },
            { label: "ECHWFRP4E.Drawer.CharacteristicShort", align: "center" }
          ],
          buttons: skills
        }
      ];
    }
  }

  class WFRPMovementHud extends ARGON.MovementHud {
    get moveScore() {
      return Number(this.actor.details.move.value) || 0;
    }

    get movementMax() {
      return Number(this.actor.details.move.run) || (this.moveScore * 4);
    }

    get movementUnits() {
      return canvas.scene.grid?.units || canvas.scene.dimensions.units || "yd";
    }

    get movementColor() {
      if (!this.movementMax) return "base-movement";
      return super.movementColor;
    }

    updateMovementUsed() {
      this.movementUsed = Math.round(this.token.document.movementHistory.reduce((acc, movement) => {
        acc += movement.cost;
        return acc;
      }, 0));
    }

    updateMovement() {
      this.updateMovementUsed();

      const runDistance = this.movementMax;
      const bubbleCount = Math.max(Math.round(this.moveScore), 1);
      const bubbleDistance = runDistance > 0 ? runDistance / bubbleCount : 0;
      const movementBlock = runDistance ? Math.floor(this.movementUsed / runDistance) : 0;
      const movementUsedInBlock = runDistance ? this.movementUsed % runDistance : 0;
      const movementColor = this.movementColor;
      const usedBubbles = bubbleDistance
        ? Math.min(Math.ceil(movementUsedInBlock / bubbleDistance), bubbleCount)
        : 0;
      const availableBubbles = Math.max(bubbleCount - usedBubbles, 0);
      const blockLimit = (movementBlock + 1) * runDistance;
      const remainingDistance = Math.max(blockLimit - this.movementUsed, 0);
      const movementLabel = game.i18n.localize(
        movementBlock === 0 ? "ECHWFRP4E.Movement.Run" : "ECHWFRP4E.Movement.Sprint"
      );

      const barsContainer = this.element.querySelector(".movement-spaces");
      let newHtml = "";
      for (let i = 0; i < availableBubbles; i++) {
        newHtml += `<div class="movement-space ${movementColor}"></div>`;
      }
      for (let i = 0; i < usedBubbles; i++) {
        newHtml += `<div class="movement-space"></div>`;
      }

      this.element.querySelector(".movement-current").innerText =
        `${movementLabel} ${formatMovementValue(remainingDistance)} ${this.movementUnits}`;
      this.element.querySelector(".movement-max").innerText =
        `${formatMovementValue(blockLimit)} ${this.movementUnits}`;
      this.element.title = game.i18n.format("ECHWFRP4E.Movement.Hint", {
        move: this.moveScore,
        distance: formatMovementValue(bubbleDistance),
        units: this.movementUnits
      });
      barsContainer.innerHTML = newHtml;
    }
  }

  class WFRPWeaponSets extends ARGON.WeaponSets {
    async getDefaultSets() {
      const equipped = this.actor.itemTypes.weapon.filter((item) => item.isEquipped);

      return {
        1: {
          primary: equipped[0]?.uuid ?? null,
          secondary: equipped[1]?.uuid ?? null
        },
        2: { primary: null, secondary: null },
        3: { primary: null, secondary: null }
      };
    }

    async _onDrop(event) {
      event.preventDefault();
      event.stopPropagation();

      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (data.type !== "Item") return;

      const item = await fromUuid(data.uuid);
      if (!isWeaponSetItem(item) || item.actor !== this.actor) {
        throw new Error(`${MODULE_ID} | Weapon sets only accept weapons or weapon-like traits owned by the active actor.`);
      }

      const set = event.currentTarget.dataset.set;
      const slot = event.currentTarget.dataset.slot;
      const sets = foundry.utils.deepClone(this.actor.getFlag("enhancedcombathud", "weaponSets") ?? {});
      sets[set] ??= {};
      sets[set][slot] = item.uuid;

      await this.actor.setFlag("enhancedcombathud", "weaponSets", sets);
      await this.render();
    }

    async _onSetChange({ sets, active }) {
      if (!this.actor.getFlag(MODULE_ID, "switchEquip")) return;

      const activeItems = new Map(
        Object.values(sets[active] ?? {})
          .filter(Boolean)
          .filter(isEquippableWeapon)
          .map((item) => [item.id, item])
      );
      const inactiveItems = new Map(Object.entries(sets)
        .filter(([set]) => set !== active)
        .flatMap(([, slots]) => Object.values(slots))
        .filter((item) => item && !activeItems.has(item.id))
        .filter(isEquippableWeapon)
        .map((item) => [item.id, item]));

      const updates = [];
      for (const item of activeItems.values()) {
        if (!item.isEquipped) updates.push({ _id: item.id, "system.equipped.value": true });
      }
      for (const item of inactiveItems.values()) {
        if (item.isEquipped) updates.push({ _id: item.id, "system.equipped.value": false });
      }

      if (updates.length) await this.actor.updateEmbeddedDocuments("Item", updates);
    }
  }

  CoreHUD.definePortraitPanel(WFRPPortraitPanel);
  CoreHUD.defineDrawerPanel(WFRPDrawerPanel);
  CoreHUD.defineMainPanels([
    WFRPActionPanel,
    ARGON.PREFAB.PassTurnPanel
  ]);
  CoreHUD.defineMovementHud(WFRPMovementHud);
  CoreHUD.defineWeaponSets(WFRPWeaponSets);
  CoreHUD.defineSupportedActorTypes(["character", "npc", "creature"]);
});

function getItemDetails(item) {
  const details = [];

  if (item.type === "weapon" || isWeaponLikeTrait(item)) {
    details.push(
      { label: "ECHWFRP4E.Tooltip.Damage", value: item.DamageString },
      { label: "ECHWFRP4E.Tooltip.Range", value: item.isRanged ? item.Range : item.Reach }
    );
  }

  if (item.type === "skill") {
    details.push({ label: "ECHWFRP4E.Tooltip.Total", value: item.total.value });
  }

  if (item.type === "spell") {
    details.push(
      { label: "ECHWFRP4E.Tooltip.CastingNumber", value: item.cn.value },
      { label: "ECHWFRP4E.Tooltip.Range", value: item.Range },
      { label: "ECHWFRP4E.Tooltip.Target", value: item.Target },
      { label: "ECHWFRP4E.Tooltip.Duration", value: item.Duration }
    );
  }

  if (item.type === "prayer") {
    details.push(
      { label: "ECHWFRP4E.Tooltip.Range", value: item.Range },
      { label: "ECHWFRP4E.Tooltip.Target", value: item.Target },
      { label: "ECHWFRP4E.Tooltip.Duration", value: item.Duration }
    );
  }

  return details.filter((detail) => detail.value !== undefined && detail.value !== "");
}

function getConfiguredSkills(actor) {
  const visibility = actor.getFlag(MODULE_ID, "skillVisibility") || "all";
  const skills = [...actor.itemTypes.skill];

  if (visibility === "basic") return skills.filter((skill) => !isAdvancedSkill(skill));
  if (visibility === "advanced") return skills.filter(isAdvancedSkill);
  if (visibility === "trained") return skills.filter(isTrainedSkill);

  return skills;
}

function getConfiguredSpells(actor) {
  const visibility = actor.getFlag(MODULE_ID, "spellVisibility") || "all";
  const spells = actor.itemTypes.spell;

  if (visibility !== "memorized") return spells;

  return spells.filter((spell) => spell.lore?.value === "petty" || spell.memorized?.value);
}

function isAdvancedSkill(skill) {
  return skill.advanced?.value === "adv" || skill.grouped?.value === "isSpec";
}

function isTrainedSkill(skill) {
  return Number(skill.advances?.value ?? skill.system?.advances?.value ?? 0) > 0;
}

function getWeaponActionItems(actor) {
  return [
    ...actor.itemTypes.weapon,
    ...actor.itemTypes.trait.filter(isWeaponLikeTrait)
  ];
}

function getCombatSkillActions(actor) {
  const actions = COMBAT_CHARACTERISTICS.map((action) => ({
    ...action,
    type: "characteristic"
  }));

  for (const config of COMBAT_SKILLS) {
    const skill = findActorSkill(actor, getCombatSkillName(config));
    if (!skill) continue;
    if (config.trained && !isTrainedSkill(skill)) continue;

    actions.push({
      type: "skill",
      item: skill
    });
  }

  return actions;
}

function getCombatSkillName({ nameKey, fallback, specKey, specFallback }) {
  const name = localizeFallback(`NAME.${nameKey}`, fallback);
  if (!specKey) return name;

  return `${name} (${localizeFallback(specKey, specFallback)})`;
}

function findActorSkill(actor, name) {
  const normalizedName = normalizeName(name);
  return actor.itemTypes.skill.find((skill) => normalizeName(skill.name) === normalizedName);
}

function getCombatItems(actor) {
  const patterns = parseCombatItemPatterns();
  if (!patterns.length) return [];

  return actor.items
    .filter((item) => isInventoryActionItem(item))
    .filter((item) => hasAvailableQuantity(item))
    .filter((item) => patterns.some((pattern) => wildcardMatch(item.name, pattern)));
}

function parseCombatItemPatterns() {
  const value = game.settings.get(MODULE_ID, COMBAT_ITEM_PATTERNS_SETTING) ?? DEFAULT_COMBAT_ITEM_PATTERNS;
  return String(value)
    .split(/[\n,;]+/)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

function wildcardMatch(value, pattern) {
  const escapedPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escapedPattern}$`, "i").test(value);
}

function isInventoryActionItem(item) {
  return item?.type && !["skill", "weapon", "trait", "spell", "prayer"].includes(item.type);
}

function hasAvailableQuantity(item) {
  const quantity = getItemQuantity(item);
  return !Number.isNumeric(quantity) || quantity > 0;
}

function getItemQuantity(item) {
  return Number(item.quantity?.value ?? item.system?.quantity?.value);
}

function formatMovementValue(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function isWeaponSetItem(item) {
  return item?.type === "weapon" || isWeaponLikeTrait(item);
}

function isEquippableWeapon(item) {
  return item?.type === "weapon";
}

function isWeaponLikeTrait(item) {
  if (item?.type !== "trait") return false;
  if (!item.rollable?.value || item.system?.disabled) return false;

  return WEAPON_LIKE_TRAIT_BASE_NAMES.has(getBaseItemName(item.name).toLowerCase());
}

function getBaseItemName(name) {
  return String(name).replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function localizeFallback(key, fallback) {
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}

function normalizeName(name) {
  return String(name).trim().toLowerCase();
}

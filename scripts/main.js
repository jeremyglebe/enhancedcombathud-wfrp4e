const MODULE_ID = "enhancedcombathud-wfrp4e";
const CHARACTERISTICS = ["ws", "bs", "s", "t", "i", "ag", "dex", "int", "wp", "fel"];

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
    constructor({ id, label, items }) {
      super();
      this.id = id;
      this._label = label;
      this.items = items;
    }

    get label() {
      return this._label;
    }

    get icon() {
      return this.items[0].img;
    }

    async _getPanel() {
      return new ARGON.MAIN.BUTTON_PANELS.ButtonPanel({
        id: this.id,
        buttons: this.items.map((item) => new WFRPItemButton({ item }))
      });
    }
  }

  class WFRPActionPanel extends ARGON.MAIN.ActionPanel {
    get label() {
      return "ECHWFRP4E.Panel.Actions";
    }

    async _getButtons() {
      const buttons = [
        new WFRPItemButton({ item: null, isWeaponSet: true, isPrimary: true, inActionPanel: true }),
        new WFRPItemButton({ item: null, isWeaponSet: true, isPrimary: false, inActionPanel: true }),
        new WFRPUnarmedButton()
      ];

      const groups = [
        ["weapons", "ECHWFRP4E.Group.Weapons", this.actor.itemTypes.weapon],
        ["spells", "ECHWFRP4E.Group.Spells", this.actor.itemTypes.spell],
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

      return buttons;
    }
  }

  class WFRPPortraitPanel extends ARGON.PORTRAIT.PortraitPanel {
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

      const skills = [...this.actor.itemTypes.skill]
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
          gridCols: "3fr 1fr 1fr",
          captions: [
            { label: "ECHWFRP4E.Drawer.Skills", align: "left" },
            { label: "ECHWFRP4E.Drawer.Value", align: "center" },
            { label: "ECHWFRP4E.Drawer.Characteristic", align: "center" }
          ],
          buttons: skills
        }
      ];
    }
  }

  class WFRPMovementHud extends ARGON.MovementHud {
    get movementMax() {
      return Number(this.actor.details.move.walk) / canvas.scene.dimensions.distance;
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
      if (item.type !== "weapon" || item.actor !== this.actor) {
        throw new Error(`${MODULE_ID} | Weapon sets only accept weapons owned by the active actor.`);
      }

      const set = event.currentTarget.dataset.set;
      const slot = event.currentTarget.dataset.slot;
      const sets = foundry.utils.deepClone(this.actor.getFlag("enhancedcombathud", "weaponSets") ?? {});
      sets[set] ??= {};
      sets[set][slot] = item.uuid;

      await this.actor.setFlag("enhancedcombathud", "weaponSets", sets);
      await this.render();
    }

    async _onSetChange() {
      // Weapon sets are HUD shortcuts and do not alter WFRP4E equipment state.
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

  if (item.type === "weapon") {
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

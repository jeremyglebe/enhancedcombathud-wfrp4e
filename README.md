# Argon - Combat HUD (WFRP4E)

WFRP4E system support for [Argon - Combat HUD](https://foundryvtt.com/packages/enhancedcombathud).

## Features

- Wounds, Advantage, and core actor controls in the portrait panel
- Per-actor HUD configuration from the portrait gear
- Clickable Characteristic and Skill tests in the drawer
- Weapon-set shortcuts and grouped access to Weapons, combat Skills, combat Items, Spells, Prayers, and rollable Traits
- Weapon-like creature Traits such as Weapon, Bite, and Horns can be used in weapon slots
- WFRP4E's native test dialogs, casting/channeling prompt, and roll handling
- Unarmed attacks, WFRP run-based movement tracking, and pass-turn support
- Character, NPC, and Creature actors

## Requirements

- Foundry Virtual Tabletop 14
- Warhammer Fantasy Roleplay 4th Edition 9.6.1 or newer
- Argon - Combat HUD 5.0.1 or newer

## Installation

In Foundry's **Add-on Modules** tab, click **Install Module** and paste this manifest URL:

```text
https://github.com/jeremyglebe/enhancedcombathud-wfrp4e/releases/latest/download/module.json
```

Enable both **Argon - Combat HUD (CORE)** and **Argon - Combat HUD (WFRP4E)** in your world.

## Usage

Open the HUD from Argon's crossed-swords control or with its `Shift+A` keybinding. Left-click an action to use WFRP4E's normal test flow; right-click an item action to open its sheet.

Hover over the top-right of the portrait to reveal the actor configuration gear. The actor configuration can show only memorized/petty spells, filter the skills drawer including a trained-skills-only view, and decide whether weapon-set switching should also update WFRP4E equipment state.

Weapon sets act as HUD shortcuts. Drag an owned Weapon, or a weapon-like Trait such as Weapon, Bite, or Horns, from the actor sheet into a slot, select a set to display it, and right-click a slot to clear it. By default, changing sets does not change the actor's WFRP4E equipment state unless equipment syncing is enabled in that actor's HUD configuration. Trait attacks are ignored by that equipment sync because WFRP does not treat them as equipment.

The Actions panel includes a combat Skills menu for common combat rolls such as Weapon Skill, Ballistic Skill, Dodge, Cool, Endurance, and Athletics. Language (Battle) and Heal are included when the actor has at least one advance in those skills.

The Items action menu appears only when the actor owns matching combat items with available quantity. The world setting **Argon combat item patterns** controls matching with comma, semicolon, or line separated wildcard patterns. The default is `*Draught*, *Potion*`.

The movement tracker uses WFRP Run distance for the first combat movement block. Its bubbles are based on the actor's Move score, so a Move 4 actor has four bubbles across a 16 yard run, with each bubble representing 4 yards. Movement beyond the run block is labeled as Sprint.

## License

This module is released under the MIT License. Warhammer Fantasy Roleplay and related marks belong to their respective owners. This project is not affiliated with or endorsed by Cubicle 7 Entertainment or Games Workshop.

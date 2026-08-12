# Argon - Combat HUD (WFRP4E) migration package

This package has moved to [WFRP4e Compatibility Box](https://github.com/jeremyglebe/wfrp4e-compatibility-box).

Version 2.0.1 is an intentionally code-free migration release. Updating this legacy package tells
Foundry to install and enable WFRP4e Compatibility Box while preserving this package ID for existing
installations and update checks. The maintained Argon integration now runs exclusively from the new
module, so the legacy and consolidated implementations cannot both patch Argon.

## Requirements

- Foundry Virtual Tabletop 14
- Warhammer Fantasy Roleplay 4th Edition 9.6.1 or newer
- Argon - Combat HUD 5.0.1 or newer
- WFRP4e Compatibility Box 1.0.0 or newer

## Installation

Existing users can update this package normally. For a new installation, install WFRP4e
Compatibility Box directly with this manifest URL:

```text
https://github.com/jeremyglebe/wfrp4e-compatibility-box/releases/latest/download/module.json
```

Enable **Argon - Combat HUD (CORE)** and **WFRP4e Compatibility Box** in your world. The Compatibility
Box only exposes its Argon feature setting while Argon is active.

## Usage

See the [Compatibility Box README](https://github.com/jeremyglebe/wfrp4e-compatibility-box#readme)
for current installation, configuration, and usage details.

## License

This module is released under the MIT License. Warhammer Fantasy Roleplay and related marks belong to their respective owners. This project is not affiliated with or endorsed by Cubicle 7 Entertainment or Games Workshop.

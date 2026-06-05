# Fowl Play

Fowl Play is a browser-based twin-stick wave survival prototype built with vanilla HTML, CSS, and Canvas JavaScript.

## Play

Open `index.html` in a browser, or host the folder with any static web server.

## Controls

- Move: `WASD` or arrow keys
- Aim: mouse
- Fire: left click or Space
- Swap hotbar: number keys, `Q`, `E`
- Rotate wall blueprint: `R`
- Pause: `P` or the Pause button
- Build phase: after clearing a wave, spend collected Parts on defenses or permanent watergun upgrades
- Salvage: during build phase, select Salvage and click a built defense to recover parts

## Features

- Wave survival against scaling fox enemies
- Flock collection and assist fire
- Chick evolution on flock-shot kills
- Water ammo management with refill sources
- Between-wave building with walls, turrets, spikes, repairs, and salvage
- Permanent watergun upgrades purchased with Parts collected during combat
- Farmyard, forest, and tundra biome hazards
- Procedural terrain, pickups, equipment, and character rendering

## Tech

- `index.html`: game shell and HUD
- `styles.css`: responsive HUD and controls
- `script.js`: game loop, rendering, AI, pickups, upgrades, building, and wave logic

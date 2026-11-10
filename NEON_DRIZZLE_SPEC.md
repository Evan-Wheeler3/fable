# NEON DRIZZLE: Master Spec

A cozy cyberpunk exploration game in the browser. Always night, always raining, neon everywhere. You wander a dense megacity, trade with vendors, lift wallets, dodge police, find treasure, craft gadgets and guns, and fly custom-built hovercars.

This file is the single source of truth. A new session should read this file and PROGRESS.md, then do the next unfinished milestone and nothing else.

## 0. HOW TO WORK (read first, every session)

### Session protocol

1. Read `NEON_DRIZZLE_SPEC.md` and `PROGRESS.md` (create PROGRESS.md in M0 if it doesn't exist).
2. Find the first milestone not marked DONE in PROGRESS.md. Work on that milestone only.
3. Build in small steps. Run the game after each meaningful step. Do not write large amounts of code without running it.
4. Verify visually (see Verification). Fix problems you can see.
5. When the milestone's acceptance criteria are met: update PROGRESS.md, commit, and STOP with a short report (what works, what's rough, how to run it, what the next milestone is).
6. Never start the next milestone unprompted.

### Usage-conserving rules (the user has a limited budget)

* Do not re-read the whole repo each session. Read PROGRESS.md and only the files you need.
* Keep files small and modular (target under 400 lines each) so edits are cheap.
* Prefer targeted edits over rewriting files.
* Add no dependencies beyond those listed in the Tech section without a strong reason.
* Cap debugging loops: after 3 failed attempts at the same problem, log it under Known Issues in PROGRESS.md, pick the simplest workaround, and move on.
* Batch visual checks: take several screenshots per run rather than one run per screenshot.
* If a feature is expensive and low-value, cut it and note it in PROGRESS.md rather than gold-plating.

### Quality bar

* The look is the product. Every milestone should look good in a screenshot, not only function.
* If the game works but looks flat, fix the lighting/post-processing before moving on.
* Fictional brands, names, and signage only. No real-world brands, logos, or characters.

### Tone and content rules

* Cozy first: warm lit windows, steaming food stalls, lanterns, umbrellas, soft synth music. The danger (police, heat) is a game of tag, not grim.
* No gore, no blood. Weapons are stylized energy and pulse weapons. Being caught costs money and items; there is no death screen. You wake up at a clinic.

## 1. TECH

* Language: TypeScript, strict mode.
* Build: Vite. `npm run dev` starts the game, `npm run build` makes a static bundle.
* Rendering: Three.js (WebGL2). Optional WebGPU is out of scope.
* Post-processing: the `postprocessing` library (bloom, SMAA/FXAA, vignette, chromatic aberration, film grain, optional depth of field).
* Physics: custom lightweight code only (grid/AABB collision for walking, spring-damper arcade hover for cars, simple raycasts). Do not add a physics engine.
* Audio: WebAudio, fully procedural (rain noise, synth pads, hover hum, footsteps, UI blips). No audio files.
* UI: plain DOM/CSS overlays for HUD and menus. No UI framework.
* State/saving: a small typed store, persisted to localStorage.
* Assets: procedural only. Geometry from primitives/extrusions, textures from canvas generation, fonts from system or a single web-safe stack. No external models or textures. (A Blender-made hovercar or prop pack may be added later as an optional upgrade, not required.)
* Testing hooks: `?debug` shows a stats panel; `?seed=N` makes the city deterministic; `window.__game` exposes helpers to teleport the camera/player, set time-of-day-free lighting presets, spawn NPCs/police, and trigger events, so screenshots and checks can be automated.

### Suggested structure

```
src/
  main.ts               boot, loop, quality presets
  core/                 renderer, camera, input, loop, store, save, audio
  world/                city generation, districts, streets, buildings, signs, props, lighting
  fx/                   rain, fog, wet-ground, post-processing, neon flicker, steam
  entities/             player, npc, police, vendor, hovercar
  systems/              crowd, pickpocket, heat, economy, crafting, treasure, traffic
  ui/                   hud, menus, shop, inventory, garage, crafting bench
  data/                 item tables, recipes, parts, loot, brand/name generators
PROGRESS.md
NEON_DRIZZLE_SPEC.md
```

### Performance budgets (Medium preset, mid-range laptop / integrated GPU)

* 60 fps target, 30 fps floor in the busiest street.
* Under 300 draw calls. Under 1.5M triangles visible. Under 256 MB texture memory.
* Use instancing for buildings, windows, NPCs, props, rain. Use LOD and distance culling.
* Quality presets: Low / Medium / High / Ultra that scale resolution, bloom quality, reflection quality, NPC count, draw distance, and rain density. Auto-detect a default, and allow switching in settings at any time.

## 2. ART DIRECTION

**Palette:** deep indigo and teal shadows, hot magenta, electric cyan, amber/orange window glow, occasional toxic green and violet accents. Keep it saturated but not noisy.

**Lighting:** there is no sun. All light is local: neon signs, window grids, street lamps, vehicle lights, holographic billboards. Use a few real dynamic lights near the player (pooled and moved), and fake the rest with emissive materials plus bloom.

**Atmosphere:** colored exponential fog with a height-fog gradient so street level is hazy and towers vanish into glowing mist. Light shafts or glow halos around bright signs. Steam vents, drifting haze, passing sky traffic with trails.

**Rain:** camera-local rain streaks (instanced lines or shader particles), splash rings on the ground, droplets running on a screen-space lens effect at low intensity, rain-on-umbrella for NPCs. Rain intensity adjustable in settings.

**Wet streets:** high-gloss roads and sidewalks with noise-driven puddles. Reflections via the cheapest approach that looks good: a blurred environment probe refreshed occasionally, fresnel falloff, and a low-resolution reflected emissive layer if affordable. Neon should visibly smear across the pavement.

**Signage:** procedurally generated neon signs from canvas textures with fictional brand names, noodle bars, clinics, arcades, pawn shops, ramen, "VAPOR", "KAIJU BURGER" style names. Mix of flat signs, vertical blade signs, and animated flickering tubes. Include holographic ad panels.

**Post stack (in order):** render, SSAO-lite or baked AO if affordable, bloom (the main event), chromatic aberration (subtle), vignette, film grain (subtle), color grade, SMAA.

**UI style:** thin neon outlines, translucent dark panels, monospaced or condensed type, consistent iconography. Readable first.

## 3. CORE GAMEPLAY LOOP

Explore the city -> make money (sell found items, pickpocket, treasure) -> buy parts and gear -> craft weapons and customize a hovercar -> go farther, find rarer treasure, take bigger risks.

Player verbs: walk, run, crouch, interact, pickpocket, trade, craft, drive/fly, shoot (stun/pulse), scan.

Heat is the risk system. Getting noticed raises heat; police respond; escape by breaking line of sight or hiding.

## 4. MILESTONES

Each milestone lists: Goal, Tasks, Acceptance criteria. Mark milestones DONE in PROGRESS.md.

### M0: Scaffold and tooling

Goal: a running project with a render loop, debug tools, and the progress log.

Tasks

* Vite + TypeScript + Three.js + postprocessing setup. Strict TS, lint-free build.
* Renderer with resize handling, pixel-ratio cap, and the quality preset system (stub values ok).
* Fixed-timestep update plus variable render loop, input manager (keyboard, mouse, pointer lock, basic gamepad), and a small event bus.
* `?debug` stats panel, `?seed=` support, and the `window.__game` helper object.
* A script or documented method for taking automated screenshots at preset camera positions (Playwright if available, otherwise whatever browser tooling is in the session).
* Create PROGRESS.md (template below) and a README with run instructions and controls.

Acceptance: `npm run dev` shows a lit test scene at 60 fps, debug panel works, screenshots can be captured, PROGRESS.md exists, first commit made.

### M1: The look, one beautiful street

Goal: a single rainy neon street that already looks great, with a walking player.

Tasks

* Third-person player controller (walk, run, crouch), smooth camera with collision and soft follow, plus an optional first-person toggle. Simple capsule character with placeholder animation (procedural walk bob/sway is fine).
* Procedural street block: road, sidewalks, curbs, tall buildings on both sides (instanced), emissive window grids with randomized lit/unlit patterns and warm/cool variation.
* Neon sign generator (canvas textures, fictional names), blade signs, a few holographic panels.
* Full atmosphere stack: colored fog with height gradient, rain, splash rings, wet reflective ground with puddles, bloom, subtle chromatic aberration, vignette, grain.
* Pooled dynamic lights near the player so signs actually light the wet street and the player.
* Procedural audio bed: rain, distant city rumble, soft synth pad loop.
* Player collision against buildings and props.

Acceptance: a screenshot of the street looks cinematic and distinctly cyberpunk; stable 60 fps on Medium; the player can walk the street with correct collision; rain and audio work; quality presets visibly change fidelity.

### M2: The city

Goal: expand the street into a navigable, varied city.

Tasks

* Deterministic city generator (seeded): a street grid with districts (Neon Strip, Market Alley, Corporate Spires, Old Town, Docks/Industrial), each with its own palette bias, building height distribution, sign density, and prop set.
* Verticality: elevated walkways and bridges, stairs, alley shortcuts, rooftop areas reachable by ladders or lifts. Overpasses with sky-traffic visible above.
* Props: vents with steam, dumpsters, crates, vending machines, benches, lampposts, puddle reflections, wires, awnings, parked hovercars (static for now), noodle carts.
* Chunked world streaming or culling so the whole map stays within budget.
* A minimap and a full map screen with district names and waypoints.
* A world-space navigation graph (sidewalks, crossings, alleys) saved for NPC and police use.

Acceptance: walk for several minutes through distinct districts without hitching or visual glitches; map and minimap are accurate; performance stays within budget; the nav graph can be visualized in debug mode.

### M3: Strangers (crowds)

Goal: the city feels alive with people.

Tasks

* Instanced humanoid NPCs with procedural variation (body shape, clothing colors, coats, hoods, hats, glowing accessories), umbrellas in the rain, and a simple procedural walk cycle.
* Behavior system: walk sidewalks via the nav graph, wait at crossings, linger at vendors, sit on benches, chat in pairs/groups, hurry when it rains hard, react to the player bumping them.
* Crowd density per district and per time-of-event pulses (e.g. busier near the market).
* NPC LOD: full detail near, simplified mid, billboard/impostor or hidden far. Cap total counts by quality preset.
* Ambient dialogue barks (text bubbles or subtitled blips, procedurally written from phrase templates) and a few unique "named" NPCs with short personalities.
* Collision avoidance (simple steering) so crowds don't clip through each other or the player.

Acceptance: busy streets with 150+ NPCs at Medium within budget; no obvious clipping chaos; varied looks and believable movement; barks appear; performance holds.

### M4: Shops, vendors, economy

Goal: a trading economy with items, shops, and inventory.

Tasks

* Item data model: id, name, category (food, junk, tech, parts, weapon mods, cosmetics, loot), value, rarity, weight/slots, description, icon (procedurally drawn).
* Inventory and equipment UI (grid, tooltips, drag or click to use/drop), money counter.
* Vendor entities (stalls, cart vendors, shopfronts) with stock tables, price variation by district, restock over time, haggling-lite (price shifts with reputation).
* Buy/sell interface, plus a pawn shop that buys loot and a fence that pays more but only when heat is low.
* Consumables with effects (food restores stamina and gives buffs, gadgets like a smoke pellet, noise maker, or lockpick).
* A basic reputation value per district that nudges prices and NPC reactions.
* Cozy touches: eat noodles at a stall (sit animation, steam, a small buff).

Acceptance: you can walk up to vendors, buy and sell, manage inventory, use consumables, and see prices vary; the economy has no infinite-money exploit.

### M5: Pickpocketing

Goal: a tense, satisfying pickpocket mechanic.

Tasks

* NPC awareness model: field-of-view cone, facing direction, distance, and a "notice" meter that fills when the player is in view or acts suspiciously (running, crouching nearby too long).
* Approach-from-behind logic. When in range and unseen, show an interaction prompt.
* The lift: a short timing mini-action (e.g. hold and release in a moving window, or a rhythm/ring mechanic). Skill upgrades widen the window.
* Loot tables per NPC type (wallet credits, keycards, tech scraps, rare items), shown as stolen items with a satisfying UI flourish.
* Failure outcomes scale: NPC feels a tug and turns; shouts for help; nearby witnesses react; heat increases by amount depending on witnesses and district.
* Crowd cover: bumping through crowds and using umbrellas/rain noise reduces notice rate.
* Skill progression (tiny tree): steady hands, quiet steps, lookout (see NPC cones), light touch.

Acceptance: you can reliably steal when careful and get caught when sloppy; awareness cones are visible in debug mode; failures produce witnesses and heat; loot feeds the economy.

### M6: Heat and police

Goal: a readable chase system that's fun, not frustrating.

Tasks

* Heat levels 0 to 5 with a HUD indicator and audio stings. Heat rises from crimes and decays when out of sight for a duration (faster in crowds and certain hiding spots).
* Police units: foot patrols, hover-drone scouts, and at higher heat, hover-patrol cars and a tougher unit. Spawning logic from off-screen near the crime, with escalation by level.
* Chase AI on the nav graph with line-of-sight tracking, last-known-position search behavior, and flanking at higher levels.
* Escape options: break line of sight and hide in alleys, vendor stalls, crowds, and rooftop access; use smoke pellets and noise makers; lose them in transit.
* Non-lethal police tools: stun pulses, tractor-net, and drone spotlights.
* Caught: lose a portion of money and some items, small fine, respawn at a clinic with brief cozy recovery scene. No game over.
* Siren audio and light effects: red/blue light bouncing across wet streets and buildings.

Acceptance: committing a crime reliably triggers a readable response; you can escape using more than one method; being caught is a setback, not a hard fail; red/blue lighting looks great.

### M7: Hovercars (driving)

Goal: fun arcade hovercar handling across the city.

Tasks

* Hovercar entity with spring-damper hover to ground height, thrust, strafe, boost, air brake, drift, pitch/roll visuals, and bob. Camera modes: chase and cockpit.
* Layered sky lanes: street-level driving and elevated lanes between towers, with ramps and lift pads between layers.
* Enter/exit animation (or quick fade), car persistence where you leave it, and theft of parked cars (a crime that adds heat).
* Collision with buildings and props (bounce plus damage), simple damage model with visual sparks and smoke.
* Ambient hover traffic that follows lanes, honks, and reacts to the player.
* Wet-road reflections of car lights, trailing light streaks, speed-based FOV and motion blur (cheap radial blur).
* Vehicle audio: procedural hum that pitches with speed, boost whoosh.

Acceptance: driving feels responsive and fun; you can transition between lanes and layers; traffic and collisions work; frame rate holds at speed.

### M8: Hovercar design (garage)

Goal: a satisfying hovercar builder.

Tasks

* Modular part system built from procedural geometry: chassis (3 to 5 shapes), thrusters (3 to 5), fins/wings (4+), canopies (3+), side pods, spoilers, lights, and trim.
* Customization: paint (color picker with metallic/matte/pearl finishes), underglow color and pattern, decals/stripes (procedural), neon trim, license plate text, and engine glow color.
* Stat model: speed, acceleration, grip, hover height, armor, boost capacity, weight. Parts shift the stats and the stats feed the handling code from M7.
* Garage scene: rotating showroom with good lighting, orbit camera, part slots UI, live stat bars, and a preview test-drive pad.
* Part acquisition: some parts for sale, some found as treasure, some crafted. Save multiple car designs; spawn a chosen design anywhere via a call-car terminal.
* Export a design as a shareable code string or JSON (import/export buttons).

Acceptance: the builder is fun and the changes show up in handling and visuals; designs persist across sessions; at least dozens of combinations look distinct.

### M9: Treasure and exploration

Goal: reasons to explore every corner.

Tasks

* Treasure system: hidden caches (rooftops, sewers, locked storage, vent shafts), each with a rarity-weighted loot roll. Some require a tool (lockpick, hacking mini-game, a hover jump).
* Clue system: procedurally generated hints (sign graffiti, NPC rumors, datachips) leading to caches, plus a tracked journal with map markers.
* A scanner gadget that pings for nearby hidden objects with a pulsing visual effect.
* Secret locations: hidden alleys, a rooftop garden, a black-market bazaar, a ghost-tram station, each with a distinct mood and unique loot.
* Collection log (rare items, graffiti tags, cat sightings (cozy), vending machine flavors) with completion rewards.
* Light mini-games: lock bypass, circuit routing, and a signal-tuning dial.

Acceptance: exploration reliably rewards curiosity; clues lead to real finds; the journal and map make progress readable; secrets feel special.

### M10: Crafting and weapons

Goal: craft gadgets and a modular energy weapon set.

Tasks

* Crafting bench UI and recipe system. Materials from scavenging, shops, and pickpocketing.
* Modular weapons: frame, core, barrel, grip, and optic/mod slots. Parts alter damage type, fire rate, spread, range, battery use, heat build-up, and color of the tracer.
* Weapon archetypes: pulse pistol, scatter blaster, rail rifle, arc caster, and a stun baton. Mostly stun/pulse; effects on NPCs and police are non-lethal (stagger, stun, knockback).
* Projectile and hit effects with bloom-friendly tracers, impact flashes, and wet-surface sparks. Recoil, muzzle flash, and reload/recharge visuals.
* Gadgets: smoke pellets, EMP (disable drones/signs), grapple hook (rooftops), decoy hologram.
* Aim system: over-the-shoulder aim with a crosshair, soft aim assist for gamepad.
* Weapon firing is a crime in most districts and raises heat; option for a training range.

Acceptance: you can assemble varied weapons that feel different; effects look great; firing has consequences through the heat system; the crafting economy loops with shops and treasure.

### M11: Polish, save/load, and ship

Goal: a cohesive, stable, shareable game.

Tasks

* Full save/load of player state, world state, inventory, garage, journal, and settings.
* Main menu, pause menu, settings (graphics, audio mixer, controls rebinding, accessibility options such as reduced flicker, reduced motion, colorblind-friendly UI accents).
* A short onboarding: a gentle first-minute tutorial with contextual prompts.
* A light narrative thread: a few recurring NPCs, a handful of simple side jobs (courier runs, find-the-item, delivery by hovercar) to give goals.
* Performance pass: profile hot spots, reduce draw calls, tune LODs, memory, and loading time.
* Audio pass: a dynamic music layer that shifts with heat and district.
* Bug-bash pass using the debug helpers; fix top issues; final screenshots for a README.
* Build a static production bundle and verify it runs from a static host.

Acceptance: a new player can start, learn, play for 30+ minutes, save and resume; no critical bugs; stable performance on Medium; production build works.

## 5. VERIFICATION (every milestone)

* Run it. Start the dev server, load the game, check the console for errors.
* Look at it. Capture screenshots at preset camera positions (the helper from M0) and judge them: does it look cinematic, is anything z-fighting, clipping, too dark, or too noisy?
* Test the numbers. Check frame time and draw-call counts in the debug panel against the budgets.
* Test the loop. Perform the milestone's core action end to end (walk the street, buy an item, steal from an NPC, escape police, drive across a district, build a car, etc.).
* Log it. Write results and known issues into PROGRESS.md.

## 6. PROGRESS.md TEMPLATE

```
# Progress

## Status
- M0 Scaffold: TODO
- M1 One beautiful street: TODO
- M2 The city: TODO
- M3 Strangers: TODO
- M4 Shops and economy: TODO
- M5 Pickpocketing: TODO
- M6 Heat and police: TODO
- M7 Hovercars: TODO
- M8 Hovercar design: TODO
- M9 Treasure: TODO
- M10 Crafting and weapons: TODO
- M11 Polish and ship: TODO

## How to run
(commands, controls)

## Decisions
(short list of choices made and why)

## Known issues
(short list)

## Cut or deferred
(features dropped to save effort)

## Last session notes
(what was done, what to do next)
```

## 7. STARTING PROMPT (for the user)

> Read NEON_DRIZZLE_SPEC.md and PROGRESS.md. Start with Milestone 0, then Milestone 1. Follow the session protocol and usage-conserving rules. Stop after the milestone and report. I'll tell you when to continue.

To continue later:

> Read NEON_DRIZZLE_SPEC.md and PROGRESS.md and continue with the next unfinished milestone.

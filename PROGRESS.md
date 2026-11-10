# Progress

## Status
- M0 Scaffold: DONE
- M1 One beautiful street: DONE
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
See README.md (`npm run dev`, controls, URL flags, `npm run shots`).

## Decisions
- Tone mapping (ACES) lives in the post stack; renderer uses NoToneMapping and a HalfFloat composer buffer so neon stays HDR for bloom.
- `renderer.info.autoReset = false`; main resets once per frame so the debug panel counts every pass (reflection + post included).
- Screenshots: `scripts/screenshot.mjs` drives Playwright against the dev server and calls `window.__game.shot(name)`.
- Height fog: `fx/atmosphere.ts` patches three's global fog shader chunks (needs `mvPosition` in any custom shader that includes `fog_vertex`). Call `installHeightFog()` before materials compile.
- Wet ground: `fx/ground.ts` is a MeshStandardMaterial (pooled lights give real highlights) with a planar reflection pass injected via onBeforeCompile. Objects pushed to `wet.hide` are skipped in that pass. Building boxes have no bottom face so the mirrored camera can see past them. Reflection off on Low.
- Buildings: one InstancedMesh, windows and shopfronts are procedural in the fragment shader (per-instance `aSeed`). `BuildingBatch.add(cx, cz, xSize, zSize, h)`.
- Signs: one 2048 canvas atlas, all sign quads merged into one draw call (`world/signs.ts`); holo panels likewise (`world/holo.ts`).
- Lights: `world/lights.ts` pools N point lights that fade/hop to the nearest `LightSource`s (signs, lamps, holo). Count comes from the quality preset.
- Collision: `world/collision.ts` AABB list; circle push-out for the player, slab ray for the camera.
- M1 street runs along Z: road |x|<6, sidewalks to |x|=11 (raised 0.15), facades at |x|=11, length 260.

## Known issues
- Cloud sessions only have software WebGL (SwiftShader, ~4 fps at 720p), so the 60 fps target could not be measured there. Medium is 62 draw calls / ~9k triangles, far inside budget; confirm fps on real hardware.
- Audio was not auditioned (headless); it starts on the first click. Check levels by ear.
- Point-light specular hot spots on puddles are a bit strong near bright signs.
- Windows are flat panes; distant window grids can shimmer slightly.
- First-person view hides the player model, so it also vanishes from reflections.

## Cut or deferred
- Lens rain droplets (screen-space) deferred; not in the M1 task list.
- Steam vents and other props are M2.
- Settings menu is M11; for now quality is keys 1-4 (persisted) and `?q=`.

## Last session notes
- M0 and M1 done in one session. Verified by screenshots (street, sidewalk, puddle, high, player) at low/medium/ultra and a scripted walk test (walk, run into wall, cross road, crouch, first person, quality switch) with no console errors. `npm run build` passes.
- Next: M2 (the city). `world/street.ts` is the thing to generalise into a seeded grid of streets with districts; batches, ground material, light pool and colliders are already reusable. Colliders will need a spatial grid once there are many buildings.

# Progress

## Status
- M0 Scaffold: DONE
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
See README.md (`npm run dev`, controls, URL flags, `npm run shots`).

## Decisions
- Tone mapping (ACES) lives in the post stack; renderer uses NoToneMapping and a HalfFloat composer buffer so neon stays HDR for bloom.
- `renderer.info.autoReset = false`; main resets once per frame so the debug panel counts every pass.
- Screenshots: `scripts/screenshot.mjs` drives Playwright against the dev server and calls `window.__game.shot(name)`.

## Known issues
- Cloud sessions only have software WebGL (SwiftShader), so fps measured there is not representative. Check 60 fps on real hardware.

## Cut or deferred

## Last session notes
- M0 done. Next: M1.

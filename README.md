# Neon Drizzle

A cozy cyberpunk exploration game for the browser. Always night, always raining.
See `NEON_DRIZZLE_SPEC.md` for the full plan and `PROGRESS.md` for current status.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + static bundle in dist/
```

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows / left stick | move |
| Mouse / right stick | look (click the canvas to capture the mouse) |
| Shift | run |
| C | crouch |
| V | toggle first / third person |
| 1-4 | quality: low / medium / high / ultra |
| M | mute |
| Esc | release the mouse |

## URL flags

- `?debug` stats panel (fps, frame ms, draw calls, triangles), skips the start screen
- `?seed=N` deterministic world
- `?q=low|medium|high|ultra` force a quality preset
- `?autostart` skip the start screen

## Automation

`window.__game` exposes helpers: `shot(name)`, `shots`, `setCam(px,py,pz,tx,ty,tz)`,
`teleport(x,z)`, `setQuality(name)`, `stats()`.

Screenshots at preset camera positions (needs the dev server running and Playwright available):

```bash
npm run shots -- --q medium --seed 7 --out screenshots
```

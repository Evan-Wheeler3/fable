# Drizzle Synth

A neon house workstation in the browser, built around the synth pad from the Neon Drizzle prototype.
Everything is synthesised live with WebAudio: no samples, no dependencies.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle in dist/
```

## What's in it

- **Drizzle Pad** (the game's sound: two detuned saws, drifting low-pass, long delay), **Sub Bass**, **House Organ**, **Glass Pluck**, **Neon Lead**
- **House drum kit**: kick, clap, snare, closed/open hat, shaker, rim, tom, on a 16-step-per-bar grid (1, 2 or 4 bars)
- **Piano roll** per instrument, locked to the chosen key and scale
- Per-instrument volume, cutoff, resonance, attack, release, reverb, delay and **pump** (sidechain ducking from the kick)
- Tempo, swing, master volume
- **Record** the master output to a 16-bit stereo WAV and download it
- Patterns are saved in the browser automatically

## Controls

| Input | Action |
| --- | --- |
| Space | play / stop |
| A S D F G H J K L ; ' | play the selected instrument (scale notes) |
| Q W E R T Y U I O P | the octave above |
| Z / X | shift the keyboard down / up an octave |
| 1-8 | drum pads |
| Click a grid | draw or erase |

"Capture keys" writes what you play on the keyboard into the pattern while it loops.

The game this grew out of is still in git history (commit `M1: one rainy neon street with a walking player`).

# The Normal Coder video kit

Ready-made, tested pipeline for The Normal Coder videos (Byte a Day, AI Explained, Blind 75): Kokoro AI voice → Whisper word timings → original ducked music → Remotion animated video with burned-in word-highlight captions. A run only writes the topic-specific `scenes.tsx` and a small meta JSON; everything else comes from this kit.

## Get the kit (one clone, no reading)
```bash
git clone -q --depth 1 https://github.com/rakeshjoshi9999/video-kit ~/kitsrc
bash ~/kitsrc/setup.sh        # quiet; prints only "SETUP OK ..." or the failing step (~1–3 min)
```
Everything lands in `~/vk` (scripts) and `~/vk/app` (Remotion project, composition id `Byte`). Don't rewrite kit files; a run only writes `script.txt`, `meta.json` and `~/vk/app/src/scenes.tsx`.

## Workflow (all commands print one short summary line)
1. `script.txt` — one numbered line per scene (a scene may hold several sentences).
2. `meta.json` — one object per scene, same order: `{"type": "hook", "headline": "SHORT HEADLINE", "hl": ["RED", "WORDS"], ...any extra props}`. Last scene `{"type": "end"}` (no captions).
3. Voice: `python3 ~/vk/voice.py script.txt work/voice --speed 1.08 --scene-gap 0.7` (Kokoro am_michael; `--voice bm_george` fallback; AI Explained `--speed 0.95 --sentence-gap 0.3 --scene-gap 0.6`; Blind 75 `--speed 0.9 --sentence-gap 0.4 --scene-gap 0.8`).
4. Timing + soundtrack: `python3 ~/vk/align.py work/voice meta.json --kicker "BYTE A DAY · 01"` → `~/vk/app/src/timeline.json` + `public/audio.wav` (voice −14 LUFS, original lo-fi music `--music-db -20` under it, ducked). Landscape: `--w 1920 --h 1080 --caption-y 900 --max-chars 42`. Music tempo `--bpm`.
5. Write `~/vk/app/src/scenes.tsx`: `export const SCENES: Record<string, React.FC<{s: Scene}>>` mapping each `type` to an animated component (Root already draws background grid, kicker, progress bar, springing headline, captions, scene fades). Copy the pattern from the example scenes.tsx (extract dir `~/kitsrc/remotion/scenes.tsx`).
6. Drafts: `bash ~/vk/render.sh stills "10 300 900 ..."` → one contact sheet `~/vk/drafts/sheet.png` (quarter size). Look at the sheet only. Fix everything on stills.
7. Final, once: `bash ~/vk/render.sh final out.mp4` (H.264 + AAC, veryfast).
8. Check: `python3 ~/vk/check.py out.mp4 --out work/sheet.png` → prints duration, LUFS, per-scene motion score (≈0 = static scene) and writes ONE contact sheet (2 frames per scene) + `hook.png` (frame 0 at 270 px). Read just those two images.

## ui.tsx API (import from "./ui")
- Colours `C` (bg, red, green, white, grey, dark, mid, yel, blue); fonts `HEAD` (Archivo Black), `MONO` (JetBrains Mono), `SANS` (Inter); `useSafe()` → {x0, x1, cx, w, top, vertical} safe area (vertical: x 60–930, keep above y 1570).
- Timing: `useT()` seconds in scene · `useProg(from, to, eased?)` 0→1 · `usePop(atS)` spring 0→1 · `wordAt(s.phrases, "word", nth, fallback)` = time that word is spoken (sync highlights to narration) · `rand(seed)`.
- Layout: `<Svg>` full-frame SVG layer · `<Pill x y text bg color border scale>` · `<Label x y text color size opacity center w>` · `<ConceptCard x y name meaning at w>` · `<Counter to at dur decimals prefix suffix style>` · `<Typewriter text at cps style>` · `<EndCard lines={[{text,size,color,font}]}>`.
- Inside `<Svg>`: `<Arrow x1 y1 x2 y2 at dur color flow>` (draws itself, optional flowing dots) · `<DrawPath d length at dur color width>` (path reveal).
- DSA: `<ArrayRow x y values cell hl={{i: color}} pointers={[{i, label, color}]} at dim={[i]}>` · `<CodeBlock x y code at step active size w>` (line-by-line reveal, active line highlighted, light Python colouring).
- Scene props: `s.dur`, `s.phrases` ([[word, start, end], ...] groups, scene-relative seconds), plus every extra key from meta.json.

## Rules that keep quality
Every scene must keep moving (motion score > ~1 for content scenes); hook headline is visible at frame 0 (Root does this for scene 1); everything inside the safe area; no logos, real UIs, real people's photos or downloaded music.


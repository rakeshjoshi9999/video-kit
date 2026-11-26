"""Kokoro narration, one clip per scene.
usage: python3 voice.py script.txt OUTDIR [--voice am_michael] [--speed 1.0] [--lang en-us]
                        [--sentence-gap 0.3] [--scene-gap 0.6] [--lead 0.15]
script.txt: one numbered line per scene ("3. text..."). A scene may hold several sentences;
they are voiced separately and joined with --sentence-gap of silence.
Writes OUTDIR/scene01.wav ... (each = lead silence + speech + scene-gap tail) and OUTDIR/scenes.json
[{"text":..., "dur":..., "speech_start": lead}]. Prints one summary line.
"""
import argparse, json, os, re
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ap = argparse.ArgumentParser()
ap.add_argument("script"); ap.add_argument("outdir")
ap.add_argument("--voice", default="am_michael"); ap.add_argument("--speed", type=float, default=1.0)
ap.add_argument("--lang", default="en-us")
ap.add_argument("--sentence-gap", type=float, default=0.3); ap.add_argument("--scene-gap", type=float, default=0.6)
ap.add_argument("--lead", type=float, default=0.15)
a = ap.parse_args()
K = os.path.expanduser(os.environ.get("KIT_DIR", "~/vk"))
k = Kokoro(f"{K}/models/kokoro-v1.0.onnx", f"{K}/models/voices-v1.0.bin")
os.makedirs(a.outdir, exist_ok=True)
lines = [re.sub(r"^\s*\d+[.)]\s*", "", l).strip() for l in open(a.script, encoding="utf-8") if l.strip()]


def trim(x, sr, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0] - int(.02 * sr)): idx[-1] + int(.05 * sr)] if len(idx) else x


meta, sr = [], 24000
for i, line in enumerate(lines, 1):
    parts = [s for s in re.split(r"(?<=[.!?])\s+", line) if s.strip()]
    chunks = []
    for j, s in enumerate(parts):
        y, sr = k.create(s.replace('"', ""), voice=a.voice, speed=a.speed, lang=a.lang)
        chunks.append(trim(y, sr))
        if j < len(parts) - 1:
            chunks.append(np.zeros(int(sr * a.sentence_gap), dtype=np.float32))
    speech = np.concatenate(chunks).astype(np.float32)
    clip = np.concatenate([np.zeros(int(sr * a.lead), np.float32), speech, np.zeros(int(sr * a.scene_gap), np.float32)])
    sf.write(f"{a.outdir}/scene{i:02d}.wav", clip, sr)
    meta.append({"text": line, "dur": round(len(clip) / sr, 3), "speech_start": a.lead})
json.dump(meta, open(f"{a.outdir}/scenes.json", "w"), indent=1)
print(f"voice: {len(meta)} scenes, {sum(m['dur'] for m in meta):.1f}s total")

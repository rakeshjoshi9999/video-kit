"""One contact sheet to review a render cheaply (one small image instead of many).
usage: python3 check.py VIDEO.mp4 [--timeline ~/vk/app/src/timeline.json] [--per 2] [--w 180] [--out sheet.png]
Takes --per frames from every scene (at 30% and 75% of the scene), tiles them with scene numbers,
and prints duration, loudness (LUFS) and a motion score per scene (mean pixel change between its frames;
~0 means the scene is static). Also writes hook.png = frame 0 at phone size (270 px wide).
"""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(); ap.add_argument("video")
ap.add_argument("--timeline", default=os.path.expanduser("~/vk/app/src/timeline.json"))
ap.add_argument("--per", type=int, default=2); ap.add_argument("--w", type=int, default=180)
ap.add_argument("--out", default="sheet.png")
a = ap.parse_args()
tl = json.load(open(a.timeline)); S = tl["scenes"]
sh = lambda c: subprocess.run(c, shell=True, capture_output=True, text=True)
W, H = tl["w"], tl["h"]; tw = a.w; th = int(tw * H / W)


def grab(t, w):
    p = "/tmp/_f.png"; sh(f'ffmpeg -v error -y -ss {t:.3f} -i "{a.video}" -frames:v 1 -vf scale={w}:-2 {p}')
    return Image.open(p).convert("RGB")


fracs = [0.3, 0.75] if a.per == 2 else list(np.linspace(0.15, 0.85, a.per))
cols = a.per * 4; rows = int(np.ceil(len(S) * a.per / cols))
sheet = Image.new("RGB", (cols * tw, rows * (th + 18)), (40, 40, 40)); d = ImageDraw.Draw(sheet)
report = []
for i, s in enumerate(S):
    ims = [grab(s["start"] + f * s["dur"], tw) for f in fracs]
    mv = float(np.mean([np.abs(np.asarray(ims[k], float) - np.asarray(ims[k + 1], float)).mean() for k in range(len(ims) - 1)])) if len(ims) > 1 else 0
    report.append(f"{i+1}:{s.get('type','')}:{mv:.1f}")
    for k, im in enumerate(ims):
        n = i * a.per + k; x, y = (n % cols) * tw, (n // cols) * (th + 18)
        sheet.paste(im, (x, y + 18)); d.text((x + 4, y + 3), f"{i+1}.{k+1} {s.get('type','')}", fill=(255, 255, 255))
sheet.save(a.out)
grab(0, 270).save(os.path.join(os.path.dirname(os.path.abspath(a.out)), "hook.png"))
dur = float(sh(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{a.video}"').stdout)
lufs = [l for l in sh(f'ffmpeg -hide_banner -i "{a.video}" -af ebur128 -f null -').stderr.splitlines() if "I:" in l][-1].split()[1]
print(f"duration {dur:.1f}s | loudness {lufs} LUFS | motion per scene (0 = static): " + " ".join(report))
print(f"sheet: {os.path.abspath(a.out)}  hook: {os.path.join(os.path.dirname(os.path.abspath(a.out)), 'hook.png')}")

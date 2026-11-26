#!/usr/bin/env bash
# Draft stills or final render, quiet.
# usage: bash render.sh stills "10 300 900"    -> ~/vk/drafts/fN.png (quarter size) + drafts/sheet.png
#        bash render.sh final OUT.mp4           -> H.264 + AAC, veryfast
set -uo pipefail
K="${KIT_DIR:-$HOME/vk}"; cd "$K/app" || exit 1; B=$(cat "$K/chrome_path")
npx tsc --noEmit -p . > "$K/tsc.log" 2>&1 || { echo "TYPECHECK FAILED"; grep -E "error TS" "$K/tsc.log" | head -15; exit 1; }
if [ "$1" = stills ]; then
  mkdir -p "$K/drafts"; rm -f "$K/drafts"/f*.png
  for f in $2; do
    npx remotion still Byte "$K/drafts/f$f.png" --frame="$f" --scale=0.25 --browser-executable="$B" > "$K/still.log" 2>&1 || { echo "STILL FAILED at frame $f"; grep -iE "error|at " "$K/still.log" | head -12; exit 1; }
  done
  python3 - "$K/drafts" <<'EOF'
import sys, glob
from PIL import Image, ImageDraw
fs = sorted(glob.glob(sys.argv[1] + "/f*.png"), key=lambda p: int(p.rsplit("f", 1)[1][:-4]))
ims = [Image.open(f).convert("RGB") for f in fs]; w, h = ims[0].size; cols = min(6, len(ims)); rows = -(-len(ims) // cols)
sh = Image.new("RGB", (cols * w, rows * (h + 16)), (40, 40, 40)); d = ImageDraw.Draw(sh)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 16); sh.paste(im, (x, y + 16)); d.text((x + 3, y + 2), f.rsplit("/", 1)[1], fill=(255, 255, 255))
sh.save(sys.argv[1] + "/sheet.png"); print("stills sheet:", sys.argv[1] + "/sheet.png")
EOF
elif [ "$1" = final ]; then
  npx remotion render Byte "$2" --codec=h264 --x264-preset=veryfast --concurrency=2 --browser-executable="$B" > "$K/render.log" 2>&1 \
    && echo "RENDER OK: $2 ($(du -h "$2" | cut -f1))" || { echo "RENDER FAILED"; grep -iE "error" "$K/render.log" | head -15; exit 1; }
fi

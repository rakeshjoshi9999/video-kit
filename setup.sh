#!/usr/bin/env bash
# One-shot, quiet setup for The Normal Coder video kit. Prints only "SETUP OK" or the failing step.
# usage: bash setup.sh            (installs into ~/vk; safe to re-run)
set -uo pipefail
K="${KIT_DIR:-$HOME/vk}"; KIT_SRC="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$K" && cd "$K" || exit 1
log="$K/setup.log"; : > "$log"
step() { echo "== $1" >> "$log"; shift; if ! "$@" >> "$log" 2>&1; then echo "SETUP FAILED at: $*"; tail -20 "$log"; exit 1; fi; }

step pip pip install -q --break-system-packages kokoro-onnx soundfile faster-whisper "numpy>=2.1"

kokoro() {
  mkdir -p models && cd models
  for f in kokoro-v1.0.onnx voices-v1.0.bin; do
    [ -s "$f" ] || curl -sSfL -o "$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f" || return 1
  done; cd ..
}
step kokoro kokoro

whisper() {
  M="$K/models/whisper-small-ct2"; [ -s "$M/model.bin" ] && return 0
  mkdir -p "$K/dl" "$M" && cd "$K/dl" || return 1
  for i in 0 1 2 3; do npm pack "@skillninja/shortmovie-telop-model-p$i" --silent && mkdir -p x$i && tar -xzf "skillninja-shortmovie-telop-model-p$i-1.0.0.tgz" -C x$i || return 1; done
  cp x0/package/{config.json,preprocessor_config.json,tokenizer.json,vocabulary.json} "$M/"
  cat x0/package/model.bin.part0 x1/package/model.bin.part1 x2/package/model.bin.part2 x3/package/model.bin.part3 > "$M/model.bin"
  echo "ca732cb1379efc49417d028465f543d83a39de2c61f3027678de103dc404ce73  $M/model.bin" | sha256sum -c - || return 1
  cd "$K" && rm -rf "$K/dl"
}
step whisper whisper

fonts() {
  mkdir -p fonts && cd fonts
  g=https://raw.githubusercontent.com/google/fonts/main/ofl
  [ -s Inter.ttf ] || curl -sSfL -o Inter.ttf "$g/inter/Inter%5Bopsz,wght%5D.ttf" || return 1
  [ -s ArchivoBlack.ttf ] || curl -sSfL -o ArchivoBlack.ttf "$g/archivoblack/ArchivoBlack-Regular.ttf" || return 1
  [ -s JetBrainsMono.ttf ] || curl -sSfL -o JetBrainsMono.ttf "$g/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf" || return 1
  cd ..
}
step fonts fonts

remotion() {
  if [ ! -d "$K/app/node_modules/remotion" ]; then
    rm -rf "$K/app" && npx -y create-video@latest --yes --blank app || return 1
    cd "$K/app" && npx remotion add @remotion/media @remotion/fonts || return 1
    cd "$K"
  fi
  mkdir -p "$K/app/public" "$K/app/src"
  cp "$KIT_SRC"/remotion/*.tsx "$KIT_SRC"/remotion/*.ts "$K/app/src/" 2>/dev/null
  rm -f "$K/app/src/Composition.tsx"
  [ -s "$K/app/src/timeline.json" ] || echo '{"w":1080,"h":1920,"fps":30,"total":3,"kicker":"","captionY":1330,"scenes":[{"type":"demo","headline":"HELLO","hl":[],"start":0,"dur":3,"phrases":[]}]}' > "$K/app/src/timeline.json"
  cp fonts/*.ttf "$K/app/public/"
  B=$(find /opt/pw-browsers -name chrome-headless-shell -type f 2>/dev/null | head -1)
  [ -n "$B" ] || return 1
  echo "$B" > "$K/chrome_path"
}
step remotion remotion

cp "$KIT_SRC"/*.py "$KIT_SRC"/*.sh "$K/" 2>/dev/null
echo "SETUP OK  (kit in $K, Remotion app in $K/app, Chrome: $(cat "$K/chrome_path"))"

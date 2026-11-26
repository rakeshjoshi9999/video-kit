"""Word timings + soundtrack + Remotion timeline in one step.
usage: python3 align.py VOICE_DIR SCENES_META.json [--app ~/vk/app] [--w 1080 --h 1920] [--kicker "BYTE A DAY · 01"]
                        [--caption-y 1330] [--bpm 94] [--music-db -20] [--max-chars 32]
VOICE_DIR: output of voice.py (scene01.wav..., scenes.json).
SCENES_META.json: [{"type": "hook", "headline": "...", "hl": ["WORD"], ...any extra props}, ...] one per scene.
Writes APP/src/timeline.json and APP/public/audio.wav (voice at -14 LUFS + original music ducked under it).
Each scene's phrases = [[word, start, end], ...] groups (<=4 words, <=max-chars), times relative to scene start.
"""
import argparse, difflib, json, os, re, subprocess
import numpy as np, soundfile as sf
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("voice_dir"); ap.add_argument("meta")
ap.add_argument("--app", default=os.path.expanduser("~/vk/app"))
ap.add_argument("--w", type=int, default=1080); ap.add_argument("--h", type=int, default=1920)
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--kicker", default=""); ap.add_argument("--caption-y", type=int, default=1330)
ap.add_argument("--bpm", type=float, default=94); ap.add_argument("--music-db", type=float, default=-20)
ap.add_argument("--max-chars", type=int, default=32)
a = ap.parse_args()
K = os.path.expanduser(os.environ.get("KIT_DIR", "~/vk"))
vd = a.voice_dir
scenes = json.load(open(f"{vd}/scenes.json")); meta = json.load(open(a.meta))
assert len(scenes) == len(meta), f"{len(scenes)} voice scenes vs {len(meta)} meta entries"
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())


def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode: raise SystemExit(f"FAILED: {cmd}\n{r.stderr[-1500:]}")
    return r.stdout


model = WhisperModel(f"{K}/models/whisper-small-ct2", device="cpu", compute_type="int8")


def word_times(wav, text, lead):
    y, sr = sf.read(wav, dtype="float32")
    sh(f'ffmpeg -v error -y -i "{wav}" -ac 1 -ar 16000 /tmp/_a16.wav')
    audio, _ = sf.read("/tmp/_a16.wav", dtype="float32")
    segs, _ = model.transcribe(audio, language="en", word_timestamps=True)
    asr = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
    words = text.split()
    times = [None] * len(words)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in words], b=[norm(w) for w, _, _ in asr], autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            _, s, e = asr[blk.b + k]; times[blk.a + k] = [s, e]
    # fill gaps by spreading evenly between known neighbours
    end_speech = len(y) / sr - 0.2
    for i in range(len(words)):
        if times[i] is None:
            p = next((j for j in range(i - 1, -1, -1) if times[j]), None)
            n = next((j for j in range(i + 1, len(words)) if times[j]), None)
            t0 = times[p][1] if p is not None else lead
            t1 = times[n][0] if n is not None else end_speech
            rs = (p + 1) if p is not None else 0; re_ = n if n is not None else len(words)
            step = max(0.05, (t1 - t0) / max(1, re_ - rs)); j = i - rs
            times[i] = [t0 + j * step, t0 + (j + 1) * step]
    for t in times:
        if t[1] - t[0] > 0.9: t[0] = t[1] - 0.9
    return [[w, round(t[0], 3), round(t[1], 3)] for w, t in zip(words, times)]


def phrases(words, max_words=4, max_chars=32):
    groups, cur = [], []
    for item in words:
        if cur and len(" ".join(x[0] for x in cur + [item])) > max_chars:
            groups.append(cur); cur = []
        cur.append(item)
        if len(cur) >= max_words or (re.search(r"[.?!,…:;]$", item[0]) and len(cur) >= 2):
            groups.append(cur); cur = []
    if cur:
        if groups and len(cur) == 1 and len(" ".join(x[0] for x in groups[-1] + cur)) <= max_chars: groups[-1] += cur
        else: groups.append(cur)
    return groups


out, start = [], 0.0
for i, (sc, m) in enumerate(zip(scenes, meta), 1):
    wav = f"{vd}/scene{i:02d}.wav"
    is_end = m.get("type") == "end" or m.get("captions") is False
    ph = [] if is_end else phrases(word_times(wav, sc["text"], sc["speech_start"]), max_chars=a.max_chars)
    out.append({**m, "start": round(start, 3), "dur": sc["dur"], "phrases": ph})
    start += sc["dur"]
total = round(start, 3)

# soundtrack: voice -14 LUFS, music ~music-db under it, ducked by the voice
lst = f"{vd}/list.txt"
open(lst, "w").write("".join(f"file '{os.path.abspath(f'{vd}/scene{i:02d}.wav')}'\n" for i in range(1, len(scenes) + 1)))
sh(f'ffmpeg -v error -y -f concat -safe 0 -i "{lst}" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -ac 2 "{vd}/voice.wav"')
sh(f'python3 "{K}/music.py" "{vd}/music.wav" {total + 0.5} --bpm {a.bpm}')
mus_lufs = -14 + a.music_db
sh(f'ffmpeg -v error -y -i "{vd}/voice.wav" -i "{vd}/music.wav" -filter_complex '
   f'"[1:a]loudnorm=I={mus_lufs}:TP=-6,aresample=48000[m];[0:a]asplit[v][sc];'
   f'[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[md];'
   f'[v][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89" -ar 48000 "{a.app}/public/audio.wav"')
tl = {"w": a.w, "h": a.h, "fps": a.fps, "total": total, "kicker": a.kicker, "captionY": a.caption_y, "scenes": out}
json.dump(tl, open(f"{a.app}/src/timeline.json", "w"), indent=1, ensure_ascii=False)
print(f"timeline: {len(out)} scenes, {total:.1f}s, {sum(len(s['phrases']) for s in out)} caption phrases -> {a.app}/src/timeline.json")

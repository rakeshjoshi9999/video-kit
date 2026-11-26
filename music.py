"""Original lo-fi bed composed in code (no samples).
usage: python3 music.py OUT.wav SECONDS [--bpm 94] [--seed 7]
Chords Cmaj7-Am7-Fmaj7-G7, soft pads + e-piano arpeggio + bass + light kick/snare/hats + faint crackle.
"""
import argparse
import numpy as np, soundfile as sf

ap = argparse.ArgumentParser(); ap.add_argument("out"); ap.add_argument("seconds", type=float)
ap.add_argument("--bpm", type=float, default=94); ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
sr = 44100; beat = 60 / a.bpm; bars = int(np.ceil(a.seconds / (4 * beat))) + 1
out = np.zeros((int(bars * 4 * beat * sr) + sr, 2)); rng = np.random.default_rng(a.seed)
n2f = lambda n: 440 * 2 ** ((n - 69) / 12)
chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]]; bass = [36, 33, 29, 31]


def add(sig, start, pan=0.5):
    i = int(start * sr); j = min(len(out), i + len(sig)); s = sig[:j - i]
    out[i:j, 0] += s * (1 - pan); out[i:j, 1] += s * pan


for b in range(bars):
    c = chords[b % 4]; st = b * 4 * beat; tt = np.arange(int(4 * beat * sr)) / sr
    env = np.minimum(1, tt / 0.4) * np.exp(-tt * 0.35)
    for q, n in enumerate(c):
        f = n2f(n) * (1 + 0.002 * np.sin(2 * np.pi * 0.3 * tt))
        add(0.045 * env * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)), st, 0.3 + 0.13 * q)
    for q in (0, 2):
        tb = np.arange(int(1.5 * beat * sr)) / sr
        add(0.12 * np.exp(-tb * 2.5) * np.sin(2 * np.pi * n2f(bass[b % 4]) * tb), st + q * beat)
    for e in range(8):
        n = c[[0, 2, 1, 3, 2, 1, 3, 2][e]] + 12; te = np.arange(int(0.6 * sr)) / sr
        add(0.03 * np.exp(-te * 6) * np.sin(2 * np.pi * n2f(n) * te), st + e * beat / 2 + 0.02 * rng.random(), 0.5 + 0.2 * np.sin(e))
    for q in range(4):
        tk = np.arange(int(0.3 * sr)) / sr
        if q in (0, 2): add(0.22 * np.exp(-tk * 18) * np.sin(2 * np.pi * (50 + 70 * np.exp(-tk * 30)) * tk), st + q * beat)
        else: add(0.05 * np.exp(-tk * 22) * rng.standard_normal(len(tk)), st + q * beat)
        for h in (0, 0.5):
            th = np.arange(int(0.05 * sr)) / sr; hs = np.diff(rng.standard_normal(len(th)), prepend=0)
            add(0.018 * np.exp(-th * 80) * hs, st + (q + h) * beat + 0.015 * rng.random(), 0.65)
out += 0.002 * rng.standard_normal(out.shape)
for ch in range(2): out[:, ch] = np.convolve(out[:, ch], np.ones(4) / 4, "same")
out = out[: int(a.seconds * sr)]
fade = int(2 * sr); out[:fade] *= np.linspace(0, 1, fade)[:, None]; out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out /= np.abs(out).max() / 0.7
sf.write(a.out, out, sr); print(f"music: {a.seconds:.1f}s at {a.bpm} BPM")

// The Normal Coder — shared Remotion building blocks. Scene files import from "./ui".
// All motion is frame-driven (useCurrentFrame / interpolate / spring); CSS animations don't render.
import React from "react";
import {AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {loadFont} from "@remotion/fonts";

loadFont({family: "Archivo Black", url: staticFile("ArchivoBlack.ttf")});
loadFont({family: "Inter", url: staticFile("Inter.ttf"), weight: "100 900"});
loadFont({family: "JetBrains Mono", url: staticFile("JetBrainsMono.ttf"), weight: "100 800"});

export const C = {
  bg: "#111111", red: "#C8102E", green: "#4ADE80", white: "#FFFFFF", grey: "#8A8A8A",
  dark: "#222222", mid: "#373737", yel: "#FFC446", blue: "#5A8CE6",
};
export const HEAD = "'Archivo Black', 'Arial Black', sans-serif";
export const MONO = "'JetBrains Mono', monospace";
export const SANS = "Inter, sans-serif";
export const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Safe area: vertical = x 60..930 (right 150 px + bottom 350 px are YouTube UI); landscape = 80..1840. */
export const useSafe = () => {
  const {width, height} = useVideoConfig();
  const vertical = height > width;
  return vertical
    ? {x0: 60, x1: 930, cx: 495, w: 870, top: 190, vertical, width, height}
    : {x0: 80, x1: 1840, cx: 960, w: 1760, top: 120, vertical, width, height};
};

/** seconds since the current Sequence started */
export const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};
/** 0..1 eased progress between two times (seconds, scene-relative) */
export const useProg = (fromS: number, toS: number, eased = true) => {
  const t = useT();
  return interpolate(t, [fromS, toS], [0, 1], eased ? {...clamp, easing: ease} : clamp);
};
/** springy 0→1 pop starting at atS seconds */
export const usePop = (atS: number, damping = 14) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - atS * fps, fps, config: {damping, stiffness: 160}});
};
/** time (s, scene-relative) when the n-th occurrence of a spoken word starts — sync visuals to narration */
export const wordAt = (phrases: [string, number, number][][], word: string, nth = 0, fallback = 0) => {
  const n = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hits = phrases.flat().filter(([w]) => n(w) === n(word));
  return hits[nth] ? hits[nth][1] : fallback;
};

export const Backdrop: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      <svg width={width} height={height}>
        <defs>
          <pattern id="grid" width={60} height={60} patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#181818" strokeWidth={2} />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
      </svg>
    </AbsoluteFill>
  );
};

/** kicker label + progress bar (progress 0..1 of the whole video) */
export const Chrome: React.FC<{progress: number; kicker: string}> = ({progress, kicker}) => {
  const s = useSafe();
  const y = s.vertical ? 70 : 40;
  return (
    <AbsoluteFill>
      <div style={{position: "absolute", left: s.x0, top: y, width: s.w, height: 12, borderRadius: 6, background: C.dark}} />
      <div style={{position: "absolute", left: s.x0, top: y, width: s.w * progress, height: 12, borderRadius: 6, background: C.red}} />
      {kicker ? (
        <>
          <div style={{position: "absolute", left: s.x0, top: y + 50, width: 24, height: 30, background: C.green}} />
          <div style={{position: "absolute", left: s.x0 + 40, top: y + 42, fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.grey}}>{kicker}</div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** Headline: words spring up one after another; words listed in hl are red. lead>0 = already visible at frame 0 (hook/thumbnail). */
export const Headline: React.FC<{text: string; hl?: string[]; size?: number; lead?: number; top?: number}> = ({text, hl = [], size, lead = 0, top}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const sz = size ?? (s.vertical ? (text.length > 22 ? 96 : 108) : 84);
  return (
    <div style={{position: "absolute", left: s.x0, top: top ?? s.top, width: s.w, display: "flex", flexWrap: "wrap", columnGap: sz * 0.28, lineHeight: 1.12}}>
      {text.split(" ").map((w, i) => {
        const p = spring({frame: f + lead - 2 - i * (lead ? 1 : 3), fps, config: {damping: 16, stiffness: 170}});
        return <span key={i} style={{fontFamily: HEAD, fontSize: sz, color: hl.includes(w) ? C.red : C.white, opacity: p, translate: `0 ${(1 - p) * 60}px`, display: "inline-block"}}>{w}</span>;
      })}
    </div>
  );
};

export type Word = [string, number, number];

/** Burned-in captions: phrase by phrase, spoken word in green. */
export const Captions: React.FC<{phrases: Word[][]; y: number; size?: number}> = ({phrases, y, size}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  const t = f / fps;
  if (!phrases.length) return null;
  let gi = 0;
  for (let i = 0; i < phrases.length; i++) if (phrases[i][0][1] <= t + 0.05) gi = i;
  const g = phrases[gi];
  let wi = 0;
  for (let i = 0; i < g.length; i++) if (g[i][1] <= t + 0.03) wi = i;
  const pop = spring({frame: f - Math.round(g[0][1] * fps), fps, config: {damping: 18, stiffness: 220}});
  return (
    <div style={{position: "absolute", left: s.x0, width: s.w, top: y, display: "flex", justifyContent: "center"}}>
      <div style={{background: "rgba(0,0,0,0.92)", borderRadius: 18, padding: "8px 24px", textAlign: "center", fontFamily: SANS, fontWeight: 800,
        fontSize: size ?? (s.vertical ? 66 : 56), lineHeight: 1.25, scale: String(0.92 + 0.08 * pop)}}>
        {g.map(([w], i) => <span key={i} style={{color: i === wi ? C.green : C.white}}>{w}{i < g.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

/** Full-frame SVG layer for illustrations (coordinates = video pixels). */
export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();
  return <AbsoluteFill><svg width={width} height={height}>{children}</svg></AbsoluteFill>;
};

export const Pill: React.FC<{x: number; y: number; text: string; bg?: string; color?: string; border?: string; font?: string; size?: number; scale?: number}> =
  ({x, y, text, bg = C.dark, color = C.white, border, font = MONO, size = 38, scale = 1}) => (
    <div style={{position: "absolute", left: x, top: y, padding: "14px 28px", borderRadius: 60, background: bg, color, border: border ? `5px solid ${border}` : undefined,
      fontFamily: font, fontWeight: 800, fontSize: size, scale: String(scale), transformOrigin: "left center", whiteSpace: "nowrap"}}>{text}</div>
  );

export const Label: React.FC<{x: number; y: number; text: string; color?: string; size?: number; opacity?: number; center?: boolean; w?: number; font?: string}> =
  ({x, y, text, color = C.grey, size = 32, opacity = 1, center, w = 600, font = MONO}) => (
    <div style={{position: "absolute", left: center ? x - w / 2 : x, top: y, width: center ? w : undefined, textAlign: center ? "center" : "left",
      fontFamily: font, fontWeight: 600, fontSize: size, color, opacity}}>{text}</div>
  );

/** Concept card: pops in with the concept name + a short plain meaning. */
export const ConceptCard: React.FC<{x: number; y: number; name: string; meaning: string; at?: number; w?: number}> = ({x, y, name, meaning, at = 0.3, w = 600}) => {
  const p = usePop(at);
  return (
    <div style={{position: "absolute", left: x, top: y, width: w, padding: "22px 30px", borderRadius: 26, background: C.dark, border: `5px solid ${C.green}`,
      scale: String(p), opacity: p, transformOrigin: "left top"}}>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 26, color: C.green}}>NEW CONCEPT</div>
      <div style={{fontFamily: HEAD, fontSize: 56, color: C.white, marginTop: 6}}>{name}</div>
      <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 34, color: C.grey, marginTop: 6}}>{meaning}</div>
    </div>
  );
};

/** Number that counts up from `from` to `to` between two times. */
export const Counter: React.FC<{from?: number; to: number; at: number; dur?: number; decimals?: number; prefix?: string; suffix?: string; style?: React.CSSProperties}> =
  ({from = 0, to, at, dur = 1, decimals = 0, prefix = "", suffix = "", style}) => {
    const p = useProg(at, at + dur);
    const v = from + (to - from) * p;
    return <span style={{fontFamily: HEAD, color: C.white, ...style}}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
  };

/** Arrow that draws itself from (x1,y1) to (x2,y2) between at and at+dur; optional flowing dots. Use inside <Svg>. */
export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; at?: number; dur?: number; color?: string; width?: number; flow?: boolean}> =
  ({x1, y1, x2, y2, at = 0, dur = 0.6, color = C.white, width = 6, flow}) => {
    const t = useT();
    const p = useProg(at, at + dur);
    const ex = x1 + (x2 - x1) * p, ey = y1 + (y2 - y1) * p;
    const ang = Math.atan2(y2 - y1, x2 - x1), hs = 22;
    return (
      <g>
        <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={width} strokeLinecap="round" />
        {p > 0.98 && <polygon fill={color} points={`${x2},${y2} ${x2 - hs * Math.cos(ang - 0.45)},${y2 - hs * Math.sin(ang - 0.45)} ${x2 - hs * Math.cos(ang + 0.45)},${y2 - hs * Math.sin(ang + 0.45)}`} />}
        {flow && p > 0.98 && [0, 1, 2].map((k) => {
          const u = ((t * 0.8 + k / 3) % 1);
          return <circle key={k} cx={x1 + (x2 - x1) * u} cy={y1 + (y2 - y1) * u} r={7} fill={C.green} />;
        })}
      </g>
    );
  };

/** Path that draws itself (stroke-dash reveal). d = SVG path; length ≈ path length in px. Use inside <Svg>. */
export const DrawPath: React.FC<{d: string; length: number; at?: number; dur?: number; color?: string; width?: number}> = ({d, length, at = 0, dur = 1, color = C.green, width = 6}) => {
  const p = useProg(at, at + dur, false);
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={length} strokeDashoffset={length * (1 - p)} strokeLinecap="round" />;
};

/** Text typed out character by character, with a blinking green cursor. */
export const Typewriter: React.FC<{text: string; at?: number; cps?: number; style?: React.CSSProperties}> = ({text, at = 0, cps = 18, style}) => {
  const t = useT();
  const n = Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
  return (
    <span style={{fontFamily: MONO, color: C.white, ...style}}>
      {text.slice(0, n)}
      <span style={{display: "inline-block", width: "0.55em", height: "1em", marginLeft: 4, verticalAlign: "text-bottom", background: C.green, opacity: Math.floor(t * 2.5) % 2 ? 0 : 1}} />
    </span>
  );
};

/** Array as boxes with indices; highlight cells and show labelled pointers that slide smoothly. */
export const ArrayRow: React.FC<{x: number; y: number; values: (string | number)[]; cell?: number; hl?: Record<number, string>;
  pointers?: {i: number; label: string; color?: string}[]; at?: number; dim?: number[]}> = ({x, y, values, cell = 110, hl = {}, pointers = [], at = 0, dim = []}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{position: "absolute", left: x, top: y}}>
      {values.map((v, i) => {
        const p = spring({frame: f - (at * fps + i * 2), fps, config: {damping: 15}});
        return (
          <div key={i} style={{position: "absolute", left: i * (cell + 10), top: 0, width: cell, height: cell, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            background: hl[i] ?? C.dark, border: `4px solid ${hl[i] ? hl[i] : C.mid}`, opacity: (dim.includes(i) ? 0.35 : 1) * p, scale: String(0.7 + 0.3 * p),
            fontFamily: MONO, fontWeight: 800, fontSize: cell * 0.42, color: hl[i] ? C.bg : C.white}}>
            {v}
            <div style={{position: "absolute", top: cell + 8, fontFamily: MONO, fontSize: 24, color: C.grey}}>{i}</div>
          </div>
        );
      })}
      {pointers.map((ptr, k) => (
        <div key={k} style={{position: "absolute", left: ptr.i * (cell + 10) + cell / 2 - 60, top: -86 - (k % 2) * 0, width: 120, textAlign: "center",
          fontFamily: MONO, fontWeight: 800, fontSize: 28, color: ptr.color ?? C.green, transition: "none"}}>
          {ptr.label}<div style={{fontSize: 34, lineHeight: 1}}>▼</div>
        </div>
      ))}
    </div>
  );
};

/** Python code block: lines revealed one by one from `at` (every `step` s); `active` line highlighted. Light syntax colouring. */
export const CodeBlock: React.FC<{x: number; y: number; code: string; at?: number; step?: number; active?: number; size?: number; w?: number}> =
  ({x, y, code, at = 0, step = 0.5, active = -1, size = 34, w = 1000}) => {
    const t = useT();
    const lines = code.split("\n");
    const kw = /\b(def|return|for|in|if|elif|else|while|not|and|or|None|True|False|class|import|from|range|len|in|break|continue|lambda)\b/g;
    const color = (ln: string) => ln
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/(#.*)$/, `<span style="color:${C.grey}">$1</span>`)
      .replace(kw, `<span style="color:${C.red}">$1</span>`)
      .replace(/\b(\d+)\b/g, `<span style="color:${C.yel}">$1</span>`);
    return (
      <div style={{position: "absolute", left: x, top: y, width: w, padding: 26, borderRadius: 20, background: "#0B0B0B", border: `3px solid ${C.mid}`}}>
        {lines.map((ln, i) => {
          const p = interpolate(t, [at + i * step, at + i * step + 0.25], [0, 1], clamp);
          return (
            <div key={i} style={{fontFamily: MONO, fontWeight: 600, fontSize: size, lineHeight: 1.45, whiteSpace: "pre", color: C.white, opacity: p,
              background: i === active ? "rgba(74,222,128,0.16)" : "transparent", borderLeft: `6px solid ${i === active ? C.green : "transparent"}`, paddingLeft: 12}}
              dangerouslySetInnerHTML={{__html: color(ln) || "&nbsp;"}} />
          );
        })}
      </div>
    );
  };

/** Deterministic pseudo-random 0..1 */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** Animated end card; lines = [{text, size, color}] springing in one by one, plus a blinking cursor on the handle line. */
export const EndCard: React.FC<{lines: {text: string; size: number; color?: string; font?: string}[]; top?: number}> = ({lines, top}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = useSafe();
  let y = top ?? (s.vertical ? 590 : 220);
  return (
    <>
      {lines.map((l, i) => {
        const p = spring({frame: f - 2 - i * 5, fps, config: {damping: 14}});
        const el = (
          <div key={i} style={{position: "absolute", left: s.x0, width: s.w, top: y, textAlign: "center", fontFamily: l.font ?? HEAD, fontWeight: 800, fontSize: l.size,
            color: l.color ?? C.white, opacity: p, translate: `0 ${(1 - p) * 50}px`}}>
            {l.text}
            {l.text.startsWith("@") ? <span style={{display: "inline-block", width: l.size * 0.55, height: l.size * 1.05, marginLeft: 8, verticalAlign: "middle", background: C.green, opacity: Math.floor(f / 12) % 2 ? 0 : 1}} /> : null}
          </div>
        );
        y += l.size * 1.3;
        return el;
      })}
    </>
  );
};

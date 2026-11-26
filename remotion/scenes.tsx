// EXAMPLE scenes file — replace per video. Each scene type maps to a component that receives the scene `s`
// (s.dur seconds, s.phrases word timings, plus any extra props you put in the meta JSON). Headline + captions are drawn by Root.
import React from "react";
import type {Scene} from "./Root";
import {C, Svg, Pill, ConceptCard, Arrow, EndCard, useSafe, useT, usePop, wordAt} from "./ui";

type P = {s: Scene};

const Demo: React.FC<P> = ({s}) => {
  const t = useT();
  const safe = useSafe();
  const pop = usePop(0.4);
  const keyAt = wordAt(s.phrases, "works", 0, s.dur * 0.5); // land a highlight exactly when this word is spoken
  return (
    <>
      <Svg>
        <circle cx={safe.cx} cy={900} r={120 + 10 * Math.sin(t * 3)} fill={C.red} opacity={pop} />
        <Arrow x1={safe.x0 + 40} y1={1150} x2={safe.x1 - 40} y2={1150} at={0.6} flow />
      </Svg>
      <Pill x={safe.x0} y={1200} text="KEY IDEA" bg={C.green} color={C.bg} scale={usePop(keyAt)} />
    </>
  );
};

const Concept: React.FC<P> = () => <ConceptCard x={60} y={700} name="Embeddings" meaning="things placed on a map by meaning" w={870} />;

const End: React.FC<P> = () => (
  <EndCard lines={[
    {text: "THE", size: 120}, {text: "NORMAL", size: 150, color: C.red}, {text: "CODER", size: 120},
    {text: "@thenormalcoder", size: 52, font: "'JetBrains Mono', monospace"},
    {text: "New Byte every other day", size: 50, color: C.grey, font: "Inter, sans-serif"},
  ]} />
);

export const SCENES: Record<string, React.FC<P>> = {demo: Demo, concept: Concept, end: End};

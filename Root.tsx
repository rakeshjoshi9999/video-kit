// Generic composition: reads src/timeline.json (written by align.py) and src/scenes.tsx (written per video).
import React from "react";
import {AbsoluteFill, Composition, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import timeline from "./timeline.json";
import {Backdrop, Chrome, Headline, Captions, Word, clamp} from "./ui";
import {SCENES} from "./scenes";

export type Scene = {type: string; headline?: string; hl?: string[]; headlineSize?: number; start: number; dur: number; phrases: Word[][]; [k: string]: unknown};
type TL = {w: number; h: number; fps: number; total: number; kicker: string; captionY: number; scenes: Scene[]};
const T = timeline as unknown as TL;

const Progress: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return <Chrome progress={f / durationInFrames} kicker={T.kicker} />;
};

const SceneWrap: React.FC<{s: Scene; first: boolean; last: boolean}> = ({s, first, last}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const Body = SCENES[s.type];
  const inO = first ? 1 : interpolate(f, [0, 6], [0, 1], clamp);
  const outO = last ? 1 : interpolate(f, [s.dur * fps - 5, s.dur * fps], [1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity: Math.min(inO, outO)}}>
      {s.headline ? <Headline text={s.headline} hl={s.hl ?? []} size={s.headlineSize} lead={first ? 14 : 0} /> : null}
      {Body ? <Body s={s} /> : null}
      <Captions phrases={s.phrases} y={T.captionY} />
    </AbsoluteFill>
  );
};

const Video: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Backdrop />
      <Progress />
      {T.scenes.map((s, i) => (
        <Sequence key={i} from={Math.round(s.start * fps)} durationInFrames={Math.max(1, Math.round(s.dur * fps))} name={`${i + 1} ${s.type}`}>
          <SceneWrap s={s} first={i === 0} last={i === T.scenes.length - 1} />
        </Sequence>
      ))}
      <Audio src={staticFile("audio.wav")} />
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition id="Byte" component={Video} durationInFrames={Math.round(T.total * T.fps)} fps={T.fps} width={T.w} height={T.h} />
);

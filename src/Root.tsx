// src/Root.jsx
import { Composition } from 'remotion';
import { DetectiveTimeline } from './components/DetectiveTimeline';
import { Intro } from './components/Intro/index.tsx';
import React from 'react';
import './fonts.css';
const RES = {
  r1080p: { width: 1920, height: 1080 },
  r4k: { width: 3840, height: 2160 },
  r720p: { width: 1280, height: 720 },
  shorts: { width: 1296, height: 2250 },
}
const res = RES.r720p; // Change this to the desired resolution
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="DetectiveTimeline"
        component={DetectiveTimeline}
        durationInFrames={30 * 50}
        fps={30}
        width={res.width}
        height={res.height}
      />
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={150}
        fps={30}
        width={res.width}
        height={res.height}
      />
    </>
  );
};

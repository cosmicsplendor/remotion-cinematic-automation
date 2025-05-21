// src/Root.jsx
import './tailwind.css'; 
import { Composition } from 'remotion';
import { DetectiveTimeline } from './components/DetectiveTimeline';
import { Intro } from './components/Intro/index';
import React from 'react';
import './fonts.css';
import boardData from '../data/board';
import { DetectiveBoardPresentation } from './components/DetectiveBoard/index';
import parallaxData from '../data/parallax/frog_boys.json'; // Adjust the path as necessary
import { ParallaxComposition } from './components/ParallaxAnim/index';
import captionData from '../data/captions.json';

const RES = {
  r1080p: { width: 1920, height: 1080 },
  r4k: { width: 3840, height: 2160 },
  r720p: { width: 1280, height: 720 },
  shorts: { width: 1296 * 0.9, height: 2250 * 0.9 },
  shorts_alt: { width: 720, height: 1280 },
  shorts_split: { width: 1140, height: 1140 },
}

import timelineData from '../data/timeline.json';
import CaptionVisualizer from './components/CaptionViz/index';
import { TRANSFER_LIFESPAN, TransferMarket } from './components/TransferMarket';
const transitionDuration = 30;
const holdDuration = 0;
const _res = RES.r1080p
const res = {
  width: Math.floor(_res.width / 2) * 2,
  height: Math.floor(_res.height / 2) * 2
};

const FPS = 20
export const DetectiveTimelineVideo = () => {
  const totalDurationInFrames = timelineData.events.length * 0.5 * FPS + timelineData.events.reduce(
    (acc, event) => acc + Math.ceil((event.audioDuration || 3) * FPS),
    0
  );
  return <Composition
    id="DetectiveTimeline"
    component={DetectiveTimeline}
    durationInFrames={160}
    fps={FPS}
    width={res.width}
    height={res.height}
  />
};
export const ParallaxVideo = () => {
  const validatedLayers = parallaxData.layers.map(layer => ({
    id: layer.id,
    name: layer.name,
    parallaxFactor: {
      x: layer.parallaxFactor.x,
      y: layer.parallaxFactor.y
    },
    zIndex: layer.zIndex,
    elements: layer.elements.map(element => ({
      id: element.id,
      width: element.width,
      height: element.height,
      name: element.name,
      x: element.x,
      y: element.y,
      zIndex: element.zIndex,
      svgString: element.svgString,
      scale: element.scale,
      opacity: element.opacity,
      initialRotation: element.initialRotation,
      finalRotation: element.finalRotation,
      transformOriginX: element.transformOriginX,
      transformOriginY: element.transformOriginY,
      rotationAnimationType: element.rotationAnimationType === 'spring'
        ? 'spring' as const
        : 'easing' as const
    })),
    isVisible: layer.isVisible
  }));

  return (
    <>
      <Composition
        id="ParallaxScene"
        component={ParallaxComposition}
        durationInFrames={parallaxData.durationInFrames}
        fps={FPS}
        width={res.width}  // Use parallaxData width or fallback to res.width
        height={res.height}
        defaultProps={{
          durationInFrames: parallaxData.durationInFrames,
          compositionName: parallaxData.compositionName,
          camera: parallaxData.camera,
          backgroundColor: parallaxData.backgroundColor,
          layers: validatedLayers,
          reverse: false
        }}
      />
    </>
  );
};
export const RemotionRoot = () => {
  return (
    <>
      <ParallaxVideo />
      <DetectiveTimelineVideo />
      <Composition
        id="TransferMarket"
        component={TransferMarket as React.FC<any>}
        durationInFrames={FPS * TRANSFER_LIFESPAN}
        fps={FPS}
        width={res.width} 
        height={res.height}
        defaultProps={{
        }}
      />
      <Composition
        id="CaptionViz"
        component={CaptionVisualizer as React.FC<any>}
        durationInFrames={FPS * 3.7}
        fps={FPS}
        width={res.width}  // Use parallaxData width or fallback to res.width
        height={res.height}
        defaultProps={{
          data: captionData,
          videoUrl: "assets/videos/cap.mp4",
          yPosition: 0.5,
          mode: "single",
          fontSize: 60
        }}
      />
      <Composition
        id="DetectiveBoard"
        component={DetectiveBoardPresentation}
        durationInFrames={
          boardData.reduce((acc, person) =>
            // For each person: audio duration + 2 transitions + hold
            acc + (person.audioDuration * FPS) + (2 * transitionDuration) + holdDuration,
            0
          )}
        fps={FPS}
        width={res.width}
        height={res.height}
        defaultProps={{
          holdDuration,
          transitionDuration
        }}
      />

      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={150}
        fps={FPS}
        width={res.width}
        height={res.height}
      />
    </>
  );
};

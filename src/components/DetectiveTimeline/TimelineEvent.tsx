import React, { useState, useMemo } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  staticFile,
} from 'remotion';

import { segmentDevanagariText } from '../../utils'; // Adjust path as needed
import config from "../../../data/timeline.config.json";
import KeyframeAudioProcessor from './KeyframeAudioProcessor'; // Assuming it's in the same directory

const { SCROLL_DURATION } = config;

// Extended Keyframe type with kenBurns property
type Keyframe = {
  duration: number;
  media: string;
  audio: string;
  kenBurns?: string; // Format: "effect-type;duration;easing" 
                    // Examples: "static", "zoom-in;2s;ease-in-out", "pan-left;3s;ease"
};

// Parse ken burns effect string
function parseKenBurnsEffect(effectStr?: string) {
  if (!effectStr || effectStr === "static") {
    return { type: "static", duration: 0, easing: "linear" };
  }
  
  const parts = effectStr.split(';');
  return {
    type: parts[0] || "static",
    duration: parts[1] ? parseFloat(parts[1]) : 2,  // default 2s
    easing: parts[2] || "ease-out"
  };
}

// Calculate transform values for effect
function getKenBurnsTransforms(effectType: string, progress: number) {
  // Constrain progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));
  
  switch(effectType) {
    case "static":
      return { scale: 1, x: 0, y: 0 };
    case "zoom-in":
      return { scale: 1 + (0.5 * p), x: 0, y: 0 };
    case "zoom-out":
      return { scale: 1.5 - (0.5 * p), x: 0, y: 0 };
    case "pan-left":
      return { scale: 1.1, x: 20 - (40 * p), y: 0 };
    case "pan-right":
      return { scale: 1.1, x: -20 + (40 * p), y: 0 };
    case "pan-up":
      return { scale: 1.1, x: 0, y: 20 - (40 * p) };
    case "pan-down":
      return { scale: 1.1, x: 0, y: -20 + (40 * p) };
    case "zoom-in-pan-left":
      return { scale: 1 + (0.3 * p), x: 15 - (30 * p), y: 0 };
    case "zoom-in-pan-right":
      return { scale: 1 + (0.3 * p), x: -15 + (30 * p), y: 0 };
    case "zoom-out-hold-left":
      return { scale: 1.5 - (0.5 * p), x: -15, y: 0 };
    case "zoom-out-hold-right":
      return { scale: 1.5 - (0.5 * p), x: 15, y: 0 };
    default:
      return { scale: 1, x: 0, y: 0 };
  }
}

// Updated TimelineEventData type
export type TimelineEventData = {
  date: string;
  title: string;
  description: string;
  evidence: string;
  audioDuration: number; // Total duration in seconds for all keyframes
  keyframes?: Keyframe[];
  id?: string;
};

type TimelineEventProps = {
  event: TimelineEventData & { calculatedStartFrame: number; isLeft?: boolean };
  index: number;
  isActive: boolean;
  initialOffset: number;
  eventSpacing: number;
};

export const OFFSET = 400;
export const CARD_SIZE = 400;

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  event,
  index,
  isActive,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { calculatedStartFrame, isLeft = false, keyframes, title: eventTitle, date, description, evidence } = event;

  const timeIntoEventAudioPhaseFrames = frame - (calculatedStartFrame + SCROLL_DURATION);

  // Get the first keyframe for immediate display when event becomes active
  const firstKeyframe = useMemo(() => {
    if (!keyframes || keyframes.length === 0) return null;
    return keyframes[0];
  }, [keyframes]);

  const currentKeyframeInfo = useMemo(() => {
    if (!keyframes || keyframes.length === 0 || timeIntoEventAudioPhaseFrames < 0) {
      return { 
        keyframe: null, 
        kfIndex: -1, 
        audioPath: undefined,
        progressInKeyframe: 0,
        keyframeStartFrame: 0,
        keyframeDurationFrames: 0
      };
    }

    let cumulativeDurationFrames = 0;
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const kfDurationFrames = Math.round(kf.duration * fps);
      
      if (timeIntoEventAudioPhaseFrames >= cumulativeDurationFrames && 
          timeIntoEventAudioPhaseFrames < cumulativeDurationFrames + kfDurationFrames) {
        
        // Calculate progress within this keyframe (0 to 1)
        const keyframeStartFrame = calculatedStartFrame + SCROLL_DURATION + cumulativeDurationFrames;
        const progressInKeyframe = (frame - keyframeStartFrame) / kfDurationFrames;
        
        const audioPath = kf.audio && kf.audio.trim() !== "" 
          ? staticFile(`assets/timeline/audio/${kf.audio}`) 
          : undefined;
          
        return { 
          keyframe: kf, 
          kfIndex: i, 
          audioPath,
          progressInKeyframe, 
          keyframeStartFrame,
          keyframeDurationFrames: kfDurationFrames
        };
      }
      cumulativeDurationFrames += kfDurationFrames;
    }
    return { 
      keyframe: null, 
      kfIndex: -1, 
      audioPath: undefined,
      progressInKeyframe: 0,
      keyframeStartFrame: 0,
      keyframeDurationFrames: 0
    };
  }, [keyframes, frame, calculatedStartFrame, SCROLL_DURATION, fps]);

  const activeKeyframe = currentKeyframeInfo.keyframe;
  const activeKeyframeIndex = currentKeyframeInfo.kfIndex;
  const activeKeyframeAudioPath = currentKeyframeInfo.audioPath;
  const progressInKeyframe = currentKeyframeInfo.progressInKeyframe;

  // Determine which keyframe's media to display
  const displayKeyframe = useMemo(() => {
    // During scroll transition, display the first keyframe for active event
    if (isActive && frame >= calculatedStartFrame && frame < calculatedStartFrame + SCROLL_DURATION) {
      return firstKeyframe;
    }
    // After scroll transition, display the active keyframe if we're in audio phase
    if (isActive && frame >= calculatedStartFrame + SCROLL_DURATION) {
      return activeKeyframe || firstKeyframe; // Fall back to first keyframe if no active one
    }
    // Default - not active or before start
    return null;
  }, [isActive, frame, calculatedStartFrame, SCROLL_DURATION, activeKeyframe, firstKeyframe]);

  // Calculate Ken Burns effect for current keyframe
  const kenBurnsStyle = useMemo(() => {
    if (!displayKeyframe) return {};
    
    // Parse ken burns effect
    const kenBurnsEffect = parseKenBurnsEffect(displayKeyframe.kenBurns);
    
    // Calculate progress for the effect
    let effectProgress;
    
    // If we're in the scroll phase, animate from 0 to 0.3 during scroll
    if (frame < calculatedStartFrame + SCROLL_DURATION) {
      const scrollProgress = (frame - calculatedStartFrame) / SCROLL_DURATION;
      effectProgress = Math.min(0.3, scrollProgress);
    } 
    // If we're in the active keyframe phase, use actual progress
    else if (activeKeyframe === displayKeyframe) {
      effectProgress = progressInKeyframe;
    } 
    // If we're showing first keyframe while waiting for active keyframe, use fixed value
    else {
      effectProgress = 0.3; // Some static intermediate value
    }
    
    // Get transforms based on effect type and progress
    const { scale, x, y } = getKenBurnsTransforms(kenBurnsEffect.type, effectProgress);
    
    return {
      transform: `scale(${scale}) translate(${x}%, ${y}%)`,
      transition: 'transform 50ms ease-out', // Smooth any frame jumps
    };
  }, [displayKeyframe, frame, calculatedStartFrame, SCROLL_DURATION, activeKeyframe, progressInKeyframe]);

  const [glowOpacity, setGlowOpacity] = useState(0);

  // Props for KeyframeAudioProcessor
  const frameInActiveKeyframeAudio = useMemo(() => {
    if (!activeKeyframe || activeKeyframeIndex === -1 || !keyframes) return -1;
    let keyframeStartOffsetFrames = 0;
    for (let i = 0; i < activeKeyframeIndex; i++) {
      if (keyframes[i]) {
        keyframeStartOffsetFrames += Math.round(keyframes[i].duration * fps);
      }
    }
    return timeIntoEventAudioPhaseFrames - keyframeStartOffsetFrames;
  }, [activeKeyframe, activeKeyframeIndex, keyframes, timeIntoEventAudioPhaseFrames, fps]);

  const activeKeyframeDurationFrames = useMemo(() => {
    if (!activeKeyframe) return -1;
    return Math.round(activeKeyframe.duration * fps);
  }, [activeKeyframe, fps]);

  // --- Animations ---
  const animationStartFrame = frame - calculatedStartFrame; // Base for animations relative to event card appearance

  const dotScale = spring({
    frame: animationStartFrame,
    fps,
    config: { damping: 12, mass: 0.3, stiffness: 200 },
  });

  const cardOpacity = interpolate(animationStartFrame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.sin,
  });

  const cardTranslate = interpolate(animationStartFrame, [0, 8], [isLeft ? -50 : 50, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.ease),
  });

  const titleSegments = useMemo(() => segmentDevanagariText(eventTitle || ''), [eventTitle]);
  const titleCharacters = Math.floor(
    interpolate(animationStartFrame, [5, 12], [0, titleSegments.length], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    })
  );

  const descriptionOpacity = interpolate(animationStartFrame, [8, 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const evidenceOpacity = interpolate(animationStartFrame, [10, 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const dotSize = isActive ? 30 : 24;
  const dotColor = isActive ? '#ff5252' : '#c0392b';
  const baseShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
  const activeGlowShadow = `0 0 3px 6px rgba(250, 100, 50, ${glowOpacity})`;
  const boxShadow = isActive ? `${activeGlowShadow}, ${baseShadow}` : baseShadow;

  // Conditional rendering for the whole event card
  if (frame < calculatedStartFrame - fps * 2 && !isActive) { // Don't render if way too early and not active
    return null;
  }

  return (
    <>
      {typeof activeKeyframeAudioPath === 'string' && isActive && activeKeyframe && (
        <KeyframeAudioProcessor
          audioPath={activeKeyframeAudioPath}
          isActive={isActive}
          fps={fps}
          frameInActiveKeyframeAudio={frameInActiveKeyframeAudio}
          activeKeyframeDurationFrames={activeKeyframeDurationFrames}
          onGlowCalculated={setGlowOpacity}
        />
      )}

      <div
        style={{
          position: 'absolute', top: 0, left: '50%',
          width: dotSize, height: dotSize, borderRadius: '50%',
          backgroundColor: dotColor,
          transform: `translate(-50%, -50%) scale(${dotScale})`,
          zIndex: 10,
          transition: 'box-shadow 0.3s ease',
        }}
      />
      <div
        style={{
          position: 'absolute', top: 0,
          [isLeft ? 'right' : 'left']: '50%',
          [isLeft ? 'marginRight' : 'marginLeft']: 40,
          width: 800,
          opacity: cardOpacity,
          transform: `translateX(${isLeft ? -cardTranslate : cardTranslate}px) translateY(-50%)`,
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          padding: 20, borderRadius: 8,
          borderLeft: isLeft ? 'none' : isActive ? '4px solid #ff5252' : '4px solid #c0392b',
          borderRight: isLeft ? isActive ? '4px solid #ff5252' : '4px solid #c0392b' : 'none',
          transition: 'box-shadow 0.2s ease-out, border-color 0.2s ease-out',
        }}
      >
        <div style={{ fontFamily: 'Roboto Mono, monospace', color: '#aaa', fontSize: 24, marginBottom: 8 }}>
          {date}
        </div>
        <h3 style={{ fontFamily: 'Special Elite, cursive', fontSize: 36, margin: '0 0 16px 0', color: isActive ? '#ff5252' : 'white' }}>
          {titleSegments.slice(0, titleCharacters).join("")}
          {titleCharacters < titleSegments.length && <span style={{ opacity: animationStartFrame % 20 < 10 ? 1 : 0 }}>|</span>}
        </h3>
        
        {/* Display media with Ken Burns effect */}
        {displayKeyframe && (
          <div style={{
            margin: '16px auto',
            overflow: 'hidden', // This is crucial for clipping the image
            borderRadius: 16,
            backgroundColor: '#222',
            boxShadow: boxShadow,
            width: '100%', 
            height: 400,
            position: 'relative', // Container for absolutely positioned image
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${staticFile(`assets/timeline/media/${displayKeyframe.media}`)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transformOrigin: 'center center',
              ...kenBurnsStyle,
            }} />
          </div>
        )}
        
        {evidence && (
          <div style={{ fontSize: 18, color: isActive ? '#ff5252' : '#c0392b', fontWeight: 'bold', opacity: evidenceOpacity }}>
            EVIDENCE: {evidence}
          </div>
        )}
      </div>
    </>
  );
};
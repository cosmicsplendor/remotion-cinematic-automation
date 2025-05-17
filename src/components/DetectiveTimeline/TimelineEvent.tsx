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

// Define Keyframe type
type Keyframe = {
  duration: number; // in seconds
  media: string;    // image path, relative to public/assets/timeline/timeline/
  audio: string;    // audio path, relative to public/assets/timeline/timeline/
};

// Updated TimelineEventData type
export type TimelineEventData = {
  date: string;
  title: string;
  description: string;
  evidence: string;
  audioDuration: number; // Total duration in seconds for all keyframes
  keyframes?: Keyframe[];
  id?: string;
  // calculatedStartFrame will be part of the event object passed as a prop
};

type TimelineEventProps = {
  event: TimelineEventData & { calculatedStartFrame: number; isLeft?: boolean }; // isLeft also comes from parent now
  index: number; // Still useful for unique keys or simple conditional logic if needed elsewhere
  isActive: boolean;
  // These might not be directly used if all layout is parent-driven, but kept for prop completeness
  initialOffset: number;
  eventSpacing: number;
};

export const OFFSET = 400; // Export if used by parent
export const CARD_SIZE = 400; // Export if used by parent

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  event,
  index,
  isActive,
  // initialOffset, eventSpacing // Not directly used in this component's rendering logic anymore
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
    const logPrefix = `[Event: ${eventTitle || event.id || `idx ${index}`}, Frame: ${frame}, EventStartFrame: ${calculatedStartFrame}, TimeIntoAudio: ${timeIntoEventAudioPhaseFrames.toFixed(2)}]`;

    if (!keyframes || keyframes.length === 0 || timeIntoEventAudioPhaseFrames < 0) {
      return { keyframe: null, kfIndex: -1, audioPath: undefined };
    }

    let cumulativeDurationFrames = 0;
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const kfDurationFrames = Math.round(kf.duration * fps);
      if (timeIntoEventAudioPhaseFrames >= cumulativeDurationFrames && timeIntoEventAudioPhaseFrames < cumulativeDurationFrames + kfDurationFrames) {
        if (kf.audio && kf.audio.trim() !== "") {
          return { keyframe: kf, kfIndex: i, audioPath: staticFile(`assets/timeline/audio/${kf.audio}`) };
        }
        return { keyframe: kf, kfIndex: i, audioPath: undefined }; // Keyframe found, but no audio string
      }
      cumulativeDurationFrames += kfDurationFrames;
    }
    return { keyframe: null, kfIndex: -1, audioPath: undefined }; // No keyframe matched
  }, [keyframes, frame, calculatedStartFrame, SCROLL_DURATION, fps, eventTitle, event.id, index]);

  const activeKeyframe = currentKeyframeInfo.keyframe;
  const activeKeyframeIndex = currentKeyframeInfo.kfIndex;
  const activeKeyframeAudioPath = currentKeyframeInfo.audioPath; // This is string | undefined

  // Determine which keyframe's media to display:
  // 1. If we're during scroll animation AND this event is active, show the first keyframe
  // 2. If we're after scroll and in audio phase, show the current active keyframe
  // 3. Otherwise, show the first keyframe if we're active (for initial display)
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
          transition: 'box-shadow 0.3s ease', // CSS transition for dot shadow
        }}
      />
      <div
        style={{
          position: 'absolute', top: 0,
          [isLeft ? 'right' : 'left']: '50%',
          [isLeft ? 'marginRight' : 'marginLeft']: 40,
          width: 800, // Consider making this configurable
          opacity: cardOpacity,
          transform: `translateX(${isLeft ? -cardTranslate : cardTranslate}px) translateY(-50%)`,
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          padding: 20, borderRadius: 8,
          borderLeft: isLeft ? 'none' : isActive ? '4px solid #ff5252' : '4px solid #c0392b',
          borderRight: isLeft ? isActive ? '4px solid #ff5252' : '4px solid #c0392b' : 'none',
          transition: 'box-shadow 0.2s ease-out, border-color 0.2s ease-out', // CSS transition for card shadow
        }}
      >
          <div style={{ fontFamily: 'Roboto Mono, monospace', color: '#aaa', fontSize: 24, marginBottom: 8 }}>
            {date}
          </div>
           <h3 style={{ fontFamily: 'Special Elite, cursive', fontSize: 36, margin: '0 0 16px 0', color: isActive ? '#ff5252' : 'white' }}>
            {titleSegments.slice(0, titleCharacters).join("")}
            {titleCharacters < titleSegments.length && <span style={{ opacity: animationStartFrame % 20 < 10 ? 1 : 0 }}>|</span>}
          </h3>
        {/* Display media if we have a keyframe to show */}
        {(displayKeyframe) && (
          <div style={{
            margin: '16px auto',
            overflow: 'hidden', borderRadius: 16,
            backgroundColor: '#222', // Fallback bg
            boxShadow: boxShadow,
            width: '100%', height: 400, // Adjust height as needed
            background: "url(" + staticFile(`assets/timeline/media/${displayKeyframe.media}`) + ")",
            backgroundSize: 'cover', // Cover the entire div
            backgroundRepeat: 'no-repeat',
          }}>
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
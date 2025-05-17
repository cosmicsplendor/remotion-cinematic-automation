import React, { useState, useMemo } from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  staticFile,
} from 'remotion';
// Assuming visualizeAudio, AudioData are not directly needed here anymore if all logic is in KeyframeAudioProcessor
// import { visualizeAudio, AudioData } from '@remotion/media-utils';

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

  const currentKeyframeInfo = useMemo(() => {
    const logPrefix = `[Event: ${eventTitle || event.id || `idx ${index}`}, Frame: ${frame}, EventStartFrame: ${calculatedStartFrame}, TimeIntoAudio: ${timeIntoEventAudioPhaseFrames.toFixed(2)}]`;
    // const shouldLogDetailed = index === 1; // For targeted debugging
    // if (shouldLogDetailed) console.log(`${logPrefix} ENTER currentKeyframeInfo`);

    if (!keyframes || keyframes.length === 0 || timeIntoEventAudioPhaseFrames < 0) {
      // if (shouldLogDetailed && timeIntoEventAudioPhaseFrames < 0) console.log(`${logPrefix} TimeIntoAudio negative or no keyframes. Result: No active keyframe.`);
      return { keyframe: null, kfIndex: -1, audioPath: undefined };
    }

    let cumulativeDurationFrames = 0;
    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      const kfDurationFrames = Math.round(kf.duration * fps);
      if (timeIntoEventAudioPhaseFrames >= cumulativeDurationFrames && timeIntoEventAudioPhaseFrames < cumulativeDurationFrames + kfDurationFrames) {
        if (kf.audio && kf.audio.trim() !== "") {
          // if (shouldLogDetailed) console.log(`${logPrefix} Found active KF ${i} with audio: ${kf.audio}`);
          // IMPORTANT: Ensure this path matches where your audio files are for keyframes
          return { keyframe: kf, kfIndex: i, audioPath: staticFile(`assets/timeline/audio/${kf.audio}`) };
        }
        // if (shouldLogDetailed) console.log(`${logPrefix} Found active KF ${i} but no audio string.`);
        return { keyframe: kf, kfIndex: i, audioPath: undefined }; // Keyframe found, but no audio string
      }
      cumulativeDurationFrames += kfDurationFrames;
    }
    // if (shouldLogDetailed) console.log(`${logPrefix} No KF matched by time. Total KF duration: ${cumulativeDurationFrames}f`);
    return { keyframe: null, kfIndex: -1, audioPath: undefined }; // No keyframe matched
  }, [keyframes, frame, calculatedStartFrame, SCROLL_DURATION, fps, eventTitle, event.id, index]);

  const activeKeyframe = currentKeyframeInfo.keyframe;
  const activeKeyframeIndex = currentKeyframeInfo.kfIndex;
  const activeKeyframeAudioPath = currentKeyframeInfo.audioPath; // This is string | undefined

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
  const activeGlowShadow = `0 0 5px 6px rgba(255, 100, 50, ${glowOpacity})`;
  const boxShadow = isActive ? `${activeGlowShadow}, ${baseShadow}` : baseShadow;

  // Conditional rendering for the whole event card (optional, parent might do this)
  // This simple check prevents rendering if way before its start frame.
  // Animations above handle the fade-in.
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
          boxShadow: isActive ? '0 0 15px rgba(255, 82, 82, 0.8)' : 'none',
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
          boxShadow: boxShadow, // This now uses the glowOpacity from state
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

       

        <div style={{ fontSize: evidence ? 26 : 28, lineHeight: 1.5, marginBottom: 12, opacity: descriptionOpacity }}>
          {description}
        </div>
         {activeKeyframe && activeKeyframe.media && (
          <div style={{
            margin: '16px auto',
            overflow: 'hidden', borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
            backgroundColor: '#222', // Fallback bg
          }}>
            <img
              src={staticFile(`assets/timeline/media/${activeKeyframe.media}`)} // Ensure this path is correct
              alt={eventTitle || `Image for ${date}`}
              style={{
                width: '100%', objectFit: 'contain',
              }}
            />
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
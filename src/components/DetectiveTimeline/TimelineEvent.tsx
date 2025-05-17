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

// Enhanced Keyframe type with updated kenBurns property comment
type Keyframe = {
  duration: number;
  media: string;
  audio: string;
  kenBurns?: string; // Format: "effect-type;duration(e.g. 2s);easing;speed(0-1)" 
                    // Examples: "static", "zoom-in;2s;ease-in-out;0.7", "pan-left;3s;ease;0.3"
};

// --- NEW/MODIFIED KEN BURNS LOGIC START ---

// Enhanced Ken Burns effect type
type KenBurnsEffect = {
  type: string;
  duration: number;  // in seconds
  easing: string;
  speed: number;     // normalized 0-1 value for effect intensity
};

// Parse ken burns effect string with new speed parameter
function parseKenBurnsEffect(effectStr?: string): KenBurnsEffect {
  if (!effectStr || effectStr === "static") {
    return { type: "static", duration: 0, easing: "linear", speed: 0.5 };
  }
  
  const parts = effectStr.split(';');
  return {
    type: parts[0] || "static",
    duration: parts[1] ? parseFloat(parts[1].replace('s', '')) : 2,  // Convert "2s" to 2
    easing: parts[2] || "ease-out",
    speed: parts[3] ? parseFloat(parts[3]) : 0.5  // Default speed 0.5 (medium)
  };
}

// Map easing name to function
function getEasingFunction(easingName: string) {
  switch (easingName.toLowerCase()) {
    case 'linear': return (t: number) => t;
    case 'ease': return Easing.bezier(0.25, 0.1, 0.25, 1);
    case 'ease-in': return Easing.in(Easing.ease);
    case 'ease-out': return Easing.out(Easing.ease);
    case 'ease-in-out': return Easing.inOut(Easing.ease);
    default: return Easing.out(Easing.ease); // Default to ease-out
  }
}

// Calculate transform values for effect with improved calculations to avoid dead space
function getKenBurnsTransforms(
  effectType: string, 
  progress: number, 
  speed: number, 
  imageAspectRatio: number = 16/9, // Default to standard video aspect
  containerAspectRatio: number = 16/9 // Default to matching container
) {
  // Normalize speed between 0.2 (subtle) and 1.5 (dramatic)
  const normalizedSpeed = 0.2 + (speed * 1.3);
  
  // Constrain progress between 0 and 1
  const p = Math.max(0, Math.min(1, progress));
  
  // Calculate safe zoom boundaries based on aspect ratios to prevent dead space
  // const maxZoomOut = Math.max(1, containerAspectRatio / imageAspectRatio); // Not directly used in current cases, but good for future
  const maxPanX = (normalizedSpeed * 25) * (imageAspectRatio > containerAspectRatio ? imageAspectRatio / containerAspectRatio : 1);
  const maxPanY = (normalizedSpeed * 25) * (imageAspectRatio < containerAspectRatio ? containerAspectRatio / imageAspectRatio: 1);

  // Base scale to ensure image covers container, especially if aspect ratios differ
  let baseScale = 1;
  if (imageAspectRatio > containerAspectRatio) { // Image is wider than container
    baseScale = imageAspectRatio / containerAspectRatio;
  } else if (imageAspectRatio < containerAspectRatio) { // Image is taller than container
     baseScale = containerAspectRatio / imageAspectRatio;
  }
  // A general slight overscale to help with pan edges, adjusted by effect
  const panEffectBaseScale = baseScale * (1 + (normalizedSpeed * 0.05));


  switch(effectType) {
    case "static":
      return { scale: baseScale, x: 0, y: 0 };
    
    case "zoom-in":
      const zoomInScale = baseScale * (1 + (normalizedSpeed * p));
      return { scale: zoomInScale, x: 0, y: 0 };
    
    case "zoom-out":
      const initialZoom = baseScale * (1 + normalizedSpeed);
      const zoomOutScale = initialZoom - (baseScale * normalizedSpeed * p);
      return { scale: Math.max(baseScale, zoomOutScale), x: 0, y: 0 };
    
    case "pan-left":
      return { 
        scale: panEffectBaseScale,
        x: (maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)), 
        y: 0 
      };
    
    case "pan-right":
      return { 
        scale: panEffectBaseScale,
        x: -(maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)),
        y: 0 
      };
    
    case "pan-up":
      return { 
        scale: panEffectBaseScale,
        x: 0, 
        y: (maxPanY * (1-p) * (imageAspectRatio / containerAspectRatio))
      };
    
    case "pan-down":
      return { 
        scale: panEffectBaseScale,
        x: 0, 
        y: -(maxPanY * (1-p) * (imageAspectRatio / containerAspectRatio))
      };
    
    case "zoom-in-pan-left":
      const zipScale = baseScale * (1 + (normalizedSpeed * 0.5 * p));
      return { 
        scale: zipScale, 
        x: (maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)) / (1 + (normalizedSpeed * 0.5 * p)), 
        y: 0 
      };
    
    case "zoom-in-pan-right":
      const ziprScale = baseScale * (1 + (normalizedSpeed * 0.5 * p));
      return { 
        scale: ziprScale, 
        x: -(maxPanX * (1-p) * (containerAspectRatio / imageAspectRatio)) / (1 + (normalizedSpeed * 0.5 * p)),
        y: 0 
      };
    
    case "zoom-out-hold-left":
      const zoomOutHoldScale = baseScale * (1 + normalizedSpeed) - (baseScale * normalizedSpeed * p);
      return { 
        scale: Math.max(baseScale, zoomOutHoldScale), 
        x: -(maxPanX * 0.2 * (containerAspectRatio / imageAspectRatio)), 
        y: 0 
      };
    
    case "zoom-out-hold-right":
      const zoomOutHoldRightScale = baseScale * (1 + normalizedSpeed) - (baseScale * normalizedSpeed * p);
      return { 
        scale: Math.max(baseScale, zoomOutHoldRightScale), 
        x: (maxPanX * 0.2 * (containerAspectRatio / imageAspectRatio)), 
        y: 0 
      };
    
    default:
      return { scale: baseScale, x: 0, y: 0 };
  }
}

// Duration manager for your Timeline keyframes
function calculateEffectProgress(
  frame: number,
  keyframeStartFrame: number,
  fps: number,
  durationInSeconds: number,
  easingName: string
): number {
  // Convert duration to frames
  const durationInFrames = Math.max(1, Math.round(durationInSeconds * fps));
  
  // Calculate raw progress (0 to 1)
  const rawProgress = Math.min(1, Math.max(0, (frame - keyframeStartFrame) / durationInFrames));
  
  // Apply easing
  const easingFn = getEasingFunction(easingName);
  return easingFn(rawProgress);
}

// --- NEW/MODIFIED KEN BURNS LOGIC END ---


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
  // initialOffset: number; // These were in your old code, but not used in the snippet or visible logic. Retaining in case.
  // eventSpacing: number;  // Retaining in case.
};

export const OFFSET = 400; // Retaining from your old code
export const CARD_SIZE = 400; // Retaining from your old code

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  event,
  index,
  isActive,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig(); // Get width and height for containerAspectRatio
  const containerAspectRatio = videoWidth / videoHeight;

  const { calculatedStartFrame, isLeft = false, keyframes, title: eventTitle, date, description, evidence } = event;

  const timeIntoEventAudioPhaseFrames = frame - (calculatedStartFrame + SCROLL_DURATION);

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
        progressInKeyframe: 0, // This is raw progress, not eased.
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
        
        const keyframeStartFrame = calculatedStartFrame + SCROLL_DURATION + cumulativeDurationFrames;
        // Raw progress for this specific keyframe
        const progressInKeyframe = Math.max(0, Math.min(1, (frame - keyframeStartFrame) / kfDurationFrames));
        
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
    // If past all keyframes, effectively hold the last frame's state or reset
    // For now, let's assume it means no active keyframe
    return { 
      keyframe: null, 
      kfIndex: -1, 
      audioPath: undefined,
      progressInKeyframe: 0, 
      keyframeStartFrame: 0,
      keyframeDurationFrames: 0
    };
  }, [keyframes, frame, calculatedStartFrame, SCROLL_DURATION, fps, timeIntoEventAudioPhaseFrames]);


  const activeKeyframe = currentKeyframeInfo.keyframe;
  const activeKeyframeIndex = currentKeyframeInfo.kfIndex;
  const activeKeyframeAudioPath = currentKeyframeInfo.audioPath;
  // progressInKeyframe from currentKeyframeInfo is the raw linear progress.
  // The new Ken Burns logic will calculate its own eased progress.

  const displayKeyframe = useMemo(() => {
    if (isActive && frame >= calculatedStartFrame && frame < calculatedStartFrame + SCROLL_DURATION) {
      return firstKeyframe;
    }
    if (isActive && frame >= calculatedStartFrame + SCROLL_DURATION) {
      return activeKeyframe || firstKeyframe; 
    }
    return null;
  }, [isActive, frame, calculatedStartFrame, SCROLL_DURATION, activeKeyframe, firstKeyframe]);

  // Enhanced Ken Burns effect calculation
  const kenBurnsStyle = useMemo(() => {
    if (!displayKeyframe) return {};
    
    // TODO: Implement dynamic image aspect ratio loading if possible
    // For this example, we'll assume a standard 16:9 or allow it to be passed/configured
    const imageAspectRatio = 16/9; // Placeholder: This should ideally be the actual aspect ratio of the image
                                    // You might need a way to get image dimensions, e.g., after it loads, or store them with keyframe data.
    
    const kenBurnsEffect = parseKenBurnsEffect(displayKeyframe.kenBurns);
    
    let effectProgress;
    
    if (frame < calculatedStartFrame + SCROLL_DURATION) {
      const scrollProgress = (frame - calculatedStartFrame) / SCROLL_DURATION;
      const easedScrollProgress = Easing.bezier(0.4, 0, 0.2, 1)(scrollProgress);
      effectProgress = Math.min(0.1, easedScrollProgress); // Smoothly transition to initial effect state
    } 
    else if (activeKeyframe === displayKeyframe && currentKeyframeInfo.keyframeStartFrame > 0) { // Ensure we have a valid start frame for active KF
      const keyframeDuration = kenBurnsEffect.duration > 0 
        ? kenBurnsEffect.duration 
        : (activeKeyframe.duration || 2); 
      
      effectProgress = calculateEffectProgress(
        frame,
        currentKeyframeInfo.keyframeStartFrame,
        fps,
        keyframeDuration,
        kenBurnsEffect.easing
      );
    } 
    else { // Default state: e.g. showing first keyframe while waiting for next, or after all KFs
      // If it's the first keyframe being held before its 'active' phase or after its effect is done.
      // Or if no specific active keyframe matches but displayKeyframe is set (e.g. firstKeyframe fallback)
      // We want the effect to be at its "end" state if it has run, or "start" if it's a static intro.
      // The new parseKenBurnsEffect defaults to 0 duration for static, meaning progress will be 0 or 1 quickly.
      // If a duration is set for the Ken Burns effect itself, it should complete.
      // If using firstKeyframe as fallback and it had an effect, it should be at its end state.
      effectProgress = 1; // Hold the final state of the effect
    }
    
    const { scale, x, y } = getKenBurnsTransforms(
      kenBurnsEffect.type, 
      effectProgress, 
      kenBurnsEffect.speed,
      imageAspectRatio,
      containerAspectRatio
    );
    
    return {
      transform: `scale(${scale}) translate(${x}%, ${y}%)`,
      transition: 'transform 16ms linear', // Smoother frame-to-frame for driven animations
    };
  }, [displayKeyframe, frame, calculatedStartFrame, SCROLL_DURATION, activeKeyframe, currentKeyframeInfo, fps, containerAspectRatio]);

  const [glowOpacity, setGlowOpacity] = useState(0);

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

  const animationStartFrame = frame - calculatedStartFrame; 

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
  const boxShadow = isActive ? `${activeGlowShadow}, ${baseShadow}` : baseShadow; // Using existing boxShadow logic

  if (frame < calculatedStartFrame - fps * 2 && !isActive) { 
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
          transition: 'box-shadow 0.3s ease', // Retaining existing transition
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
          transition: 'box-shadow 0.2s ease-out, border-color 0.2s ease-out', // Retaining existing transition
        }}
      >
        <div style={{ fontFamily: 'Roboto Mono, monospace', color: '#aaa', fontSize: 24, marginBottom: 8 }}>
          {date}
        </div>
        <h3 style={{ fontFamily: 'Special Elite, cursive', fontSize: 36, margin: '0 0 16px 0', color: isActive ? '#ff5252' : 'white' }}>
          {titleSegments.slice(0, titleCharacters).join("")}
          {titleCharacters < titleSegments.length && <span style={{ opacity: animationStartFrame % 20 < 10 ? 1 : 0 }}>|</span>}
        </h3>
        
        {displayKeyframe && (
          <div style={{
            margin: '16px auto',
            overflow: 'hidden', 
            borderRadius: 16,
            backgroundColor: '#222',
            boxShadow: boxShadow, // Using your existing boxShadow variable
            width: '100%', 
            height: 400,
            position: 'relative', 
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
              ...kenBurnsStyle, // Applying the new Ken Burns style
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
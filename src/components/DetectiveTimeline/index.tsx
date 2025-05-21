import React, { useMemo, useState, useEffect } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  // spring, // Not used for cameraScrollY directly anymore
  interpolate,
  Easing,
  staticFile,
  Audio,
} from 'remotion';

import { CARD_SIZE, OFFSET, TimelineEvent, TimelineEventData as BaseTimelineEventData } from './TimelineEvent'; // Base type for extension

import data from "../../../data/timeline.json";
import useAudioDurations from '../hooks/useAudioDurations.ts'; // Assuming this hook is adapted or its output is consistent
const { events: rawEvents } = data;
import config from "../../../data/timeline.config.json"
import { VantaCell } from '../backgrounds/Cell';
import { VantaGlobe } from '../backgrounds/Globe';
import { VantaBird } from '../backgrounds/Birds';
const { GAP_FACTOR, VP_CENTER, SCROLL_DURATION } = config;

// Define Keyframe type (can be shared or re-declared)
type Keyframe = {
  duration: number;
  media: string;
  audio: string;
};

// Extend BaseTimelineEventData to include keyframes for CalculatedTimelineEvent
type TimelineEventDataWithKeyframes = BaseTimelineEventData & {
  keyframes?: Keyframe[];
  audioDuration: number; // Ensure this is present from JSON for total duration
};

type CalculatedTimelineEvent = TimelineEventDataWithKeyframes & {
  calculatedStartFrame: number;
  audioDurationInFrames: number; // Total duration of all keyframes in frames
  isLeft?: boolean;
  id?: string; // id field for error handling keys
};

export const DetectiveTimeline: React.FC<{}> = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps,  height } = useVideoConfig();
  const [_, setAudioErrors] = useState<Record<string, boolean>>({});

  const events: TimelineEventDataWithKeyframes[] = rawEvents || [];
  if (events.length === 0) {
    console.warn("No events data provided to DetectiveTimeline.");
    return null;
  }

  // Assuming useAudioDurations hook is either adapted to sum keyframe durations
  // or its output is otherwise made consistent with event.audioDuration from JSON.
  // For this adaptation, we will primarily rely on event.audioDuration from the JSON
  // for total event audio length, as used in the original calculatedEvents logic.
  const audioDurations = useAudioDurations(events, fps);


  const handleAudioError = (errorKey: string, audioUrl: string, error: Error) => {
    console.error(`Audio error for ${errorKey} (${audioUrl}):`, error);
    setAudioErrors(prev => ({
      ...prev,
      [errorKey]: true
    }));
  };

  const calculatedEvents: CalculatedTimelineEvent[] = useMemo(() => {
    let currentFrame = 0;
    const gapFrames = fps * GAP_FACTOR;

    return events.map((event, index) => {
      const calculatedStartFrame = currentFrame;
      
      // Use event.audioDuration from JSON as the total duration for this event's audio content (keyframes sum)
      const totalEventAudioDurationSeconds = event.audioDuration || 0;
      const audioDurationInFrames = Math.round(totalEventAudioDurationSeconds * fps);
      
      const totalEventDuration = audioDurationInFrames + SCROLL_DURATION;
      
      const calculatedEndFrame = calculatedStartFrame + totalEventDuration; // Corrected: totalEventDuration already includes SCROLL_DURATION
      currentFrame = calculatedEndFrame - SCROLL_DURATION + (index < events.length - 1 ? gapFrames : 0) + SCROLL_DURATION; // Simpler: calculatedStartFrame + audioDurationInFrames + (index < events.length - 1 ? gapFrames : 0); then add SCROLL_DURATION for next

      // Correct calculation for next currentFrame start:
      // It's the start of this event + its audio time + scroll time for this event + gap to next event
      const endOfThisEventProcessing = calculatedStartFrame + audioDurationInFrames + SCROLL_DURATION;
      currentFrame = endOfThisEventProcessing + (index < events.length - 1 ? gapFrames : 0);


      return {
        ...event,
        id: event.id || `event-${index}`, // Ensure an ID for error keys
        calculatedStartFrame,
        audioDurationInFrames, // This is the total for all keyframes
        isLeft: index % 2 === 0,
      };
    });
  }, [events, fps, audioDurations]); // audioDurations in dependency if it influences event.audioDuration values

  const lastCalculatedEvent = calculatedEvents[calculatedEvents.length - 1];
  const endMarginFrames = fps * 2; // Keep some margin at the end
  
  const effectiveEndFrame = lastCalculatedEvent
    ? lastCalculatedEvent.calculatedStartFrame + lastCalculatedEvent.audioDurationInFrames + SCROLL_DURATION + endMarginFrames
    : durationInFrames;
  const finalCutoffFrame = Math.min(durationInFrames, effectiveEndFrame);
  
  const opacity = interpolate(
    frame,
    [0, 30, finalCutoffFrame - 30, finalCutoffFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  let activeIndex = -1;
  for (let i = calculatedEvents.length - 1; i >= 0; i--) {
    const event = calculatedEvents[i];
    // An event is active from its start until the next one starts OR until timeline ends
    
    // A card is "active" (highlighted) from its calculatedStartFrame until the next card's calculatedStartFrame
    // Or, if it's the last card, until the effectiveEndFrame of the timeline.
    const activePeriodEndFrame = (i === calculatedEvents.length - 1)
      ? finalCutoffFrame
      : calculatedEvents[i + 1].calculatedStartFrame;

    if (frame >= event.calculatedStartFrame && frame < activePeriodEndFrame) {
      activeIndex = i;
      break;
    }
  }
  // If frame is past the start of the first event, but no activeIndex found (e.g. during gaps),
  // default to the one whose period we are in or just passed.
  // This logic might need refinement if gaps should not show any active card.
  // The current loop correctly finds the active card. If in a gap, activeIndex might remain -1 or be the previous.
  // Forcing activeIndex to 0 if past first event start and still -1
  if (activeIndex === -1 && calculatedEvents.length > 0 && frame >= calculatedEvents[0].calculatedStartFrame) {
     //This case might occur if frame is in a gap *after* all events but before finalCutoffFrame.
     //Or if frame is exactly on calculatedStartFrame of next event.
     //The loop should generally handle it. If it's after the last event's main content phase:
     if (frame >= effectiveEndFrame - endMarginFrames && calculatedEvents.length > 0) {
        activeIndex = calculatedEvents.length -1;
     } else if (calculatedEvents.length > 0 && frame >= calculatedEvents[0].calculatedStartFrame) {
       // Default to first if somehow missed, though the loop should catch it.
       // This might be redundant.
     }
  }

  const eventSpacing = CARD_SIZE;
  const initialOffset = OFFSET;
  const viewportCenter = height * VP_CENTER;

  const targetEventIndexForScroll = Math.max(0, activeIndex); // Scroll to the active event
  const targetEventY = initialOffset + targetEventIndexForScroll * eventSpacing;
  const targetScrollY = targetEventY - viewportCenter;
  const clampedTargetScrollY = Math.max(0, targetScrollY);

  const [transitionData, setTransitionData] = React.useState({
    fromPosition: 0,
    toPosition: clampedTargetScrollY, // Initialize to first target
    startFrame: 0,
    isTransitioning: false
  });
  
  const currentCameraScrollY = React.useRef(clampedTargetScrollY); // To get latest scrollY for fromPosition

  React.useEffect(() => {
    if (activeIndex >= 0) {
      const newTargetY = clampedTargetScrollY;
      if (newTargetY !== transitionData.toPosition || !transitionData.isTransitioning) { // Start new transition if target changed OR if not currently transitioning but should be at newTargetY
        setTransitionData({
          fromPosition: currentCameraScrollY.current, // Use the actual current scroll position
          toPosition: newTargetY,
          startFrame: frame,
          isTransitioning: true
        });
      }
    }
  }, [activeIndex, clampedTargetScrollY]); // Removed frame, transitionData from deps to avoid loops

  let cameraScrollY = 0;
  if (transitionData.isTransitioning) {
    const elapsed = frame - transitionData.startFrame;
    const progress = Math.min(elapsed / SCROLL_DURATION, 1);
    const easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
    
    cameraScrollY = transitionData.fromPosition + (transitionData.toPosition - transitionData.fromPosition) * easedProgress;
    
    if (progress >= 1) {
      // Check if actually at target to avoid premature stop if frame skips
      if (Math.abs(cameraScrollY - transitionData.toPosition) < 0.01 && frame >= transitionData.startFrame + SCROLL_DURATION) {
         setTransitionData(prev => ({
          ...prev,
          isTransitioning: false,
          fromPosition: prev.toPosition // Store final position as new fromPosition for next potential instant move
        }));
        currentCameraScrollY.current = transitionData.toPosition;
      } else if (frame > transitionData.startFrame + SCROLL_DURATION + fps) { // Timeout for safety
        setTransitionData(prev => ({ ...prev, isTransitioning: false, fromPosition: prev.toPosition }));
        currentCameraScrollY.current = transitionData.toPosition;
      }
    }
  } else {
    cameraScrollY = transitionData.toPosition; // Or directly use clampedTargetScrollY if not transitioning
  }
  currentCameraScrollY.current = cameraScrollY; // Update ref


  const totalTimelineHeight = initialOffset + (calculatedEvents.length * eventSpacing);

  return (
    <AbsoluteFill style={{ backgroundColor: '#121212', color: 'white', opacity, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%',
        height: `${totalTimelineHeight + 200}px`,
        transform: `translateY(-${cameraScrollY}px)`,
      }}>
        <VantaGlobe />
        {calculatedEvents.map((event, index) => {
          if (index === calculatedEvents.length - 1) return null;
          const startY = initialOffset + index * eventSpacing;
          const endY = initialOffset + (index + 1) * eventSpacing;
          const segmentHeight = endY - startY;
          const isDashed = index % 2 === 0;
          return (
            <div
              key={`timeline-segment-${index}`}
              style={{
                position: 'absolute', top: startY + 8, left: '50%',
                width: 10, height: segmentHeight - 8,
                backgroundColor: '#c0392b', transform: 'translateX(-50%)',
                borderRadius: 5,
                ...(isDashed && {
                  backgroundImage: 'repeating-linear-gradient(to bottom, #c0392b, #c0392b 30px, transparent 30px, transparent 20px)',
                  backgroundColor: 'transparent'
                })
              }}
            />
          );
        })}

        {calculatedEvents.map((event, index) => (
          <div
            key={event.id || event.title + index}
            style={{
              position: 'absolute',
              top: initialOffset + index * eventSpacing,
              left: '50%', width: '100%',
              transform: 'translateX(-50%)', height: 0,
            }}
          >
            <TimelineEvent
              event={event}
              index={index}
              isLeft={event.isLeft || false}
              isActive={index === activeIndex}
              calculatedStartFrame={event.calculatedStartFrame}
              initialOffset={initialOffset}
              eventSpacing={eventSpacing}
            />
            
            {/* Keyframe Audios: Play sequentially within the event's audio duration */}
            {event.keyframes && event.keyframes.length > 0 && (
              <Sequence
                from={event.calculatedStartFrame + SCROLL_DURATION}
                durationInFrames={event.audioDurationInFrames} // Total duration for all keyframes of this event
                name={`KeyframesAudioContainer_${event.id}`}
              >
                {(() => {
                  let cumulativeOffsetFrames = 0;
                  return event.keyframes!.map((keyframe, kfIndex) => {
                    const keyframeAudioDurationFrames = Math.round(keyframe.duration * fps);
                    const audioSequence = (
                      <Sequence
                        key={`keyframe-audio-${event.id}-${kfIndex}`}
                        from={cumulativeOffsetFrames}
                        durationInFrames={keyframeAudioDurationFrames}
                      >
                        <Audio
                          src={staticFile(`assets/timeline/audio/${keyframe.audio}`)}
                          volume={1}
                          onError={(e) => handleAudioError(`${event.id}-kf-${kfIndex}`, keyframe.audio, e)}
                        />
                      </Sequence>
                    );
                    cumulativeOffsetFrames += keyframeAudioDurationFrames;
                    return audioSequence;
                  });
                })()}
              </Sequence>
            )}

            {/* Pin sound */}
            <Sequence 
              from={event.calculatedStartFrame} 
              durationInFrames={25} 
              name={`PinSoundStart_${event.calculatedStartFrame}`}
            >
              <Audio 
                volume={0.125} 
                src={staticFile("assets/sfx/blip1.wav")} 
                onError={(e) => console.error('Pin sound start error:', e)} 
              />
            </Sequence>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
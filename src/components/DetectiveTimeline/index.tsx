import React, { useMemo, useState, useEffect } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  spring,
  interpolate,
  Easing,
  staticFile,
  Audio,
} from 'remotion';

import { CARD_SIZE, OFFSET, TimelineEvent, TimelineEventData } from './TimelineEvent';

import data from "../../../data/timeline.json";
import useAudioDurations from '../hooks/useAudioDurations.ts';
const { events: rawEvents } = data;
import config from "../../../data/timeline.config.json"
const { GAP_FACTOR, VP_CENTER, SCROLL_DURATION } = config;
type CalculatedTimelineEvent = TimelineEventData & {
  calculatedStartFrame: number;
  audioDurationInFrames: number;
  isLeft?: boolean;
  id?: string;
  audio?: string;
  fallbackAudio?: string;
};

export const DetectiveTimeline: React.FC<{}> = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});

  const events = rawEvents || [];
  if (events.length === 0) {
    console.warn("No events data provided to DetectiveTimeline.");
    return null;
  }

  const audioDurations = useAudioDurations(events, fps);

  // Handle audio errors
  const handleAudioError = (eventId: string, audioUrl: string, error: Error) => {
    console.error(`Audio error for event ${eventId} (${audioUrl}):`, error);
    setAudioErrors(prev => ({
      ...prev,
      [eventId]: true
    }));
  };

  const calculatedEvents: CalculatedTimelineEvent[] = useMemo(() => {
    let currentFrame = 0;
    const gapFrames = fps * GAP_FACTOR;

    return events.map((event, index) => {
      // Calculate the start frame for this event
      const calculatedStartFrame = currentFrame;
      
      // Get audio duration for this event      const audioDurationInFrames = Math.round(events[index].audioDuration * fps);
      
      // Keep the event active for its full audio duration first
      // Then add SCROLL_DURATION for the transition
      const audioDurationInFrames = Math.round(event.audioDuration * fps);
      const totalEventDuration = audioDurationInFrames + SCROLL_DURATION;
      
      // Calculate end frame and increment currentFrame for next event
      // Ensure we don't start scrolling until after the audio finishes
      const calculatedEndFrame = calculatedStartFrame + audioDurationInFrames + SCROLL_DURATION;
      currentFrame = calculatedEndFrame + (index < events.length - 1 ? gapFrames : 0);

      return {
        ...event,
        calculatedStartFrame,
        audioDurationInFrames,
        isLeft: index % 2 === 0,
      };
    });
  }, [events, audioDurations, fps]);

  const lastCalculatedEvent = calculatedEvents[calculatedEvents.length - 1];
  const endMarginFrames = fps * 2;
  const effectiveEndFrame = lastCalculatedEvent
    ? lastCalculatedEvent.calculatedStartFrame + lastCalculatedEvent.audioDurationInFrames + SCROLL_DURATION + endMarginFrames
    : durationInFrames;
  const finalCutoffFrame = Math.min(durationInFrames, effectiveEndFrame);

  const opacity = interpolate(
    frame,
    [0, 30, finalCutoffFrame - 30, finalCutoffFrame],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Find active event based on frame
  let activeIndex = -1;
  for (let i = calculatedEvents.length - 1; i >= 0; i--) {
    const event = calculatedEvents[i];
    const activePeriodEndFrame = (i === calculatedEvents.length - 1)
      ? finalCutoffFrame
      : calculatedEvents[i + 1].calculatedStartFrame;

    if (frame >= event.calculatedStartFrame && frame < activePeriodEndFrame) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex === -1 && calculatedEvents.length > 0) {
    if (frame >= calculatedEvents[0].calculatedStartFrame) {
      activeIndex = 0;
    }
  }

  // Timeline calculations
  const eventSpacing = CARD_SIZE;
  const initialOffset = OFFSET;
  const viewportCenter = height * VP_CENTER; // Match original vertical center point

  // Calculate scroll position
  const targetEventIndexForScroll = Math.max(0, activeIndex);
  const targetEventY = initialOffset + targetEventIndexForScroll * eventSpacing;
  const targetScrollY = targetEventY - viewportCenter;

  const totalTimelineHeight = initialOffset + (calculatedEvents.length * eventSpacing);
  const clampedTargetScrollY = Math.max(0, targetScrollY);

  // Track transitions between events
  const [transitionData, setTransitionData] = React.useState({
    fromPosition: 0,
    toPosition: 0,
    startFrame: 0,
    isTransitioning: false
  });
  
  // This monitors for change in activeIndex and starts a new transition
  React.useEffect(() => {
    if (activeIndex >= 0) {
      const newTargetY = clampedTargetScrollY;
      
      // Only start a new transition if the target position has changed
      if (newTargetY !== transitionData.toPosition) {
        setTransitionData({
          fromPosition: transitionData.isTransitioning ? transitionData.fromPosition : cameraScrollY,
          toPosition: newTargetY,
          startFrame: frame,
          isTransitioning: true
        });
      }
    }
  }, [activeIndex, clampedTargetScrollY]);

  // Calculate camera scroll position with custom easing
  // This completely replaces the spring function with our own custom animation
  
  let cameraScrollY = 0;
  
  if (transitionData.isTransitioning) {
    const elapsed = frame - transitionData.startFrame;
    const progress = Math.min(elapsed / SCROLL_DURATION, 1);
    
    // Custom easing function for smooth movement (ease in-out cubic)
    // const easedProgress = progress < 0.5 
    //   ? 4 * progress * progress * progress 
    //   : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    const easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
    
    // Linear interpolation between start and end positions
    cameraScrollY = transitionData.fromPosition + (transitionData.toPosition - transitionData.fromPosition) * easedProgress;
    
    // If we've completed the transition, update the state
    if (progress >= 1 && frame > transitionData.startFrame + 5) {
      // Small delay to avoid immediate state updates
      setTimeout(() => {
        setTransitionData(prev => ({
          ...prev,
          isTransitioning: false,
          fromPosition: prev.toPosition
        }));
      }, 0);
    }
  } else {
    cameraScrollY = transitionData.toPosition;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#121212',
        color: 'white',
        opacity,
        overflow: 'hidden',
      }}
    >
      {/* Camera container with proper styling from original */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${totalTimelineHeight + 200}px`, // Add buffer like in original
          transform: `translateY(-${cameraScrollY}px)`,
        }}
      >
        {/* Replace solid timeline with dashed/broken segments */}
        {calculatedEvents.map((event, index) => {
          // Don't draw a line segment for the last event
          if (index === calculatedEvents.length - 1) return null;
          
          // Calculate the start and end points for this segment
          const startY = initialOffset + index * eventSpacing;
          const endY = initialOffset + (index + 1) * eventSpacing;
          const segmentHeight = endY - startY;
          
          // Determine line style - alternating styles for visual interest
          const isDashed = index % 2 === 0;
          
          return (
            <div
              key={`timeline-segment-${index}`}
              style={{
                position: 'absolute',
                top: startY + 8,
                left: '50%',
                width: 10,
                height: segmentHeight - 8,
                backgroundColor: '#c0392b',
                transform: 'translateX(-50%)',
                borderRadius: 5,
                // Apply dashed style to alternating segments
                ...(isDashed && {
                  backgroundImage: 'repeating-linear-gradient(to bottom, #c0392b, #c0392b 30px, transparent 30px, transparent 20px)',
                  backgroundColor: 'transparent'
                })
              }}
            />
          );
        })}

        {/* Map through events with proper positioning containers */}
        {calculatedEvents.map((event, index) => {
          // Calculate if the scroll animation for this event has completed
          const isScrollCompleted = activeIndex === index && 
                                   (!transitionData.isTransitioning || 
                                    frame >= transitionData.startFrame + SCROLL_DURATION);
          
          return (
            <div
              key={event.title + index}
              style={{
                position: 'absolute',
                top: initialOffset + index * eventSpacing, // Position vertically on the timeline
                left: '50%', // Center the container
                width: '100%',
                transform: 'translateX(-50%)', // Center align
                height: 0, // No height to avoid affecting layout
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

              {/* Add a dot/node at each event point */}
             
              {/* Audio component for this event - now delayed by SCROLL_DURATION */}
              <Sequence
                from={event.calculatedStartFrame + SCROLL_DURATION} // Delay start by SCROLL_DURATION
                durationInFrames={event.audioDurationInFrames}
                name={`AudioSequence_${event.title}`}
              >
                <Audio
                  src={staticFile("assets/timeline/timeline/audio" + (index + 1) + ".wav")}
                  volume={1}
                  onError={(e) => handleAudioError(event.id || index.toString(), event.audio!, e)}
                />
              </Sequence>
              
              {/* Pin sound - only play after scroll has completed to avoid playing during transitions */}
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
          )
        })}
      </div>
    </AbsoluteFill>
  );
};
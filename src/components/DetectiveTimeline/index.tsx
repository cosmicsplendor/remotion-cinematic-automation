import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence, // Sequence might not be needed directly here unless used elsewhere
  spring,
  interpolate,
  Easing,
} from 'remotion';
import { CARD_SIZE, OFFSET, TimelineEvent, TimelineEventData } from './TimelineEvent';
export type DetectiveTimelineProps = {
  events?: TimelineEventData[];
}
import data from "../../../inputs/timeline/data.ts"; // Adjust the path as necessary
const { events } = data; // Assuming data is structured as { events: [...] }
export const DetectiveTimeline: React.FC<{}> = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();

  // --- Opacity interpolation remains the same ---
  const opacity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  if (!events) {
    return null; // Handle case where events are not provided
  }
  // --- Timeline height interpolation remains the same ---
  // Ensure this calculation accurately reflects the total height needed
  const totalTimelineHeight = OFFSET + (events.length * CARD_SIZE); // Initial offset + space for all events

  // --- Calculate active event index with interpolation ---
  let activeIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (frame >= events[i].startFrame) {
      activeIndex = i;
      break;
    }
  }
  if (activeIndex === -1) {
    activeIndex = 0;
  }

  // Calculate progress to next event for smooth transitions
  const currentEventStart = events[activeIndex].startFrame;
  const nextEventStart = events[activeIndex + 1]?.startFrame ?? durationInFrames;
  const progressToNextEvent = interpolate(
    frame,
    [currentEventStart, currentEventStart + 10], // Reduced from full range to just 10 frames
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Faster easing curve
    }
  );

  // --- Centering Calculation with interpolation ---
  const eventSpacing = CARD_SIZE;
  const initialOffset = OFFSET; // Initial offset for the timeline line
  const viewportCenter = height * 0.75;

  // Interpolate between current and next event positions
  const currentEventY = initialOffset + activeIndex * eventSpacing;
  const nextEventY = initialOffset + (activeIndex + 1) * eventSpacing;
  const interpolatedY = interpolate(
    progressToNextEvent,
    [0, 1],
    [currentEventY, nextEventY]
  );

  const targetScrollY = interpolatedY - viewportCenter;
  const clampedTargetScrollY = Math.max(0, targetScrollY);

  const cameraScrollY = spring({
    frame: frame,
    fps: fps,
    from: 0,
    to: clampedTargetScrollY,
    config: {
      damping: 15,
      mass: 0.4,
      stiffness: 180,
    },
  });

  // const cameraScrollY = spring({
  //   frame: frame,
  //   to: clampedTargetScrollY,
  //   fps: fps,
  //   config: {
  //     damping: 15,    // Lower damping for faster movement
  //     mass: 0.4,      // Much lower mass for faster response
  //     stiffness: 180, // Much higher stiffness for faster movement
  //   },
  // });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#121212',
        color: 'white',
        opacity,
        overflow: 'hidden', // Hide content moving outside the viewport
      }}
    >
      {/* Camera container that moves */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          // Height needs to be large enough to contain all events
          // It doesn't strictly need to be dynamic here, but ensures content isn't cut off
          // Use totalTimelineHeight or a sufficiently large number
          height: `${totalTimelineHeight + 200}px`, // Add some buffer
          transform: `translateY(-${cameraScrollY}px)`,
          // Add will-change for potentially smoother animation, but use judiciously
          // willChange: 'transform',
        }}
      >
        {/* Optional: Title (can be outside the scrolling div if always visible) */}
        {/* <div style={{ position: 'fixed', top: 40, ...}}>Title</div> */}

        {/* The red timeline line */}
        <div
          style={{
            position: 'absolute',
            top: initialOffset, // Start line where the first event starts visually
            left: '50%',
            width: 8,
            backgroundColor: '#c0392b',
            transform: 'translateX(-50%)',
            // Use the calculated dynamic height for the line
            height: `${Math.max(0, (events.length - 1) * eventSpacing + 20)}px`, // Height spans between event points
            // Or use timelineVisibleHeight if you want the line itself to animate length
            // height: timelineVisibleHeight - initialOffset > 0 ? timelineVisibleHeight - initialOffset : 0,
          }}
        />

        {/* Map through events and render them */}
        {events.map((event, index) => (
          <TimelineEvent
            key={event.title + index} // Use a more stable key if possible
            event={event}
            index={index}
            isLeft={index % 2 === 0}
            // Determine active state based purely on frame being within event's duration
            isActive={frame >= event.startFrame && frame < (events[index + 1]?.startFrame ?? durationInFrames)}
            // Pass necessary constants if TimelineEvent needs them for positioning
            initialOffset={initialOffset}
            eventSpacing={eventSpacing}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
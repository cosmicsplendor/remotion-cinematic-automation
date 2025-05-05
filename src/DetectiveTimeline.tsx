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
import { TimelineEvent, TimelineEventData } from './TimelineEvent';
export type DetectiveTimelineProps = {
  events?: TimelineEventData[];
}
export const DetectiveTimeline: React.FC<DetectiveTimelineProps> = ({ events }) => {
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
  const totalTimelineHeight = 160 + (events.length * 200); // Initial offset + space for all events

  // --- Calculate active event index ---
  // Find the *last* event whose startFrame is less than or equal to the current frame
  let activeIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (frame >= events[i].startFrame) {
      activeIndex = i;
      break;
    }
  }
  // If no event has started yet, default to the first one (or -1/0 depending on desired start behavior)
  if (activeIndex === -1) {
    // Decide behavior before first event: show top (0) or focus on first (-1 might need handling)
    activeIndex = 0; // Let's default to focusing on the first event initially
  }

  // --- Centering Calculation ---
  const eventSpacing = 200; // Vertical distance between event starts
  const initialOffset = 160; // Top offset for the first event and timeline line
  const viewportCenter = height / 2;

  // Calculate the absolute Y position of the active event's *center point* or *anchor point*
  // In this layout, the component is placed at top: initialOffset + index * eventSpacing
  // Let's aim to center *this* point.
  const targetEventAbsoluteY = initialOffset + activeIndex * eventSpacing;

  // Calculate how much the container needs to be scrolled UP (negative Y translation)
  // to bring targetEventAbsoluteY to viewportCenter.
  const targetScrollY = targetEventAbsoluteY - viewportCenter;

  // Ensure we don't scroll past the top (scrollY shouldn't be negative)
  const clampedTargetScrollY = Math.max(0, targetScrollY);

  // Smoothly interpolate the scroll position using spring
  const cameraScrollY = spring({
    frame: frame,
    // from: 0, // 'from' is implicitly handled by spring based on previous frame's value
    to: clampedTargetScrollY,
    fps: fps,
    config: {
      damping: 30,    // Slightly higher damping for potentially smoother stop
      mass: 1,        // Default mass often works well
      stiffness: 50,  // Slightly higher stiffness for quicker response
      // Keep your previous values if they worked better:
      // damping: 25,
      // mass: 1.2,
      // stiffness: 30
    },
  });

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
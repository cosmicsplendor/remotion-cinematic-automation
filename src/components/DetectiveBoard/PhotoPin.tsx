// PhotoPin.tsx - Complete and Corrected Version
import React, { useMemo, useState, useEffect } from 'react';
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
} from 'remotion';
import { AudioVisualizer } from './AudioVisualizer.tsx'; // Assuming AudioVisualizer.tsx is in the same directory
import { PersonData } from './index.tsx'; // Adjust path if PersonData is defined elsewhere

// Define the properties the PhotoPin component expects
interface PhotoPinProps {
  person: PersonData;
  isActive: boolean;
  relativeFrame: number; // Frame relative to the start of this person's sequence segment
  transitionDuration: number; // Duration of the transition animation (in frames)
  totalDuration: number; // Total duration of this person's sequence segment (in frames)
  initialPosition: {
    x: number;
    y: number;
    rotation: number;
  };
  centerPosition: {
    x: number;
    y: number;
  };
  // Audio related props
  audioSrc?: string; // The URL of the audio file (if any)
  audioStartFrame?: number; // The absolute frame number when the audio playback starts
}
// --- Constants ---
const PHOTO_WIDTH = 240 * 0.75;
const PHOTO_HEIGHT = 320 * 0.75;
export const PhotoPin: React.FC<PhotoPinProps> = ({
  person,
  isActive,
  relativeFrame,
  transitionDuration,
  totalDuration,
  initialPosition,
  centerPosition,
  audioSrc,
  audioStartFrame,
}) => {
  const { fps } = useVideoConfig();

  // --- Animation Calculations ---

  // Spring animation for moving the photo to the center
  const moveToCenter = useMemo(() => {
    if (!isActive) return 0; // No movement if not active

    return Math.min(
      1,
      spring({
        frame: relativeFrame,
        fps,
        config: {
          damping: 15,
          mass: 0.8,
          stiffness: 100,
        },
        durationInFrames: transitionDuration,
      })
    );
  }, [isActive, relativeFrame, fps, transitionDuration]);

  // Spring animation for moving the photo back to its initial position
  const moveBack = useMemo(() => {
    if (!isActive) return 0; // No movement if not active
    // Only start moving back after the hold duration, during the return transition
    if (relativeFrame < totalDuration - transitionDuration) return 0;

    return spring({
      // Adjust frame calculation relative to the start of the return animation
      frame: relativeFrame - (totalDuration - transitionDuration),
      fps,
      config: {
        damping: 15,
        mass: 0.8,
        stiffness: 100,
      },
      // Duration of the "move back" part of the transition
      durationInFrames: transitionDuration,
    });
  }, [isActive, relativeFrame, totalDuration, transitionDuration, fps]);

  // Interpolate current position based on the two spring animations
  // moveToCenter increases from 0 to 1, moveBack increases from 0 to 1 (later)
  // The difference (moveToCenter - moveBack) maps the progress:
  // 0 -> initial position
  // 1 -> center position
  // 0 -> back to initial position
  const currentX = interpolate(
    moveToCenter - moveBack,
    [0, 1],
    [initialPosition.x, centerPosition.x]
  );

  const currentY = interpolate(
    moveToCenter - moveBack,
    [0, 1],
    [initialPosition.y, centerPosition.y]
  );

  // Interpolate current rotation (from initial random rotation to 0 at center)
  const currentRotation = interpolate(
    moveToCenter - moveBack,
    [0, 1],
    [initialPosition.rotation, 0]
  );

  // Interpolate base scale (smaller when inactive/at edge, larger at center)
  const baseScale = isActive
    ? interpolate(
      moveToCenter - moveBack,
      [0, 1],
      [0.3, 1] // Scale from 30% to 100%
    )
    : 0.3; // Inactive photos are always 30% scale

  // Interpolate glow effect opacity (only visible when centered)
  const glowOpacity = isActive
    ? interpolate(
      moveToCenter - moveBack,
      [0, 1],
      [0, 0.8] // Opacity from 0 to 80%
    )
    : 0; // No glow when inactive



  // --- State for Audio-Driven Scaling ---
  const [scaleModifier, setScaleModifier] = useState(1); // 1 means no modification

  // --- Effect to Reset Scale Modifier ---
  // This effect runs after every render where its dependencies change.
  // It ensures the scale modifier is reset to 1 when the photo is not
  // supposed to be reacting to audio (e.g., moving, inactive, no audio).
  useEffect(() => {
    // Determine if the conditions for audio scaling are currently met
    const shouldApplyAudioScaling =
      isActive &&
      audioSrc &&
      audioStartFrame !== undefined &&
      moveToCenter > 0.9 && // Fully or nearly fully moved to center
      moveBack < 0.1; // Not yet started or barely started moving back

    // If the conditions are NOT met, reset the scale modifier
    if (!shouldApplyAudioScaling) {
      // Only call the state setter if the value needs to change,
      // to prevent potential unnecessary re-renders.
      if (scaleModifier !== 1) {
        setScaleModifier(1);
      }
    }
    // Dependencies: This effect should re-run if any of these values change.
  }, [isActive, audioSrc, audioStartFrame, moveToCenter, moveBack, scaleModifier]);

  // --- Final Scale Calculation ---
  // Combine the base animation scale with the audio-driven scale modifier
  // --- Render Logic ---
  return (
    <div
      style={{
        position: 'absolute',
        // Calculate top-left corner based on center position and final scaled dimensions
        left: currentX - (PHOTO_WIDTH * baseScale) / 2,
        top: currentY - (PHOTO_HEIGHT * baseScale) / 2,
        // Apply rotation
        transform: `rotate(${currentRotation}deg)`,
        transformOrigin: 'center center', // Ensure scaling and rotation happen around the center
        // Active photo should be on top
        zIndex: isActive ? 10 : 1,
        // Optional: Add transitions for smoother visual changes if needed,
        // though Remotion's frame-based updates are often smooth enough.
        // transition: 'left 0.05s, top 0.05s, width 0.05s, height 0.05s',
      }}
    >
      {/* Pushpin Element */}
      <div
        style={{
          position: 'absolute',
          width: 20,
          height: 20,
          backgroundColor: '#e74c3c', // Red pushpin head
          borderRadius: '50%',
          top: -10, // Position above the photo
          left: '50%',
          transform: 'translateX(-50%)', // Center horizontally
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 2, // Ensure pin is above the photo content
        }}
      />

      {/* Glow Effect (Conditionally Rendered) */}
      {glowOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            // Match the size of the scaled photo container
            width: PHOTO_WIDTH * baseScale,
            height: PHOTO_HEIGHT * baseScale,
            backgroundColor: 'transparent',
            // Yellowish glow effect
            // ${(finalScale - 1) * 100 * 0.25
            boxShadow: `0 0 8px 5px rgba(255, 100, 50, ${glowOpacity * (scaleModifier - 1) * 100})`,
            borderRadius: '4px', // Slightly rounded corners for the glow
            // Center the glow relative to the photo container (if needed, though width/height match should suffice)
            top: 0,
            left: 0,
            zIndex: 0, // Behind the photo content but inside the main div
            pointerEvents: 'none', // Prevent glow from interfering with interactions
          }}
        />
      )}

      {/* Photo Container */}
      <div
        style={{
          position: 'relative', // Needed for absolute positioning of children like the pin/glow
          // Apply the final calculated scale via width/height
          width: PHOTO_WIDTH * baseScale,
          height: PHOTO_HEIGHT * baseScale,
          backgroundColor: 'white', // Polaroid-style background
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)', // Standard shadow
          padding: 8 * baseScale, // Padding that scales down when photo is small
          // Transition for smoother size changes from audio visualiser
          zIndex: 1, // Above the glow
        }}
      >
        <Img
          src={staticFile(person.photoUrl)} // Use staticFile for assets in public folder
          style={{
            display: 'block', // Prevent extra space below image
            width: '100%',
            height: '100%',
            objectFit: 'cover', // Ensure image covers the area, might crop
          }}
          onError={(e) => console.error(`Error loading image: ${person.photoUrl}`, e)}
        />
      </div>

      {/* Audio Visualizer Component (Conditionally Rendered) */}
      {/* Render only when active, centered, and required audio props are present */}
      {isActive && audioSrc && audioStartFrame !== undefined && moveToCenter > 0.9 && moveBack < 0.1 && (
        <AudioVisualizer
          audioSrc={audioSrc} // Pass the audio source URL
          audioStartFrame={audioStartFrame} // Pass the absolute start frame
          // Provide a unique key: ensures the component re-mounts with fresh state
          // when the audio source changes (i.e., when switching persons).
          key={`${person.id}-${audioSrc}`}
          onAmplitudeChange={(amplitude) => {
            // This callback receives the normalized amplitude (0 to 1)
            // Apply the scaling effect based on the amplitude.
            // The useEffect hook handles resetting the scale when conditions change.
            setScaleModifier(1 + amplitude * 0.05); // Scale up to 10% based on amplitude
          }}
        />
      )}
    </div>
  );
};
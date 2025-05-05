// PhotoPin.tsx
import React, { useMemo } from 'react';
import {
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
} from 'remotion';
import { AudioVisualizer } from './AudioVisualizer.tsx';
import { PersonData } from './DetectiveBoardPresentation';

interface PhotoPinProps {
  person: PersonData;
  isActive: boolean;
  relativeFrame: number;
  transitionDuration: number;
  totalDuration: number;
  initialPosition: {
    x: number;
    y: number;
    rotation: number;
  };
  centerPosition: {
    x: number;
    y: number;
  };
  audioData?: string;
}

export const PhotoPin: React.FC<PhotoPinProps> = ({
  person,
  isActive,
  relativeFrame,
  transitionDuration,
  totalDuration,
  initialPosition,
  centerPosition,
  audioData,
}) => {
  const { fps } = useVideoConfig();
  
  // Calculate the animation progress for movement to center
  const moveToCenter = useMemo(() => {
    if (!isActive) return 0;
    
    return spring({
      frame: relativeFrame,
      fps,
      config: {
        damping: 15,
        mass: 0.8,
        stiffness: 100,
      },
      durationInFrames: transitionDuration,
    });
  }, [isActive, relativeFrame, fps, transitionDuration]);
  
  // Calculate the animation progress for movement back to initial position
  const moveBack = useMemo(() => {
    if (!isActive) return 0;
    if (relativeFrame < totalDuration - transitionDuration) return 0;
    
    return spring({
      frame: relativeFrame - (totalDuration - transitionDuration),
      fps,
      config: {
        damping: 15,
        mass: 0.8,
        stiffness: 100,
      },
      durationInFrames: transitionDuration,
    });
  }, [isActive, relativeFrame, totalDuration, transitionDuration, fps]);
  
  // Calculate current position
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
  
  // Calculate current rotation
  const currentRotation = interpolate(
    moveToCenter - moveBack,
    [0, 1],
    [initialPosition.rotation, 0]
  );
  
  // Calculate current scale (small when inactive, larger when active)
  const baseScale = isActive 
    ? interpolate(
        moveToCenter - moveBack,
        [0, 1],
        [0.3, 1]
      )
    : 0.3;
  
  // Calculate the glow/highlight effect strength
  const glowOpacity = isActive
    ? interpolate(
        moveToCenter - moveBack,
        [0, 1],
        [0, 0.8]
      )
    : 0;

  // Photo dimensions
  const PHOTO_WIDTH = 240;
  const PHOTO_HEIGHT = 320;
  
  // Get audio visualization scaling if active and playing audio
  const [scaleModifier, setScaleModifier] = React.useState(1);
  
  return (
    <div
      style={{
        position: 'absolute',
        left: currentX - (PHOTO_WIDTH * baseScale) / 2,
        top: currentY - (PHOTO_HEIGHT * baseScale) / 2,
        transform: `rotate(${currentRotation}deg)`,
        transformOrigin: 'center',
        zIndex: isActive ? 10 : 1,
      }}
    >
      {/* Pushpin */}
      <div
        style={{
          position: 'absolute',
          width: 20,
          height: 20,
          backgroundColor: '#e74c3c',
          borderRadius: '50%',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 2,
        }}
      />
      
      {/* Glow effect */}
      {glowOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            width: PHOTO_WIDTH * baseScale * scaleModifier,
            height: PHOTO_HEIGHT * baseScale * scaleModifier,
            backgroundColor: 'transparent',
            boxShadow: `0 0 30px 10px rgba(255, 255, 200, ${glowOpacity})`,
            borderRadius: '4px',
            transform: `scale(${scaleModifier})`,
            transformOrigin: 'center',
            transition: 'all 0.1s ease-out',
          }}
        />
      )}
      
      {/* Photo */}
      <div
        style={{
          position: 'relative',
          width: PHOTO_WIDTH * baseScale * scaleModifier,
          height: PHOTO_HEIGHT * baseScale * scaleModifier,
          backgroundColor: 'white',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          padding: 8 * baseScale,
          transform: `scale(${scaleModifier})`,
          transformOrigin: 'center',
          transition: 'all 0.1s ease-out',
        }}
      >
        <Img
          src={person.photoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
      
      {/* Audio visualizer (controls the scale of the photo) */}
      {isActive && audioData && moveToCenter > 0.9 && (
        <AudioVisualizer
          audioSrc={audioData}
          onAmplitudeChange={(amplitude) => {
            // Scale between 1 and 1.1 based on audio amplitude
            setScaleModifier(1 + amplitude * 0.1);
          }}
        />
      )}
    </div>
  );
};
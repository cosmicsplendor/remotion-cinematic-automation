import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
// Import the specific effect you want to use
import VANTA from 'vanta/dist/vanta.net.min';

// The VantaBackground component for Remotion
export const VantaBackground = ({
  color = 0x0077ff,
  backgroundColor = 0x1b1b1b,
  points = 10,
  maxDistance = 20,
  spacing = 15,
  showDots = true,
  speed = 1,
  children,
}) => {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Initialize VANTA effect
  useEffect(() => {
    if (!vantaRef.current) return;

    if (vantaEffect.current) {
      vantaEffect.current.destroy();
    }

    // Create the VANTA effect
    vantaEffect.current = VANTA({
      el: vantaRef.current,
      THREE,
      color,
      backgroundColor,
      points,
      maxDistance,
      spacing,
      showDots,
    });

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, [color, backgroundColor, points, maxDistance, spacing, showDots]);

  // Update animation based on Remotion frame
  useEffect(() => {
    if (!vantaEffect.current) return;

    // Set the animation time based on the current frame
    // This ensures the animation progresses with the video frames
    const time = frame / fps * speed;
    
    // Access and update the internal VANTA animation time
    if (vantaEffect.current && vantaEffect.current.options) {
      // Update the VANTA animation time
      vantaEffect.current.options.time = time;
      vantaEffect.current.update();
    }
  }, [frame, fps, speed]);

  return (
    <div 
      ref={vantaRef} 
      style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        zIndex: 0,
      }}
    >
      {children}
    </div>
  );
};
//   <VantaBackground 
//         color={0x3a9df1}
//         backgroundColor={0x0d1117}
//         points={10}
//         maxDistance={23}
//         spacing={17}
//         showDots={true}
//         speed={1.5}
//       />
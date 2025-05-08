// src/remotion/ParallaxComposition.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring, Sequence, useVideoConfig } from 'remotion';
import styled from 'styled-components';
import { SVGElementData , LayerData , ParallaxConfig } from './types'; // Import editor types
const SVGViewer: React.FC<{ svgString: string; width: string; height: string }> = ({ 
  svgString, 
  width, 
  height 
}) => {
  return (
    <div
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
};
export const ParallaxComposition: React.FC<ParallaxConfig> = ({
  durationInFrames,
  backgroundColor,
  camera,
  layers,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cameraProgress = frame / (durationInFrames > 1 ? durationInFrames - 1 : 1);

  // Calculate camera position based on animation progress
  const currentCameraX = interpolate(cameraProgress, [0, 1], [camera.initialX, camera.finalX]);
  const currentCameraY = interpolate(cameraProgress, [0, 1], [camera.initialY, camera.finalY]);
  const currentCameraZoom = interpolate(
    cameraProgress, 
    [0, 1], 
    [camera.initialZoom, camera.finalZoom],
    { easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
  );

  return (
    <AbsoluteFill style={{ backgroundColor, width, height }}>
      <AbsoluteFill
        style={{
          transformOrigin: 'center center',
          transform: `scale(${currentCameraZoom}) translate(${-currentCameraX}px, ${-currentCameraY}px)`,
        }}
      >
        {[...layers]
          .filter(layer => layer.isVisible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer: LayerData) => {
            // Calculate parallax effect
            const layerEffectiveTranslateX = currentCameraX * (1 - layer.parallaxFactor.x);
            const layerEffectiveTranslateY = currentCameraY * (1 - layer.parallaxFactor.y);

            return (
              <AbsoluteFill
                key={layer.id}
                style={{
                  transform: `translate(${layerEffectiveTranslateX}px, ${layerEffectiveTranslateY}px)`,
                  zIndex: layer.zIndex,
                }}
              >
                {(layer.elements || [])
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((element: SVGElementData) => {
                    // Calculate rotation based on animation type
                    let currentRotation: number;
                    
                    if (element.rotationAnimationType === 'spring') {
                      currentRotation = spring({
                        frame,
                        fps,
                        from: element.initialRotation,
                        to: element.finalRotation,
                        config: { stiffness: 100, damping: 15 },
                      });
                    } else {
                      currentRotation = interpolate(
                        frame,
                        [0, Math.max(0, durationInFrames - 1)],
                        [element.initialRotation, element.finalRotation],
                        { 
                          easing: Easing.bezier(0.42, 0, 0.58, 1), 
                          extrapolateLeft: 'clamp', 
                          extrapolateRight: 'clamp' 
                        }
                      );
                    }

                    const elementTransformOrigin = `${element.transformOriginX * 100}% ${element.transformOriginY * 100}%`;

                    return (
                      <div
                        key={element.id}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: element.width,
                          height: element.height,
                          opacity: element.opacity,
                          transformOrigin: elementTransformOrigin,
                          transform: `
                            translate(calc(-50% + ${element.x}px), calc(-50% + ${element.y}px))
                            scale(${element.scale})
                            rotate(${currentRotation}deg)
                          `,
                          zIndex: element.zIndex,
                        }}
                      >
                        <SVGViewer 
                          svgString={element.svgString} 
                          width="100%" 
                          height="100%" 
                        />
                      </div>
                    );
                  })}
              </AbsoluteFill>
            );
          })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
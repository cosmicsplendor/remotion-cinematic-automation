// src/remotion/ParallaxComposition.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, spring, Sequence } from 'remotion';
import styled from 'styled-components';
import { MyCompositionProps, SVGElementData as EditorSVGElementData, LayerData as EditorLayerData } from './types'; // Import editor types
import { SVGViewer } from '../shared/SVGViewer'; // Reuse the simple SVG viewer

// Styled components for Remotion elements if needed
const LayerContainer = styled(AbsoluteFill)`
  /* transform-origin: center center; // default */
`;

const ElementContainer = styled.div<{
  // x, y, scale, opacity are now mostly handled by inline styles or direct application
  // elWidth and elHeight are still useful for sizing the div
  elWidth: number;
  elHeight: number;
  // zIndex prop for styled-component specific z-ordering if absolutely needed, but inline style is fine
}>`
  position: absolute;
  left: 50%; // Center of the parent (layer)
  top: 50%;
  width: ${(props) => props.elWidth}px;
  height: ${(props) => props.elHeight}px;
  /* transform-origin will be set inline */
  /* transform will be set inline */
  /* opacity will be set inline */
`;



export const ParallaxComposition: React.FC<any> = ({
  durationInFrames,
  fps,
  width,
  height,
  backgroundColor,
  camera,
  layers,
}) => {
  const frame = useCurrentFrame();
  const cameraProgress = frame / (durationInFrames > 1 ? durationInFrames -1 : 1); // Avoid division by zero

  const currentCameraX = interpolate(cameraProgress, [0, 1], [camera.initialX, camera.finalX]);
  const currentCameraY = interpolate(cameraProgress, [0, 1], [camera.initialY, camera.finalY]);
  const currentCameraZoom = interpolate(
    cameraProgress, [0, 1], [camera.initialZoom, camera.finalZoom],
    { easing: Easing.bezier(.25,.1,.25,1) }
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <AbsoluteFill
        style={{
          transformOrigin: 'center center',
          transform: `scale(${currentCameraZoom}) translate(${-currentCameraX}px, ${-currentCameraY}px)`,
        }}
      >
        {[...layers]
          .filter(layer => layer.isVisible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer: EditorLayerData) => {
            const layerEffectiveTranslateX = currentCameraX * (1 - layer.parallaxFactor.x);
            const layerEffectiveTranslateY = currentCameraY * (1 - layer.parallaxFactor.y);

            return (
              <AbsoluteFill // Was LayerContainer, AbsoluteFill is fine for full coverage
                key={layer.id}
                style={{
                  transform: `translate(${layerEffectiveTranslateX}px, ${layerEffectiveTranslateY}px)`,
                  zIndex: layer.zIndex, // Layer's own zIndex
                }}
              >
                {[...(layer.elements || [])] // Ensure elements array exists
                  .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)) // Sort elements by their zIndex
                  .map((element: EditorSVGElementData) => {
                    let currentRotation: number;
                    if (element.rotationAnimationType === 'spring') {
                      currentRotation = spring({
                        frame,
                        fps,
                        from: element.initialRotation,
                        to: element.finalRotation,
                        config: { stiffness: 100, damping: 15 }, // Example spring config
                      });
                    } else { // 'easing'
                      currentRotation = interpolate(
                        frame,
                        [0, durationInFrames -1 < 0 ? 0 : durationInFrames -1], // Ensure positive range
                        [element.initialRotation, element.finalRotation],
                        { easing: Easing.bezier(.42,0,.58,1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } // Example easing
                      );
                    }

                    const elementTransformOrigin = `${element.transformOriginX * 100}% ${element.transformOriginY * 100}%`;

                    return (
                      // Using a simple div now, styling inline
                      <div
                        key={element.id}
                        style={{
                          position: 'absolute',
                          left: '50%', // Start from center of layer
                          top: '50%',  // Start from center of layer
                          width: element.width,  // Intrinsic width
                          height: element.height, // Intrinsic height
                          opacity: element.opacity,
                          transformOrigin: elementTransformOrigin,
                          transform: `
                            translate(calc(-50% + ${element.x}px), calc(-50% + ${element.y}px))
                            scale(${element.scale})
                            rotate(${currentRotation}deg)
                          `,
                          zIndex: element.zIndex, // Element's zIndex within the layer
                        }}
                      >
                        <SVGViewer svgString={element.svgString} width="100%" height="100%" />
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
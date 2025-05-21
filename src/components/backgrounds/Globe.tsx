import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three'; // Ensure THREE is imported and passed
import { VantaEffect } from 'vanta';
// Import the specific effect you want to use: VANTA.GLOBE
import VANTA from 'vanta/dist/vanta.globe.min';

// Define the settings for your Vanta Globe and camera movement
const settings = {
    // === Vanta Globe Base Settings ===
    backgroundColor: 0x23153c,
    color: 0xff3f81,
    color2: 0xffffff,
    size: 1,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00,
    
    // === Camera Movement Settings ===
    // Base zoom level for the camera
    baseCameraZoom: 0.9, 
    // How far the camera moves back and forth (amplitude of zoom effect)
    cameraZoomAmplitude: 0.2, 
    // How fast the camera zooms (speed of zoom cycle)
    cameraZoomSpeed: 0.5, // Cycles per second

    // How far the camera orbits horizontally (amplitude of xOffset)
    cameraOrbitXAmplitude: 1, 
    // How fast the camera orbits horizontally
    cameraOrbitXSpeed: 0.2, // Cycles per second

    // How far the camera orbits vertically (amplitude of yOffset)
    cameraOrbitYAmplitude: 0.5, 
    // How fast the camera orbits vertically
    cameraOrbitYSpeed: 0.1, // Cycles per second

    // General multiplier for all camera animation speeds
    animationSpeedMultiplier: 1.0, 
};

// The VantaGlobe component for Remotion
export const VantaGlobe: React.FC<React.PropsWithChildren<{}>> = ({
    children,
}) => {
    // Destructure all relevant settings
    const { 
        backgroundColor, color, color2, size, scale, scaleMobile, minWidth, minHeight,
        baseCameraZoom, cameraZoomAmplitude, cameraZoomSpeed,
        cameraOrbitXAmplitude, cameraOrbitXSpeed,
        cameraOrbitYAmplitude, cameraOrbitYSpeed,
        animationSpeedMultiplier
    } = settings;
    
    const vantaRef = useRef(null);
    const vantaEffect = useRef<VantaEffect | null>(null);
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // === 1. Initialize VANTA Globe effect ===
    useEffect(() => {
        if (!vantaRef.current) return;

        // Destroy existing effect if any, before creating a new one
        if (vantaEffect.current) {
            vantaEffect.current.destroy();
        }

        // Create the VANTA.GLOBE effect
        vantaEffect.current = VANTA({
            el: vantaRef.current,
            THREE, // IMPORTANT: Pass the THREE.js library
            backgroundColor,
            color,
            color2,
            size,
            scale,
            scaleMobile,
            minWidth,
            minHeight,
            // For Remotion, these should generally be false as we control the camera
            mouseControls: false, 
            touchControls: false,
            gyroControls: false,
            // Initialize with base camera settings
            zoom: baseCameraZoom,
            xOffset: 0, // Start with no offset
            yOffset: 0, // Start with no offset
        });

        // Cleanup function: destroy the Vanta effect when the component unmounts
        return () => {
            if (vantaEffect.current) {
                vantaEffect.current.destroy();
            }
        };
    }, [
        backgroundColor, color, color2, size, scale, scaleMobile, minWidth, minHeight,
        baseCameraZoom // Re-initialize if base zoom changes
    ]);

    // === 2. Orchestrate periodic dynamic camera movement ===
    useEffect(() => {
        if (!vantaEffect.current) return;

        // Calculate time in seconds based on current frame and FPS
        const timeInSeconds = (frame / fps) * animationSpeedMultiplier;

        // Calculate dynamic camera properties using sine/cosine for smooth, periodic motion
        const newZoom = baseCameraZoom + Math.sin(timeInSeconds * Math.PI * 2 * cameraZoomSpeed) * cameraZoomAmplitude;
        const newXOffset = Math.sin(timeInSeconds * Math.PI * 2 * cameraOrbitXSpeed) * cameraOrbitXAmplitude;
        const newYOffset = Math.cos(timeInSeconds * Math.PI * 2 * cameraOrbitYSpeed) * cameraOrbitYAmplitude; // Using cos for vertical for a different phase

        // Update Vanta's internal camera options
        // This is how you dynamically control Vanta effects after initialization
        vantaEffect.current.setOptions({
            zoom: newZoom,
            xOffset: newXOffset,
            yOffset: newYOffset,
        });

    }, [
        frame, fps, // Depend on frame and fps to re-run on every frame
        animationSpeedMultiplier, baseCameraZoom, cameraZoomAmplitude, cameraZoomSpeed,
        cameraOrbitXAmplitude, cameraOrbitXSpeed, cameraOrbitYAmplitude, cameraOrbitYSpeed,
        vantaEffect.current // Ensure we have the effect instance
    ]);

    return (
        <div
            ref={vantaRef}
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: 0, // Background element
                // Important for Remotion: Ensure the div fills the space
                // and correctly positions the Vanta canvas.
            }}
        >
            {children}
        </div>
    );
};
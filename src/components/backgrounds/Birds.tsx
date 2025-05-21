import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three'; // IMPORTANT: THREE is required by Vanta
import { VantaEffect } from 'vanta'; // For type hinting. This pulls types from the 'vanta' package.

// Import the specific Birds effect function directly as a default export.
// We'll give it a clear name like 'VantaBirdsEffect'.
// This assumes 'vanta.birds.min.js' follows the same default export pattern as 'vanta.cells.min.js'.
import VantaBirdsEffect from 'vanta/dist/vanta.birds.min'; 

const settings = {
    // Vanta Birds specific configurations
    backgroundColor: 0x7192f, 
    backgroundAlpha: 1,
    color1: 0xff0000,
    color2: 0xd1ff, 
    colorMode: 'varianceGradient',
    quantity: 2,
    birdSize: 1.3,
    wingSpan: 30, 
    speedLimit: 5,
    separation: 69,
    alignment: 48,
    cohesion: 20,

    // Common Vanta settings
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00, 

    // For Remotion, disable interactive controls
    mouseControls: false,
    touchControls: false,
    gyroControls: false,
};

// The VantaBird component for Remotion
export const VantaBird: React.FC<React.PropsWithChildren<{}>> = ({
    children,
}) => {
    const vantaRef = useRef(null);
    const vantaEffect = useRef<VantaEffect | null>(null);

    useEffect(() => {
        if (!vantaRef.current) return;

        // Destroy any existing Vanta effect before creating a new one
        if (vantaEffect.current) {
            vantaEffect.current.destroy();
        }

        // Add a safety check for the imported effect function
        if (typeof VantaBirdsEffect !== 'function') {
            console.error(
                "VantaBirdsEffect is not a function. " +
                "This usually means the import path is wrong, " +
                "or the Vanta dist file doesn't provide a default export of the effect constructor."
            );
            return; // Prevent attempting to call something that isn't a function
        }

        try {
            // Create the VANTA effect by calling the imported function directly
            vantaEffect.current = VantaBirdsEffect({
                el: vantaRef.current,
                THREE: THREE, // Explicitly pass the imported THREE.js library
                ...settings, // Spread all configurations from the settings object
            });
        } catch (e) {
            console.error("[vanta.js] birds init error:", e);
            // This is the error you're currently seeing.
            // It might be a WebGL2 specific issue or a deeper problem with the Vanta build.
        }

        // Cleanup: Destroy the Vanta effect when the component unmounts
        return () => {
            if (vantaEffect.current) {
                vantaEffect.current.destroy();
            }
        };
    }, []); // Empty dependency array means this runs once on mount

    // Removed the Remotion frame update useEffect.
    // As observed, Vanta's internal animation loop runs continuously
    // and was not being controlled by Remotion frames in your original working example.

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
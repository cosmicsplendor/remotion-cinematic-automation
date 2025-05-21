import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three'; // Ensure THREE is imported and passed
import { VantaEffect } from '../../../lib/@types/vanta';
// Import the specific effect you want to use: VANTA.GLOBE

import VANTA from '../../../lib/backgrounds/vanta.globe.min.js';

// Define the settings for your Vanta Globe and camera movement
const settings = {
    // === Vanta Globe Base Settings ===
    backgroundColor: 0x111111,
    color: 0xc0392b,
    color2: 0xffffff,
    size: 1,
    minHeight: 200.00,
    minWidth: 200.00,
    scale: 1.00,
    scaleMobile: 1.00,
};
const VantaPalette = {
    // Primary background color (Vanta Globe backgroundColor)
    BACKGROUND_DEEP_PURPLE: '#23153c',

    // Main accent color (Vanta Globe 'color')
    ACCENT_PINK_MAGENTA_HEX: '#ff3f81', // RGB: 255, 63, 129
    ACCENT_PINK_MAGENTA_RGBA: 'rgba(255, 63, 129, 1)',

    // Secondary accent / grid lines (Vanta Globe 'color2')
    WHITE_PURE: '#ffffff', // RGB: 255, 255, 255
    WHITE_RGBA_FULL: 'rgba(255, 255, 255, 1)',
};


// Recommended UI Element Colors & Themes
export const CardColors = {
    // --- Card Elements ---

    // Color for inactive/general card titles (e.g., "मे ७, २०२५ को रात")
    cardTitleInactive: VantaPalette.WHITE_PURE,

    // Color for active/highlighted card titles (e.g., "आक्रमण र हत्या")
    cardTitleActive: VantaPalette.ACCENT_PINK_MAGENTA_HEX,

    // Color for dates/sub-text within cards (slightly softer white for hierarchy)
    cardDate: 'rgba(255, 255, 255, 0.7)', // Slightly transparent white

    // Background for the main information cards
    // Semi-transparent white to allow Vanta background to subtly show through,
    // creating depth. Pair with `backdropFilter: 'blur(5px)'` for a frosted glass effect.
    cardBg: 'rgba(255, 255, 255, 0.15)', // Light, semi-transparent white
    cardBorder: 'rgba(255, 255, 255, 0.3)', // Subtle light border for definition

    // Dynamic glow color for the card (use with `box-shadow` and `interpolate` for pulsing effect)
    // The opacity will be dynamic, but the base color is this accent.
    cardGlow: {
        color: VantaPalette.ACCENT_PINK_MAGENTA_RGBA,
        // Example usage in CSS: `box-shadow: 0 0 40px 30px rgba(255, 63, 129, [dynamic_opacity])`
        // The [dynamic_opacity] will be calculated via `interpolate` from `useCurrentFrame`
    },

    // --- Timeline Elements ---

    // Color for the main timeline line
    timeline: VantaPalette.ACCENT_PINK_MAGENTA_HEX,

    // Color for the timeline dots/nodes
    dot: VantaPalette.ACCENT_PINK_MAGENTA_HEX,
    // Optional dot glow (subtler than card glow)
    dotGlow: 'rgba(255, 63, 129, 0.4)', // Slightly transparent accent color for a subtle glow

    // --- Image Glow (Optional, apply as a border or subtle shadow around the image) ---

    // A subtle glow around the image within the card, using the accent color.
    // This helps tie the image visually into the glowing theme.
    imageGlow: {
        color: VantaPalette.ACCENT_PINK_MAGENTA_RGBA,
        // Example usage in CSS: `box-shadow: 0 0 15px rgba(255, 63, 129, 0.5)`
        // Or for a border: `border: 2px solid rgba(255, 63, 129, 0.7)`
    },

    // --- General UI Elements (e.g., top-left text box) ---
    generalBgTransparent: 'rgba(255, 255, 255, 0.1)', // Slightly more transparent than cardBg
    generalBorderTransparent: 'rgba(255, 255, 255, 0.2)', // Subtle border
    generalText: VantaPalette.WHITE_PURE, // For main text in these elements
};

// The VantaGlobe component for Remotion
export const VantaGlobe: React.FC<React.PropsWithChildren<{}>> = ({
    children,
}) => {
    // Destructure all relevant settings
    const {
        backgroundColor, color, color2, size, scale, scaleMobile, minWidth, minHeight,
    } = settings;

    const vantaRef = useRef<HTMLDivElement>(null);
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
        });


        // Cleanup function: destroy the Vanta effect when the component unmounts
        return () => {
            if (vantaEffect.current) {
                vantaEffect.current.destroy();
            }
        };
    }, [
        backgroundColor, color, color2, size, scale, scaleMobile, minWidth, minHeight,
    ]);

    // === 2. Frame-by-frame animation control ===
    useEffect(() => {
        if (!vantaEffect.current) return;

        // Force synchronization with Remotion's frame cycle
        requestAnimationFrame(() => {
            const exactTime = frame / fps;
            vantaEffect.current?.animationLoop(exactTime);
        });

        // Ensure clean render state
        return () => {
            vantaEffect.current?.renderer?.clear();
        };
    }, [frame, fps]);
    return (
        <div
            ref={vantaRef}
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                zIndex: 0, // Background element
                // Prevent default canvas clearing
                willChange: 'transform',
            }}
        >
            {children}
        </div>
    );
};


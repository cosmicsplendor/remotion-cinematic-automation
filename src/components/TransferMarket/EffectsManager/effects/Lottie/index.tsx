import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useVideoConfig } from "remotion";
import { getGlobalBBox } from "../../../../../../lib/d3/utils/math";
import lottie, { AnimationItem } from "lottie-web"; // Import lottie-web for animation playback
import anims from "./anims/index"
import { LottieEffect, sanitizeName } from "../../../../../components/TransferMarket/helpers";

interface LottieEffectProps {
    effect: LottieEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: LottieEffect) => void;
}

// --- Lottie Container Size Parameters ---
const LOTTIE_CONTAINER_WIDTH = 150;  // Width of the foreignObject container for Lottie
const LOTTIE_CONTAINER_HEIGHT = 150; // Height of the foreignObject container for Lottie

const LOTTIE_OFFSET_X = 20;          // Gap between target and Lottie container's left edge

// --- Fade Parameters ---
const FADE_IN_DURATION_SEC: number = 0.2;
const FADE_OUT_DURATION_SEC: number = 0.3;

function isAnimationKey(key: string, anims: object): key is keyof typeof anims {
    return key in anims;
}

const LottieEffect: React.FC<LottieEffectProps> = ({
    effect,
    getSvgEl,
    svgRef,
    frame,
    removeEffect,
}) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();

    const groupRef = useRef<SVGGElement | null>(null);
    const foreignObjectRef = useRef<SVGForeignObjectElement | null>(null);
    const lottieContainerRef = useRef<HTMLDivElement | null>(null); // Ref for the div inside foreignObject where Lottie renders
    const lottieInstanceRef = useRef<AnimationItem | null>(null); // Ref for the Lottie animation instance

    const groupId = useMemo(() => `lottie-effect-${sanitizeName(effect.target)}`, [effect.target]);

    const targetElement = useMemo(() => {
        const targetElId = `points-${sanitizeName(effect.target)}`;
        return getSvgEl(targetElId);
    }, [getSvgEl, effect.target, sanitizeName]);

    // LottieEffect setup: Set initial frame and cleanup
    useEffect(() => {
        setFrame0(frame);

        return () => {
            // Clean up Lottie instance first to prevent memory leaks
            if (lottieInstanceRef.current) {
                lottieInstanceRef.current.destroy();
                lottieInstanceRef.current = null;
            }
            // Then remove the SVG group from the DOM
            if (groupRef.current && svgRef.current) {
                svgRef.current.removeChild(groupRef.current);
            }
            // Clear refs
            groupRef.current = null;
            foreignObjectRef.current = null;
            lottieContainerRef.current = null;
        };
    }, []); // Runs once on mount and cleans up on unmount

    // SVG foreignObject and Lottie initialization
    useEffect(() => {
        if (!svgRef.current) return;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", groupId);

        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        // Set fixed width and height for the foreignObject
        foreignObject.setAttribute("width", LOTTIE_CONTAINER_WIDTH.toString());
        foreignObject.setAttribute("height", LOTTIE_CONTAINER_HEIGHT.toString());
        foreignObjectRef.current = foreignObject;

        // Inside foreignObject, we need an HTML div for Lottie to render into
        const lottieDiv = document.createElement("div");
        lottieDiv.style.width = "100%"; // Ensure div fills the foreignObject
        lottieDiv.style.height = "100%";
        lottieContainerRef.current = lottieDiv;

        foreignObject.appendChild(lottieDiv);
        group.appendChild(foreignObject);
        svgRef.current.appendChild(group);

        groupRef.current = group;

        // Initialize Lottie once the div is in the DOM tree
        if (lottieContainerRef.current && isAnimationKey(effect.anim, anims)) {
            lottieInstanceRef.current = lottie.loadAnimation({
                container: lottieContainerRef.current, // The DOM element where Lottie renders
                renderer: 'svg',     // Important: Lottie will render its own SVG content here
                loop: false,         // We control playback manually
                autoplay: false,     // We control playback manually
                animationData: anims[effect.anim] as any  // Path to your Lottie animation JSON file
            });
        }

    }, [svgRef, groupId]); // Dependencies for creating SVG elements and initializing Lottie

    // Animation loop (positioning, Lottie frame control, fading)
    useEffect(() => {
        if (frame0 === null || !groupRef.current || !svgRef.current || !lottieInstanceRef.current) {
            return;
        }

        const lottieInstance = lottieInstanceRef.current;
        const currentTime = (frame - frame0) / fps;

        // --- LottieEffect Duration Check ---
        if (currentTime > effect.duration && effect.duration >= 0) {
            removeEffect(effect);
            return;
        }

        // --- Target Element Check ---
        if (!targetElement) {
            // Hide the effect if the target element disappears
            groupRef.current.setAttribute("opacity", "0");
            lottieInstance.pause(); // Pause Lottie animation
            return;
        }

        const targetBox = getGlobalBBox(targetElement as SVGGraphicsElement);

        // --- Positioning ---
        // Place the left edge of the Lottie container to the right of the target element.
        const translateX = targetBox.x + targetBox.width + LOTTIE_OFFSET_X;
        // Vertically center the Lottie container with the target element.
        const translateY = targetBox.y + targetBox.height / 2 - LOTTIE_CONTAINER_HEIGHT / 2;

        // --- Lottie Animation Frame Control ---
        // Calculate progress from 0 to 1 over the effect's duration
        const lottieProgress = effect.duration > 0 ? Math.min(1, currentTime / effect.duration) : 0;
        // Map progress to Lottie's total frames
        const lottieFrame = lottieProgress * lottieInstance.totalFrames;

        // Go to the calculated Lottie frame and stop (do not play automatically)
        lottieInstance.goToAndStop(lottieFrame, true); // `true` indicates `lottieFrame` is a frame number, not a time

        // --- Opacity (Fade In/Out) ---
        let opacity = 1.0;
        // Fade In
        let fadeInProgress = 1.0;
        if (FADE_IN_DURATION_SEC > 0 && currentTime < FADE_IN_DURATION_SEC) {
            fadeInProgress = currentTime / FADE_IN_DURATION_SEC;
        } else if (FADE_IN_DURATION_SEC === 0 && currentTime < 0) {
            fadeInProgress = 0;
        }

        // Fade Out
        let fadeOutProgress = 1.0;
        if (effect.duration >= 0 && FADE_OUT_DURATION_SEC > 0 && currentTime > effect.duration - FADE_OUT_DURATION_SEC) {
            fadeOutProgress = Math.max(0, (effect.duration - currentTime) / FADE_OUT_DURATION_SEC);
        } else if (effect.duration >= 0 && FADE_OUT_DURATION_SEC === 0 && currentTime >= effect.duration) {
            fadeOutProgress = 0;
        }

        opacity = Math.max(0, Math.min(fadeInProgress, fadeOutProgress));

        // Apply transformations and style to the parent group
        groupRef.current.setAttribute("transform", `translate(${translateX}, ${translateY})`);
        groupRef.current.setAttribute("opacity", opacity.toString());

    }, [
        frame,
        frame0,
        fps,
        targetElement,
        removeEffect,
        effect.duration, // Re-run if effect.duration changes (though typically it's static)
    ]);

    return <></>; // This component renders nothing directly, it manipulates the SVG DOM
};

// Export the component
export default LottieEffect;
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useVideoConfig } from "remotion";
import { getGlobalBBox } from "../../../../../lib/d3/utils/math"; 
import { FocusEffect, sanitizeName } from "../../helpers"; // Assuming FocusEffect type is defined in helpers

interface FocusEffectProps {
    effect: FocusEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: FocusEffect) => void;
}

// --- Focus Parameters ---
const FOCUS_MARGIN = 20; // Additional margin around the bar for the focus area
const OVERLAY_OPACITY = 0.6; // Opacity of the dark overlay (0 = transparent, 1 = opaque)

// --- Fade Parameters ---
const FADE_IN_DURATION_SEC: number = 0.3;
const FADE_OUT_DURATION_SEC: number = 0.3;

const FocusEffectComponent: React.FC<FocusEffectProps> = ({
    effect,
    getSvgEl,
    svgRef,
    frame,
    removeEffect,
}) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps, width: viewportWidth, height: viewportHeight } = useVideoConfig();
    
    const groupRef = useRef<SVGGElement | null>(null);
    const groupId = useMemo(() => `focus-effect-${sanitizeName(effect.target)}`, [effect.target]);
    
    const targetElement = useMemo(() => {
        const targetElId = `bar-${sanitizeName(effect.target)}`;
        return getSvgEl(targetElId);
    }, [getSvgEl, effect.target]);

    // Effect setup: Set initial frame and cleanup
    useEffect(() => {
        setFrame0(frame);

        return () => {
            if (groupRef.current && svgRef.current) {
                svgRef.current.removeChild(groupRef.current);
            }
            groupRef.current = null;
        };
    }, []); // Runs once on mount and cleans up on unmount

    // SVG element creation
    useEffect(() => {
        if (!svgRef.current) return;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", groupId);
        
        // Create top overlay rectangle (covers area above focus)
        const topRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        topRect.setAttribute("x", "0");
        topRect.setAttribute("y", "0");
        topRect.setAttribute("width", viewportWidth.toString());
        topRect.setAttribute("fill", "black");
        topRect.setAttribute("opacity", OVERLAY_OPACITY.toString());
        
        // Create bottom overlay rectangle (covers area below focus)
        const bottomRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bottomRect.setAttribute("x", "0");
        bottomRect.setAttribute("width", viewportWidth.toString());
        bottomRect.setAttribute("fill", "black");
        bottomRect.setAttribute("opacity", OVERLAY_OPACITY.toString());
        
        group.appendChild(topRect);
        group.appendChild(bottomRect);
        svgRef.current.appendChild(group);
        
        groupRef.current = group;

    }, [svgRef, groupId, viewportWidth]); // Dependencies for creating SVG overlay

    // Animation loop
    useEffect(() => {
        if (frame0 === null || !groupRef.current || !svgRef.current) {
            return;
        }

        if (!targetElement) {
            // Hide overlay if target disappears mid-effect
            groupRef.current.setAttribute("opacity", "0");
            return;
        }

        const currentTime = (frame - frame0) / fps;

        if (currentTime > effect.duration && effect.duration >= 0) {
            removeEffect(effect);
            return;
        }
        
        const targetBox = getGlobalBBox(targetElement as SVGGraphicsElement);
        
        // --- Calculate Focus Area ---
        const focusTop = targetBox.y - FOCUS_MARGIN;
        const focusBottom = targetBox.y + targetBox.height + FOCUS_MARGIN;
        
        // --- Update Overlay Rectangles ---
        const topRect = groupRef.current.children[0] as SVGRectElement;
        const bottomRect = groupRef.current.children[1] as SVGRectElement;
        
        // Top overlay: from viewport top to focus area top
        topRect.setAttribute("height", Math.max(0, focusTop).toString());
        
        // Bottom overlay: from focus area bottom to viewport bottom
        bottomRect.setAttribute("y", focusBottom.toString());
        bottomRect.setAttribute("height", Math.max(0, viewportHeight - focusBottom).toString());

        // --- Opacity (Fade In/Out) ---
        let opacity = 1.0;
        let fadeInProgress = 1.0;
        if (FADE_IN_DURATION_SEC > 0 && currentTime < FADE_IN_DURATION_SEC) {
            fadeInProgress = currentTime / FADE_IN_DURATION_SEC;
        } else if (FADE_IN_DURATION_SEC === 0 && currentTime < 0) { 
             fadeInProgress = 0;
        }

        let fadeOutProgress = 1.0;
        if (effect.duration >= 0 && FADE_OUT_DURATION_SEC > 0 && currentTime > effect.duration - FADE_OUT_DURATION_SEC) {
            fadeOutProgress = Math.max(0, (effect.duration - currentTime) / FADE_OUT_DURATION_SEC);
        } else if (effect.duration >= 0 && FADE_OUT_DURATION_SEC === 0 && currentTime >= effect.duration) {
            fadeOutProgress = 0;
        }
        
        opacity = Math.max(0, Math.min(fadeInProgress, fadeOutProgress));

        // Apply opacity to the entire group
        groupRef.current.setAttribute("opacity", opacity.toString());

    }, [
        frame, 
        frame0, 
        fps, 
        targetElement, 
        removeEffect,
        effect.duration,
        viewportHeight
    ]);

    return <></>;
};

export default FocusEffectComponent;
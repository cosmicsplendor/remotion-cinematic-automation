import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useVideoConfig } from "remotion";
import { getGlobalBBox } from "../../../../../lib/d3/utils/math"; 
import { ArrowEffect, sanitizeName } from "../../helpers"; // Assuming ArrowEffect type and sanitizeName are defined in helpers

interface ArrowEffectProps {
    effect: ArrowEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: ArrowEffect) => void;
}

// --- Arrow Shape & Size Parameters (Increased Size) ---
const ARROW_HEAD_WIDTH = 40;     // Width of the arrowhead part
const ARROW_HEAD_HEIGHT = 64;    // Full height of the arrowhead at its base
const ARROW_SHAFT_LENGTH = 30;   // Length of the arrow's shaft
const ARROW_SHAFT_WIDTH = 36;    // Thickness of the arrow's shaft

const ARROW_OFFSET_X = 24;       // Gap between target and arrow tip (adjusted for larger arrow)

// --- Pulsation Parameters (Horizontal Translation) ---
const PULSE_FREQUENCY = 1.5;     // Pulsations per second (Hz)
const PULSE_TRANSLATE_X_AMPLITUDE = 8; // Max pixels the arrow will shift leftward during pulse

// --- Fade Parameters ---
const FADE_IN_DURATION_SEC: number = 0.2;
const FADE_OUT_DURATION_SEC: number = 0.3;

const ArrowEffectComponent: React.FC<ArrowEffectProps> = ({ // Renamed component to avoid conflict if ArrowEffect is also a type
    effect,
    getSvgEl,
    svgRef,
    frame,
    removeEffect,
}) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();
    
    const groupRef = useRef<SVGGElement | null>(null);
    // Use effect.id for a more unique group ID if available and preferred,
    // otherwise sanitizeName(effect.target) is also fine.
    const groupId = useMemo(() => `arrow-effect-${sanitizeName(effect.target)}`, [effect.target]);
    
    const targetElement = useMemo(() => {
        const targetElId = `points-${sanitizeName(effect.target)}`;
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
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        // Path for a "proper" arrow pointing left.
        // (0,0) of the path is at the center of the shaft's rightmost edge.
        const pathD = `M 0 ${-ARROW_SHAFT_WIDTH / 2} ` + // 1. Shaft top-right
                      `L ${-ARROW_SHAFT_LENGTH} ${-ARROW_SHAFT_WIDTH / 2} ` + // 2. Shaft top-left
                      `L ${-ARROW_SHAFT_LENGTH} ${-ARROW_HEAD_HEIGHT / 2} ` + // 3. Arrowhead base, outer top
                      `L ${-(ARROW_SHAFT_LENGTH + ARROW_HEAD_WIDTH)} 0 ` +    // 4. Arrow tip
                      `L ${-ARROW_SHAFT_LENGTH} ${ARROW_HEAD_HEIGHT / 2} ` +  // 5. Arrowhead base, outer bottom
                      `L ${-ARROW_SHAFT_LENGTH} ${ARROW_SHAFT_WIDTH / 2} ` +   // 6. Shaft bottom-left
                      `L 0 ${ARROW_SHAFT_WIDTH / 2} ` +                       // 7. Shaft bottom-right
                      `Z`; // Close path
        path.setAttribute("d", pathD);
        path.setAttribute("fill", effect.color);
        
        group.appendChild(path);
        svgRef.current.appendChild(group);
        
        groupRef.current = group;

    }, [svgRef, effect.color, groupId]); // Dependencies for creating/updating SVG arrow

    // Animation loop
    useEffect(() => {
        if (frame0 === null || !groupRef.current || !svgRef.current) {
            return;
        }

        if (!targetElement) {
            // Optionally hide or handle if target disappears mid-effect
            groupRef.current.setAttribute("opacity", "0");
            return;
        }

        const currentTime = (frame - frame0) / fps;

        if (currentTime > effect.duration && effect.duration >= 0) {
            removeEffect(effect);
            return;
        }
        
        const targetBox = getGlobalBBox(targetElement as SVGGraphicsElement);

        // --- Positioning ---
        // anchorX is where the arrow *tip* should be horizontally at rest.
        const anchorX = targetBox.x + targetBox.width + ARROW_OFFSET_X;
        // The arrow path's tip is at local x = -(ARROW_SHAFT_LENGTH + ARROW_HEAD_WIDTH).
        // So, the group's origin (0,0) needs to be translated to:
        const baseTranslateX = anchorX + (ARROW_SHAFT_LENGTH + ARROW_HEAD_WIDTH);
        const translateY = targetBox.y + targetBox.height / 2;

        // --- Pulsation (Horizontal Translation) ---
        // sin wave from -1 to 1. Phase shift (-Math.PI / 2) makes it start at -1 (min value).
        const pulseCycle = Math.sin(PULSE_FREQUENCY * 2 * Math.PI * currentTime - Math.PI / 2);
        // pulseShift goes from 0 (no shift) to PULSE_TRANSLATE_X_AMPLITUDE (max leftward shift)
        const pulseShift = PULSE_TRANSLATE_X_AMPLITUDE * (0.5 + 0.5 * pulseCycle);
        
        const finalTranslateX = baseTranslateX - pulseShift; // Subtract to move the arrow leftward

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

        // Apply transformations and style
        // No scaling pulsation, so scale is constant 1.0
        groupRef.current.setAttribute("transform", `translate(${finalTranslateX}, ${translateY}) scale(1)`);
        groupRef.current.setAttribute("opacity", opacity.toString());

    }, [
        frame, 
        frame0, 
        fps, 
        targetElement, 
        removeEffect, 
        // svgRef, // svgRef.current is stable, not svgRef object itself usually. Fine to omit if not causing issues.
    ]);

    return <></>;
};

// Export with the name you prefer, e.g., ArrowEffect if that's your convention for components
export default ArrowEffectComponent; 
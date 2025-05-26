/**
 * I have a confetti effect that displays bursts of confettis. Following the similar lifecycle and timing paterns (synced to remotion timeline via frame), I want a simpler effect component. Call it arrow component. effect in this case should have these params: { target: string, color: hex_string, duration: number }. Cannot use raf or css anims, has to be manually controlled. The arrow show point leftward, and pulaste kind of like in gta games. the actual target svg element this time is right-center of text element with id points-${target}. Come up with params for duration, amplitude and easing (maybe sine) that feels good.
 */
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useVideoConfig } from "remotion";
import { getGlobalBBox } from "../../../../../lib/d3/utils/math"; 
import { ArrowEffect, sanitizeName } from "../../helpers";

interface ArrowEffectProps {
    effect: ArrowEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: ArrowEffect) => void; // Or your generic Effect type
}

const ARROW_WIDTH = 20;     // Visual width of the arrow
const ARROW_HEIGHT = 14;    // Visual height of the arrow's base
const ARROW_OFFSET_X = 10;  // Gap between target and arrow tip

const PULSE_BASE_SCALE = 1.0;   // Default scale
const PULSE_AMPLITUDE = 0.20;   // Pulsation magnitude (e.g., 0.2 means 20% bigger/smaller)
const PULSE_FREQUENCY = 1.5;    // Pulsations per second (Hz)

const FADE_IN_DURATION_SEC: number = 0.2;  // Fade-in time in seconds
const FADE_OUT_DURATION_SEC: number = 0.3; // Fade-out time in seconds

const ArrowEffect: React.FC<ArrowEffectProps> = ({
    effect,
    getSvgEl,
    svgRef,
    frame,
    removeEffect,
}) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();
    
    const groupRef = useRef<SVGGElement | null>(null);
    const groupId = useMemo(() => `arrow-effect-${sanitizeName(effect.target)}`, [effect.target]);
    
    const targetElement = useMemo(() => {
        const targetElId = `points-${sanitizeName(effect.target)}`;
        return getSvgEl(targetElId);
    }, [getSvgEl, effect.target]);

    useEffect(() => {
        setFrame0(frame);

        return () => {
            if (groupRef.current && svgRef.current) {
                svgRef.current.removeChild(groupRef.current);
            }
            groupRef.current = null;
        };
    }, [])
    useEffect(() => {
        if (!svgRef.current) return;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", groupId);
        
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M 0 ${-ARROW_HEIGHT / 2} L ${-ARROW_WIDTH} 0 L 0 ${ARROW_HEIGHT / 2} Z`);
        path.setAttribute("fill", effect.color);
        
        group.appendChild(path);
        svgRef.current.appendChild(group);
        
        groupRef.current = group;

    }, [svgRef, effect.color, groupId]); // `frame` ensures frame0 is set correctly

    useEffect(() => {
        if (frame0 === null || !groupRef.current || !svgRef.current || !targetElement) {
            return;
        }
        const currentTime = (frame - frame0) / fps;
        if (currentTime > effect.duration && effect.duration >= 0) { // duration >= 0 for effects that might last "forever" if duration is negative.
            removeEffect(effect);
            return;
        }
        
        const targetBox = getGlobalBBox(targetElement as SVGGraphicsElement);

        // The tip will be ARROW_WIDTH to the left of this, before scaling.
        const posX = targetBox.x + targetBox.width + ARROW_OFFSET_X + ARROW_WIDTH;
        const posY = targetBox.y + targetBox.height / 2;

        // --- Pulsation ---
        const pulseCycleTime = 2 * Math.PI * PULSE_FREQUENCY * currentTime;
        const scale = PULSE_BASE_SCALE + PULSE_AMPLITUDE * Math.sin(pulseCycleTime);

        // --- Opacity (Fade In/Out) ---
        let opacity = 1.0;
        let fadeInProgress = 1.0;
        if (FADE_IN_DURATION_SEC > 0 && currentTime < FADE_IN_DURATION_SEC) {
            fadeInProgress = currentTime / FADE_IN_DURATION_SEC;
        } else if (FADE_IN_DURATION_SEC === 0 && currentTime < 0) { 
            // Handles edge case if currentTime could be negative briefly & no fade-in.
             fadeInProgress = 0;
        }


        let fadeOutProgress = 1.0;
        // Only apply fade out if effect has a positive duration
        if (effect.duration >=0 && FADE_OUT_DURATION_SEC > 0 && currentTime > effect.duration - FADE_OUT_DURATION_SEC) {
            fadeOutProgress = (effect.duration - currentTime) / FADE_OUT_DURATION_SEC;
        } else if (effect.duration >=0 && FADE_OUT_DURATION_SEC === 0 && currentTime >= effect.duration) {
            // Instant fade out if duration is 0 and effect is at/past its end time
            fadeOutProgress = 0;
        }
        
        opacity = Math.max(0, Math.min(fadeInProgress, fadeOutProgress));


        // Apply transformations and style
        groupRef.current.setAttribute("transform", `translate(${posX}, ${posY}) scale(${scale})`);
        groupRef.current.setAttribute("opacity", opacity.toString());

    }, [
        frame, 
        frame0, 
        fps, 
        targetElement, 
        removeEffect, 
        svgRef, // svgRef itself as dep for getGlobalBBox if its impl uses it
    ]);

    return <></>; // Renders SVG imperatively into svgRef
};

export default ArrowEffect;
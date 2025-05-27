import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useVideoConfig } from "remotion";
import { getGlobalBBox } from "../../../../../lib/d3/utils/math"; 
import { ChangeEffect, sanitizeName } from "../../helpers"; // Assuming sanitizeName is defined in helpers

interface ChangeEffectProps {
    effect: ChangeEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: ChangeEffect) => void;
    getValue: () => number; // Function to get current numeric value
}

// --- Triangle & Text Parameters ---
const TRIANGLE_SIZE = 12;        // Size of the triangle (equilateral)
const TEXT_OFFSET_X = 8;         // Gap between text and triangle
const ELEMENT_OFFSET_X = 20;     // Gap between target and indicator
const FONT_SIZE = 14;
const FONT_FAMILY = "Arial, sans-serif";

// --- Colors ---
const COLOR_UP = "#00C851";      // Green for positive change
const COLOR_DOWN = "#FF4444";    // Red for negative change

// --- Oscillation Parameters ---
const OSCILLATION_FREQUENCY = 2.0; // Oscillations per second (Hz)
const MIN_OPACITY = 0.6;
const MAX_OPACITY = 1.0;

// --- Fade Parameters ---
const FADE_IN_DURATION_SEC: number = 0.2;
const FADE_OUT_DURATION_SEC: number = 0.3;

const ChangeEffect: React.FC<ChangeEffectProps> = ({
    effect,
    getSvgEl,
    svgRef,
    frame,
    removeEffect,
    getValue,
}) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const [previousValue, setPreviousValue] = useState<number | null>(null);
    const { fps } = useVideoConfig();
    
    const groupRef = useRef<SVGGElement | null>(null);
    const triangleRef = useRef<SVGPolygonElement | null>(null);
    const textRef = useRef<SVGTextElement | null>(null);
    
    const groupId = useMemo(() => `percent-change-effect-${sanitizeName(effect.target)}`, [effect.target]);
    
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
            triangleRef.current = null;
            textRef.current = null;
        };
    }, []); // Runs once on mount and cleans up on unmount

    // SVG element creation
    useEffect(() => {
        if (!svgRef.current) return;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", groupId);
        
        // Create triangle (initially pointing up)
        const triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        // Equilateral triangle pointing up, centered at origin
        const height = (TRIANGLE_SIZE * Math.sqrt(3)) / 2;
        const upTrianglePoints = `0,${-height/2} ${-TRIANGLE_SIZE/2},${height/2} ${TRIANGLE_SIZE/2},${height/2}`;
        triangle.setAttribute("points", upTrianglePoints);
        triangle.setAttribute("fill", COLOR_UP);
        
        // Create text element
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("font-family", FONT_FAMILY);
        text.setAttribute("font-size", FONT_SIZE.toString());
        text.setAttribute("font-weight", "bold");
        text.setAttribute("text-anchor", "end"); // Right-align text to triangle
        text.setAttribute("dominant-baseline", "central");
        text.setAttribute("fill", COLOR_UP);
        text.textContent = "0.00%";
        
        group.appendChild(text);
        group.appendChild(triangle);
        svgRef.current.appendChild(group);
        
        groupRef.current = group;
        triangleRef.current = triangle;
        textRef.current = text;

    }, [svgRef, groupId]);

    // Animation loop
    useEffect(() => {
        if (frame0 === null || !groupRef.current || !svgRef.current || !triangleRef.current || !textRef.current) {
            return;
        }

        if (!targetElement) {
            // Hide if target disappears mid-effect
            groupRef.current.setAttribute("opacity", "0");
            return;
        }

        const currentTime = (frame - frame0) / fps;

        if (currentTime > effect.duration && effect.duration >= 0) {
            removeEffect(effect);
            return;
        }
        
        const currentValue = getValue();
        
        // Calculate percent change
        let percentChange = 0;
        let isPositive = true;
        
        if (previousValue !== null && previousValue !== 0) {
            percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
            isPositive = percentChange >= 0;
        }
        
        // Update previous value for next frame
        setPreviousValue(currentValue);
        
        // Skip display for first frame if no previous value
        if (previousValue === null) {
            groupRef.current.setAttribute("opacity", "0");
            return;
        }

        const targetBox = getGlobalBBox(targetElement as SVGGraphicsElement);

        // --- Positioning ---
        const baseTranslateX = targetBox.x - ELEMENT_OFFSET_X;
        const translateY = targetBox.y + targetBox.height / 2;

        // --- Update triangle shape and color ---
        const height = (TRIANGLE_SIZE * Math.sqrt(3)) / 2;
        const color = isPositive ? COLOR_UP : COLOR_DOWN;
        
        if (isPositive) {
            // Up triangle
            const upTrianglePoints = `0,${-height/2} ${-TRIANGLE_SIZE/2},${height/2} ${TRIANGLE_SIZE/2},${height/2}`;
            triangleRef.current.setAttribute("points", upTrianglePoints);
        } else {
            // Down triangle (inverted)
            const downTrianglePoints = `0,${height/2} ${-TRIANGLE_SIZE/2},${-height/2} ${TRIANGLE_SIZE/2},${-height/2}`;
            triangleRef.current.setAttribute("points", downTrianglePoints);
        }
        
        triangleRef.current.setAttribute("fill", color);
        
        // --- Update text ---
        const percentText = `${isPositive ? '+' : ''}${percentChange.toFixed(2)}%`;
        textRef.current.textContent = percentText;
        textRef.current.setAttribute("fill", color);
        
        // Position text to the left of triangle
        textRef.current.setAttribute("x", (-TEXT_OFFSET_X).toString());
        textRef.current.setAttribute("y", "0");

        // --- Opacity Oscillation ---
        const oscillationCycle = Math.sin(OSCILLATION_FREQUENCY * 2 * Math.PI * currentTime);
        const oscillatingOpacity = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * (0.5 + 0.5 * oscillationCycle);

        // --- Fade In/Out ---
        let fadeInProgress = 1.0;
        if (FADE_IN_DURATION_SEC > 0 && currentTime < FADE_IN_DURATION_SEC) {
            fadeInProgress = currentTime / FADE_IN_DURATION_SEC;
        }

        let fadeOutProgress = 1.0;
        if (effect.duration >= 0 && FADE_OUT_DURATION_SEC > 0 && currentTime > effect.duration - FADE_OUT_DURATION_SEC) {
            fadeOutProgress = Math.max(0, (effect.duration - currentTime) / FADE_OUT_DURATION_SEC);
        }
        
        const finalOpacity = Math.max(0, Math.min(fadeInProgress, fadeOutProgress)) * oscillatingOpacity;

        // Apply transformations and style
        groupRef.current.setAttribute("transform", `translate(${baseTranslateX}, ${translateY})`);
        groupRef.current.setAttribute("opacity", finalOpacity.toString());

    }, [
        frame, 
        frame0, 
        fps, 
        targetElement, 
        removeEffect,
        getValue,
        previousValue
    ]);

    return <></>;
};

export default ChangeEffect;
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useVideoConfig } from "remotion";
import { getGlobalBBox } from "../../../../../lib/d3/utils/math";
import { ChangeEffect as ChangeEffectType, Datum, sanitizeName } from "../../helpers"; // Renamed import to avoid conflict

interface ChangeEffectProps {
    effect: ChangeEffectType;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: ChangeEffectType) => void;
    getValue: (progress: number) => number; // Function to get current percentage change value (e.g., 10 for +10%)
    prevData: Datum[],
    progress: number
}

// --- Triangle & Text Parameters ---
const TRIANGLE_SIZE = 22;
const TEXT_OFFSET_X = 24;
const ELEMENT_OFFSET_X = 20;
const FONT_SIZE = 24;
const FONT_FAMILY = "monospace";

// --- Colors ---
const COLOR_UP = "#00C851";
const COLOR_DOWN = "#FF4444";

// --- Oscillation Parameters ---
const OSCILLATION_FREQUENCY = 2.0;
const MIN_OPACITY = 0.6;
const MAX_OPACITY = 1.0;

// --- Fade Parameters ---
const FADE_IN_DURATION_SEC: number = 0.2;
const FADE_OUT_DURATION_SEC: number = 0.3;

const ChangeEffectDisplay: React.FC<ChangeEffectProps> = ({ // Renamed component to avoid conflict with type
    effect,
    getSvgEl,
    svgRef,
    frame,
    removeEffect,
    getValue,
    prevData,
    progress
}) => {
    const [frame0] = useState<number | null>(frame);
    // No longer need previousValue state
    const accPercentChangeRef = useRef<number>(0); // Store previous percentage changes if needed, but not used in this effect

    const { fps } = useVideoConfig();
    const groupRef = useRef<SVGGElement | null>(null);
    const triangleRef = useRef<SVGPolygonElement | null>(null);
    const textRef = useRef<SVGTextElement | null>(null);

    const groupId = useMemo(() => `percent-change-effect-${sanitizeName(effect.target)}`, [effect.target]);

    const targetElement = useMemo(() => {
        const targetElId = `points-${sanitizeName(effect.target)}`;
        return getSvgEl(targetElId);
    }, [getSvgEl, effect.target]);

    useEffect(() => {
        accPercentChangeRef.current += getValue(1)
    }, [prevData])
    // Effect setup: Set initial frame and cleanup
    useEffect(() => {
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

        const triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const height = (TRIANGLE_SIZE * Math.sqrt(3)) / 2;
        const upTrianglePoints = `0,${-height / 2} ${-TRIANGLE_SIZE / 2},${height / 2} ${TRIANGLE_SIZE / 2},${height / 2}`;
        triangle.setAttribute("points", upTrianglePoints);
        triangle.setAttribute("fill", COLOR_UP); // Default color

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("font-family", FONT_FAMILY);
        text.setAttribute("font-size", FONT_SIZE.toString());
        text.setAttribute("font-weight", "bold");
        text.setAttribute("text-anchor", "end");
        text.setAttribute("dominant-baseline", "central");
        text.setAttribute("fill", COLOR_UP); // Default color
        text.textContent = "+0.00%"; // Default text

        group.appendChild(text);
        group.appendChild(triangle);
        svgRef.current.appendChild(group);

        groupRef.current = group;
        triangleRef.current = triangle;
        textRef.current = text;

    }, [svgRef, groupId]); // Runs when svgRef or groupId changes

    // Animation loop
    useEffect(() => {
        if (frame0 === null || !groupRef.current || !svgRef.current || !triangleRef.current || !textRef.current) {
            return;
        }

        if (!targetElement) {
            groupRef.current.setAttribute("opacity", "0"); // Hide if target is gone
            return;
        }

        const currentTime = (frame - frame0) / fps;

        if (effect.duration >= 0 && currentTime > effect.duration) {
            removeEffect(effect);
            return;
        }
        const curPercentChange = getValue(progress)
        const percentChange = curPercentChange + accPercentChangeRef.current
        // getValue() now directly returns the percentage change
        const isPositive = percentChange >= 0;

        const targetBox = getGlobalBBox(targetElement as SVGGraphicsElement);

        // --- Update triangle shape and color ---
        const triangleHeight = (TRIANGLE_SIZE * Math.sqrt(3)) / 2;
        const color = isPositive ? COLOR_UP : COLOR_DOWN;

        if (isPositive) {
            const upTrianglePoints = `0,${-triangleHeight / 2} ${-TRIANGLE_SIZE / 2},${triangleHeight / 2} ${TRIANGLE_SIZE / 2},${triangleHeight / 2}`;
            triangleRef.current.setAttribute("points", upTrianglePoints);
        } else {
            const downTrianglePoints = `0,${triangleHeight / 2} ${-TRIANGLE_SIZE / 2},${-triangleHeight / 2} ${TRIANGLE_SIZE / 2},${-triangleHeight / 2}`;
            triangleRef.current.setAttribute("points", downTrianglePoints);
        }
        triangleRef.current.setAttribute("fill", color);

        // --- Update text ---
        let percentText: string;
        if (percentChange === Infinity) {
            percentText = "+Inf%";
        } else if (percentChange === -Infinity) {
            percentText = "-Inf%";
        } else if (isNaN(percentChange)) {
            percentText = "N/A"; // Or handle as 0% or hide
        } else {
            percentText = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%`;
        }
        textRef.current.textContent = percentText;
        textRef.current.setAttribute("fill", color);

        // Position text to the left of triangle (relative to group origin)
        textRef.current.setAttribute("x", (-TEXT_OFFSET_X).toString());
        textRef.current.setAttribute("y", "0");

        // --- Positioning ---
        const actualTextWidth = textRef.current.getBBox().width;
        const groupTranslateX = targetBox.x + targetBox.width +
            ELEMENT_OFFSET_X +
            actualTextWidth +
            TEXT_OFFSET_X;
        const groupTranslateY = targetBox.y + targetBox.height / 2;

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

        groupRef.current.setAttribute("transform", `translate(${groupTranslateX}, ${groupTranslateY})`);
        groupRef.current.setAttribute("opacity", finalOpacity.toString());

    }, [
        frame,
        frame0,
        fps,
        effect,
        targetElement,
        removeEffect,
        // previousValue is removed
    ]);

    return <></>; // The component renders SVG elements imperatively
};

export default ChangeEffectDisplay; // Export with the new name
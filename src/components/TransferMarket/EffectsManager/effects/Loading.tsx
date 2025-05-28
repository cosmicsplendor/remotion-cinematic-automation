import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { LoadingEffect, sanitizeName } from "../../helpers";
import { easingFns, getGlobalBBox } from "../../../../../lib/d3/utils/math";
import { useVideoConfig } from "remotion";

// Colors inspired by the Duolingo streak screenshot.
const LOADING_BAR_COLOR_START = '#F79D00'; // Darker orange for the start of the gradient
const LOADING_BAR_COLOR_END = '#FFCE00';   // Brighter yellow for the end of the gradient
const STAR_COLOR = '#FFFFFF'; // White for the star itself
const STAR_GLOW_COLOR = '#ffffff'; // Gold/Yellow for the star's glow

const STAR_SIZE_FACTOR = 0.65; // Star size relative to target bar height (e.g., 50% of bar height)
const GLOW_OSCILLATION_RANGE = [8, 18]; // Min and max stdDeviation for glow blur
const GLOW_OSCILLATION_SPEED = Math.PI * 2; // Speed of glow pulsation (1 cycle per second)
const BORDER_RADIUS_FACTOR = 0; // To make ends fully rounded (50% of height)
const POSITION_PADDING = 1; // Pixels to extend bounds for better alignment

// Helper to generate curved rhombus path with inward-curving sides
const getCurvedRhombusPath = (cx: number, cy: number, width: number, height: number): string => {
    const hw = width / 2;
    const hh = height / 2;

    // For inward curves, we need control points that pull the sides inward
    const curveDepth = Math.min(hw, hh) * 0.3; // How much to curve inward

    return `M ${cx},${cy - hh} 
            Q ${cx + hw - curveDepth},${cy} ${cx + hw},${cy}
            Q ${cx + hw - curveDepth},${cy} ${cx},${cy + hh}
            Q ${cx - hw + curveDepth},${cy} ${cx - hw},${cy}
            Q ${cx - hw + curveDepth},${cy} ${cx},${cy - hh} Z`;
};

// --- Component Definition ---
const LoadingEffect: React.FC<{
    effect: LoadingEffect; // Use the base LoadingEffect interface as LoadingEffectData extends it
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: LoadingEffect) => void
}> = ({ effect, getSvgEl, svgRef, frame, removeEffect }) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();

    // Refs for the SVG elements we will create and manipulate
    const groupElRef = useRef<SVGGElement | null>(null);
    const loadingRectRef = useRef<SVGRectElement | null>(null);
    const starPathRef = useRef<SVGPathElement | null>(null);
    const trailLineRef = useRef<SVGLineElement | null>(null);
    const defsCreatedRef = useRef<boolean>(false); // To ensure SVG defs are created only once

    // Memoize target name and group ID for stability
    const target = useMemo(() => sanitizeName(effect.target), [effect.target]);
    const groupId = useMemo(() => `loading-group-${target}`, [target]);
    // Memoize the target SVG element (e.g., the bar it's loading over)
    const targetEl = useMemo(() => getSvgEl(`bar-${target}`), [getSvgEl, target]);

    // --- SVG Definitions Creation ---
    // This function creates the necessary <defs> for gradients and filters.
    const createDefs = (svg: SVGSVGElement) => {
        if (defsCreatedRef.current) return; // Prevent recreation

        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            svg.appendChild(defs);
        }

        // 1. Glow filter for the star
        // This filter blurs the white star and then tints the blurred result to the glow color.
        if (!defs.querySelector('#loading-star-glow-filter')) {
            const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
            filter.setAttribute('id', 'loading-star-glow-filter');
            filter.setAttribute('x', '-50%'); // Expand filter area to catch all glow
            filter.setAttribute('y', '-50%');
            filter.setAttribute('width', '200%');
            filter.setAttribute('height', '200%');

            // Blur the SourceGraphic (the star)
            const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
            feGaussianBlur.setAttribute('in', 'SourceGraphic');
            feGaussianBlur.setAttribute('stdDeviation', GLOW_OSCILLATION_RANGE[0].toString()); // Initial blur value
            feGaussianBlur.setAttribute('result', 'blurredStar');

            // Convert hex color to RGB components for feColorMatrix
            const hexToRgb = (hex: string) => {
                const r = parseInt(hex.substring(1, 3), 16) / 255;
                const g = parseInt(hex.substring(3, 5), 16) / 255;
                const b = parseInt(hex.substring(5, 7), 16) / 255;
                return { r, g, b };
            };
            const glowRgb = hexToRgb(STAR_GLOW_COLOR);

            // Apply a color matrix to tint the blurred image to the glow color
            // This matrix effectively maps the input R,G,B (from white star, approx 1,1,1)
            // to the target glow color R,G,B while preserving alpha.
            const feColorMatrix = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
            feColorMatrix.setAttribute('in', 'blurredStar');
            feColorMatrix.setAttribute('type', 'matrix');
            feColorMatrix.setAttribute('values',
                `${glowRgb.r} 0 0 0 0
                 0 ${glowRgb.g} 0 0 0
                 0 0 ${glowRgb.b} 0 0
                 0 0 0 1 0`
            );
            feColorMatrix.setAttribute('result', 'coloredGlow');

            // Merge the original source with the colored blur to create the final glow effect
            const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
            const feMergeNodeGlow = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNodeGlow.setAttribute('in', 'coloredGlow');
            const feMergeNodeSource = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNodeSource.setAttribute('in', 'SourceGraphic');
            feMerge.appendChild(feMergeNodeGlow);
            feMerge.appendChild(feMergeNodeSource);

            filter.append(feGaussianBlur, feColorMatrix, feMerge);
            defs.appendChild(filter);
        }

        // 2. Linear gradient for the loading bar trail
        if (!defs.querySelector('#loading-bar-gradient')) {
            const linearGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            linearGradient.setAttribute('id', 'loading-bar-gradient');
            linearGradient.setAttribute('x1', '0%');
            linearGradient.setAttribute('y1', '0%');
            linearGradient.setAttribute('x2', '100%'); // Gradient from left to right
            linearGradient.setAttribute('y2', '0%');

            const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', LOADING_BAR_COLOR_START);
            const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', LOADING_BAR_COLOR_END);

            linearGradient.append(stop1, stop2);
            defs.appendChild(linearGradient);
        }

        // 3. Motion blur filter for the trail line
        if (!defs.querySelector('#trail-line-gradient')) {
            const trailGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            trailGradient.setAttribute('id', 'trail-line-gradient');
            trailGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
            trailGradient.setAttribute('x1', '0%');
            trailGradient.setAttribute('y1', '0%');
            trailGradient.setAttribute('x2', '100%');
            trailGradient.setAttribute('y2', '0%');

            const stop0 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop0.setAttribute('offset', '0%');
            stop0.setAttribute('stop-color', LOADING_BAR_COLOR_END);
            stop0.setAttribute('stop-opacity', '0');

            const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop1.setAttribute('offset', '50%');
            stop1.setAttribute('stop-color', '#FFFFFF');
            stop1.setAttribute('stop-opacity', '1');

            const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop2.setAttribute('offset', '100%');
            stop2.setAttribute('stop-color', '#FFFFFF');
            stop2.setAttribute('stop-opacity', '1');

            trailGradient.append(stop0, stop1, stop2);
            defs.appendChild(trailGradient);
        }

        defsCreatedRef.current = true;
    };

    useEffect(() => {
        setFrame0(frame);
        return () => {
            if (groupElRef.current && svgRef.current) {
                // Remove the entire effect group from the SVG on unmount
                svgRef.current.removeChild(groupElRef.current);
            }
        };
    }, []);

    // Creates the SVG group, the loading rectangle, the star path, and the trail line.
    useEffect(() => {
        if (!svgRef.current) return;

        // Create SVG definitions (filters, gradients) if they don't exist
        createDefs(svgRef.current);

        // Create a group element to hold all parts of the loading effect
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute('id', groupId);
        svgRef.current.appendChild(group);
        groupElRef.current = group; // Store reference to the group

        // Create the loading bar rectangle
        const loadingRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        loadingRect.setAttribute('fill', 'url(#loading-bar-gradient)'); // Apply the gradient
        loadingRect.setAttribute('opacity', '0'); // Start hidden, fade in
        group.appendChild(loadingRect);
        loadingRectRef.current = loadingRect; // Store reference

        // Create the trail line (appears behind the star)
        const trailLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        trailLine.setAttribute('stroke', 'url(#trail-line-gradient)');
        trailLine.setAttribute('stroke-width', '10'); // Make it thicker to be more visible
        trailLine.setAttribute('opacity', '0'); // Start hidden
        trailLine.setAttribute('stroke-linecap', 'round'); // Rounded line ends
        group.appendChild(trailLine);
        trailLineRef.current = trailLine;

        // Create the star shape (curved rhombus using path)
        const starPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        starPath.setAttribute('fill', STAR_COLOR); // White star color
        starPath.setAttribute('filter', 'url(#loading-star-glow-filter)'); // Apply the glow filter
        starPath.setAttribute('opacity', '0'); // Start hidden, fade in
        group.appendChild(starPath);
        starPathRef.current = starPath; // Store reference

    }, [svgRef.current, groupId]); // Re-run if SVG ref or group ID changes

    // Updates the position, size, and appearance of the loading bar, star, and trail every frame.
    useEffect(() => {
        // Ensure all necessary elements and data are available
        setTimeout(() => {
            if (!groupElRef.current || !targetEl || frame0 === null || !loadingRectRef.current || !starPathRef.current || !trailLineRef.current) {
                return;
            }

            // Calculate elapsed time (t) in seconds
            const t = (frame - frame0) / fps;

            // Remove the effect if its duration is over
            if (t > effect.duration) {
                removeEffect(effect);
                return;
            }

            // Get the bounding box of the target SVG element (the black bar)
            const targetBox = getGlobalBBox(targetEl as SVGGraphicsElement);

            // Calculate animation progress with easing for smoother start/end
            const progress = easingFns.sineInOut(t / effect.duration);

            // --- Animate Loading Bar ---
            const currentWidth = targetBox.width * progress;
            // Fade in the loading bar, star, and trail during the initial phase
            const currentOpacity = Math.min(1, progress * 2); // Fades in over the first 50% of duration
            const borderRadius = targetBox.height * BORDER_RADIUS_FACTOR; // Dynamic rounding based on height

            // Apply position padding for better alignment during movement
            loadingRectRef.current.setAttribute('x', (targetBox.x - POSITION_PADDING).toString());
            loadingRectRef.current.setAttribute('y', (targetBox.y - POSITION_PADDING).toString());
            loadingRectRef.current.setAttribute('width', (currentWidth + POSITION_PADDING * 2).toString());
            loadingRectRef.current.setAttribute('height', (targetBox.height + POSITION_PADDING * 2).toString());
            loadingRectRef.current.setAttribute('rx', borderRadius.toString()); // Apply rounded corners
            loadingRectRef.current.setAttribute('ry', borderRadius.toString());
            loadingRectRef.current.setAttribute('opacity', currentOpacity.toString());

            // --- Animate Star ---
            // The star is positioned at the leading edge of the loading bar
            const starX = targetBox.x + currentWidth;
            const starY = targetBox.y + targetBox.height / 2; // Vertically centered on the bar
            const starWidth = targetBox.height * STAR_SIZE_FACTOR;
            const starHeight = targetBox.height * STAR_SIZE_FACTOR;

            starPathRef.current.setAttribute('d', getCurvedRhombusPath(starX, starY, starWidth, starHeight));
            starPathRef.current.setAttribute('opacity', currentOpacity.toString());

            // --- Animate Trail Line ---
            const trailLength = Math.min(currentWidth * 0.4, 100); // Longer trail (40% of progress or max 30px)
            const trailOpacity = currentOpacity * 0.3; // More visible trail

            // Only show trail if there's meaningful progress
            if (currentWidth > 10) {
                console.log("HERE")
                trailLineRef.current.setAttribute('x1', (starX - trailLength).toString());
                trailLineRef.current.setAttribute('y1', starY.toString());
                trailLineRef.current.setAttribute('x2', starX.toString());
                trailLineRef.current.setAttribute('y2', starY.toString());
                trailLineRef.current.setAttribute('opacity', trailOpacity.toString());
            } else {
                trailLineRef.current.setAttribute('opacity', '0');
            }

            // --- Animate Star Glow Oscillation ---
            const glowFilter = svgRef.current?.querySelector('#loading-star-glow-filter') as SVGFilterElement;
            if (glowFilter) {
                // Find the feGaussianBlur element within the filter
                const feGaussianBlur = glowFilter.querySelector('feGaussianBlur') as SVGFEGaussianBlurElement;
                if (feGaussianBlur) {
                    // Calculate oscillating stdDeviation using sine wave
                    const glowAmplitude = (GLOW_OSCILLATION_RANGE[1] - GLOW_OSCILLATION_RANGE[0]) / 2;
                    const glowOffset = GLOW_OSCILLATION_RANGE[0] + glowAmplitude;
                    const stdDeviation = glowOffset + glowAmplitude * Math.sin(t * GLOW_OSCILLATION_SPEED);
                    feGaussianBlur.setAttribute('stdDeviation', stdDeviation.toString());
                }
            }
        })

    }, [targetEl, frame, frame0, fps, effect.duration, removeEffect]); // Dependencies for useEffect

    return null;
};

export default LoadingEffect;
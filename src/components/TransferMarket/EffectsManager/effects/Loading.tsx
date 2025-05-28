import { RefObject, useEffect, useMemo, useRef, useState } from "react";
// Assuming LoadingEffect interface might be defined in "../../helpers"
// For clarity, let's define/augment it for the new 'reverse' flag.
// Original import: import { LoadingEffect, sanitizeName } from "../../helpers";
import { sanitizeName, LoadingEffect } from "../../helpers"; // Keep this
import { easingFns, getGlobalBBox } from "../../../../../lib/d3/utils/math";
import { useVideoConfig } from "remotion";

// Colors inspired by the Duolingo streak screenshot.
const LOADING_BAR_COLOR_START = '#F79D00';
const LOADING_BAR_COLOR_END = '#FFCE00';
const STAR_COLOR = '#FFFFFF';
const STAR_GLOW_COLOR = '#ffffff';

const STAR_SIZE_FACTOR = 0.65;
const GLOW_OSCILLATION_RANGE = [8, 18];
const GLOW_OSCILLATION_SPEED = Math.PI * 2;
const BORDER_RADIUS_FACTOR = 0;
const POSITION_PADDING = 1;

// Fade durations for fade-in and fade-out
const FADE_DURATION_SECONDS = 0.5; // Features 2 & 3: "a bit longer duration"

const getCurvedRhombusPath = (cx: number, cy: number, width: number, height: number): string => {
    const hw = width / 2;
    const hh = height / 2;
    const curveDepth = Math.min(hw, hh) * 0.3;
    return `M ${cx},${cy - hh} 
            Q ${cx + hw - curveDepth},${cy} ${cx + hw},${cy}
            Q ${cx + hw - curveDepth},${cy} ${cx},${cy + hh}
            Q ${cx - hw + curveDepth},${cy} ${cx - hw},${cy}
            Q ${cx - hw + curveDepth},${cy} ${cx},${cy - hh} Z`;
};

// Renamed component to LoadingEffectComponent to avoid potential naming conflict
// if LoadingEffect is also used as a type name for data.
const LoadingEffectComponent: React.FC<{
    effect: LoadingEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: LoadingEffect) => void
}> = ({ effect, getSvgEl, svgRef, frame, removeEffect }) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();

    // State for managing fade-out
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [fadeOutStartFrame, setFadeOutStartFrame] = useState<number | null>(null);

    const groupElRef = useRef<SVGGElement | null>(null);
    const loadingRectRef = useRef<SVGRectElement | null>(null);
    const starPathRef = useRef<SVGPathElement | null>(null);
    const trailLineRef = useRef<SVGLineElement | null>(null);
    const defsCreatedRef = useRef<boolean>(false);

    const target = useMemo(() => sanitizeName(effect.target), [effect.target]);
    const groupId = useMemo(() => `loading-group-${target}`, [target]);
    const targetEl = useMemo(() => getSvgEl(`bar-${target}`), [getSvgEl, target]);

    const createDefs = (svg: SVGSVGElement) => {
        if (defsCreatedRef.current) return;
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            svg.appendChild(defs);
        }

        if (!defs.querySelector('#loading-star-glow-filter')) {
            const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
            filter.setAttribute('id', 'loading-star-glow-filter');
            filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-50%');
            filter.setAttribute('width', '200%'); filter.setAttribute('height', '200%');
            const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
            feGaussianBlur.setAttribute('in', 'SourceGraphic');
            feGaussianBlur.setAttribute('stdDeviation', GLOW_OSCILLATION_RANGE[0].toString());
            feGaussianBlur.setAttribute('result', 'blurredStar');
            const hexToRgb = (hex: string) => {
                const r = parseInt(hex.substring(1, 3), 16) / 255;
                const g = parseInt(hex.substring(3, 5), 16) / 255;
                const b = parseInt(hex.substring(5, 7), 16) / 255;
                return { r, g, b };
            };
            const glowRgb = hexToRgb(STAR_GLOW_COLOR);
            const feColorMatrix = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
            feColorMatrix.setAttribute('in', 'blurredStar');
            feColorMatrix.setAttribute('type', 'matrix');
            feColorMatrix.setAttribute('values',
                `${glowRgb.r} 0 0 0 0 0 ${glowRgb.g} 0 0 0 0 0 ${glowRgb.b} 0 0 0 0 0 1 0`
            );
            feColorMatrix.setAttribute('result', 'coloredGlow');
            const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
            const feMergeNodeGlow = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNodeGlow.setAttribute('in', 'coloredGlow');
            const feMergeNodeSource = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
            feMergeNodeSource.setAttribute('in', 'SourceGraphic');
            feMerge.append(feMergeNodeGlow, feMergeNodeSource);
            filter.append(feGaussianBlur, feColorMatrix, feMerge);
            defs.appendChild(filter);
        }

        if (!defs.querySelector('#loading-bar-gradient')) {
            const linearGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            linearGradient.setAttribute('id', 'loading-bar-gradient');
            linearGradient.setAttribute('x1', '0%'); linearGradient.setAttribute('y1', '0%');
            linearGradient.setAttribute('x2', '100%'); linearGradient.setAttribute('y2', '0%');
            const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', LOADING_BAR_COLOR_START);
            const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', LOADING_BAR_COLOR_END);
            linearGradient.append(stop1, stop2);
            defs.appendChild(linearGradient);
        }

        if (!defs.querySelector('#trail-line-gradient')) {
            const trailGradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            trailGradient.setAttribute('id', 'trail-line-gradient');
            trailGradient.setAttribute('gradientUnits', 'userSpaceOnUse');
            trailGradient.setAttribute('x1', '0%'); trailGradient.setAttribute('y1', '0%');
            trailGradient.setAttribute('x2', '100%'); trailGradient.setAttribute('y2', '0%');
            const stop0 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop0.setAttribute('offset', '0%'); stop0.setAttribute('stop-color', LOADING_BAR_COLOR_END);
            stop0.setAttribute('stop-opacity', '0');
            const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop1.setAttribute('offset', '50%'); stop1.setAttribute('stop-color', '#FFFFFF');
            stop1.setAttribute('stop-opacity', '1');
            const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#FFFFFF');
            stop2.setAttribute('stop-opacity', '1');
            trailGradient.append(stop0, stop1, stop2);
            defs.appendChild(trailGradient);
        }
        defsCreatedRef.current = true;
    };

    useEffect(() => {
        setFrame0(frame);
        return () => {
            if (groupElRef.current && svgRef.current && groupElRef.current.parentNode === svgRef.current) {
                svgRef.current.removeChild(groupElRef.current);
            }
        };
    }, []); // Intentionally minimal dependencies for setup/cleanup one-off

    useEffect(() => {
        if (!svgRef.current) return;
        createDefs(svgRef.current);

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute('id', groupId);
        svgRef.current.appendChild(group);
        groupElRef.current = group;

        const loadingRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        loadingRect.setAttribute('fill', 'url(#loading-bar-gradient)');
        loadingRect.setAttribute('opacity', '0'); // Start hidden, fade in controlled by animation loop
        group.appendChild(loadingRect);
        loadingRectRef.current = loadingRect;

        const trailLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        trailLine.setAttribute('stroke', 'url(#trail-line-gradient)');
        trailLine.setAttribute('stroke-width', '10'); // Original stroke width
        trailLine.setAttribute('opacity', '0');
        trailLine.setAttribute('stroke-linecap', 'round');
        group.appendChild(trailLine);
        trailLineRef.current = trailLine;

        const starPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        starPath.setAttribute('fill', STAR_COLOR);
        starPath.setAttribute('filter', 'url(#loading-star-glow-filter)');
        starPath.setAttribute('opacity', '0');
        group.appendChild(starPath);
        starPathRef.current = starPath;

    }, [svgRef, groupId]); // Re-run if SVG ref or group ID changes (groupId is memoized)

    useEffect(() => {
        const updateAnimation = () => {
            if (!groupElRef.current || !targetEl || frame0 === null || !loadingRectRef.current || !starPathRef.current || !trailLineRef.current || !svgRef.current) {
                return;
            }

            const FADE_DURATION_FRAMES = FADE_DURATION_SECONDS * fps;
            const elapsedFramesSinceMount = frame - frame0;
            const mainAnimationDurationFrames = effect.duration * fps;
            
            let currentOpacity = 1;
            let effectiveAnimFrame = elapsedFramesSinceMount;

            if (isFadingOut && fadeOutStartFrame !== null) {
                const fadeOutElapsedFrames = frame - fadeOutStartFrame;
                if (fadeOutElapsedFrames >= FADE_DURATION_FRAMES) {
                    removeEffect(effect);
                    return;
                }
                const fadeOutProgressRatio = Math.min(1, fadeOutElapsedFrames / FADE_DURATION_FRAMES);
                currentOpacity = 1 - easingFns.sineOut(fadeOutProgressRatio); // Feature 2: sineOut for fade out
                effectiveAnimFrame = mainAnimationDurationFrames; 
            } else {
                if (elapsedFramesSinceMount >= mainAnimationDurationFrames) {
                    if (!isFadingOut) { // Check to set states only once
                       setIsFadingOut(true);
                       setFadeOutStartFrame(frame);
                    }
                    // For the first frame of fade-out, opacity will be 1 (1 - sineOut(0))
                    // This is handled by the isFadingOut block in the next frame, or we can set it:
                    currentOpacity = 1 - easingFns.sineOut(0); // Opacity starts at 1 for fade-out
                    effectiveAnimFrame = mainAnimationDurationFrames;
                } else {
                    if (elapsedFramesSinceMount < FADE_DURATION_FRAMES) {
                        const fadeInProgressRatio = elapsedFramesSinceMount / FADE_DURATION_FRAMES;
                        currentOpacity = easingFns.sineIn(fadeInProgressRatio); // Feature 3: sineIn for fade in
                    } else {
                        currentOpacity = 1;
                    }
                }
            }

            const rawTimeRatio = Math.max(0, Math.min(1, effectiveAnimFrame / mainAnimationDurationFrames));
            const easedTimeRatio = easingFns.sineInOut(rawTimeRatio);

            const useReverse = effect.reverse || false; // Feature 1: Use reverse flag
            const animationCompletionRatio = useReverse ? (1 - easedTimeRatio) : easedTimeRatio;

            const targetBox = getGlobalBBox(targetEl as SVGGraphicsElement);
            if (!targetBox || targetBox.width === 0 || targetBox.height === 0) {
                // If target disappears or is invalid, hide elements gracefully
                if (loadingRectRef.current) loadingRectRef.current.setAttribute('opacity', '0');
                if (starPathRef.current) starPathRef.current.setAttribute('opacity', '0');
                if (trailLineRef.current) trailLineRef.current.setAttribute('opacity', '0');
                return;
            }

            const currentBarDisplayLength = targetBox.width * animationCompletionRatio;
            const borderRadius = targetBox.height * BORDER_RADIUS_FACTOR;

            loadingRectRef.current.setAttribute('x', (targetBox.x - POSITION_PADDING).toString());
            loadingRectRef.current.setAttribute('y', (targetBox.y - POSITION_PADDING).toString());
            loadingRectRef.current.setAttribute('width', Math.max(0, currentBarDisplayLength + POSITION_PADDING * 2).toString());
            loadingRectRef.current.setAttribute('height', (targetBox.height + POSITION_PADDING * 2).toString());
            loadingRectRef.current.setAttribute('rx', borderRadius.toString());
            loadingRectRef.current.setAttribute('ry', borderRadius.toString());
            loadingRectRef.current.setAttribute('opacity', currentOpacity.toString());

            const starPositionX = targetBox.x + currentBarDisplayLength;
            const starY = targetBox.y + targetBox.height / 2;
            const starWidth = targetBox.height * STAR_SIZE_FACTOR;
            const starHeight = targetBox.height * STAR_SIZE_FACTOR;

            starPathRef.current.setAttribute('d', getCurvedRhombusPath(starPositionX, starY, starWidth, starHeight));
            starPathRef.current.setAttribute('opacity', currentOpacity.toString());
            
            const trailLength = Math.min(currentBarDisplayLength * 0.4, 100); // Trail length based on visible bar
            const trailOpacityFactor = 0.3;
            const finalTrailOpacity = currentOpacity * trailOpacityFactor;

            if (trailLength > 1 && currentOpacity > 0.01) { // Original condition: currentWidth > 10
                let trailLineX1, trailLineX2;
                if (useReverse) { // Star moves R to L, trail to its right. Line from (starX + L) to starX for gradient.
                    trailLineX1 = (starPositionX + trailLength).toString();
                    trailLineX2 = starPositionX.toString();
                } else { // Star moves L to R, trail to its left. Line from (starX - L) to starX for gradient.
                    trailLineX1 = (starPositionX - trailLength).toString();
                    trailLineX2 = starPositionX.toString();
                }
                trailLineRef.current.setAttribute('x1', trailLineX1);
                trailLineRef.current.setAttribute('y1', starY.toString());
                trailLineRef.current.setAttribute('x2', trailLineX2);
                trailLineRef.current.setAttribute('y2', starY.toString());
                trailLineRef.current.setAttribute('stroke-width', '10'); // Keep original stroke width
                trailLineRef.current.setAttribute('opacity', finalTrailOpacity.toString());
            } else {
                trailLineRef.current.setAttribute('opacity', '0');
            }
            
            const glowFilter = svgRef.current?.querySelector('#loading-star-glow-filter') as SVGFilterElement;
            if (glowFilter) {
                const feGaussianBlur = glowFilter.querySelector('feGaussianBlur') as SVGFEGaussianBlurElement;
                if (feGaussianBlur) {
                    const t_glow = elapsedFramesSinceMount / fps;
                    const glowAmplitude = (GLOW_OSCILLATION_RANGE[1] - GLOW_OSCILLATION_RANGE[0]) / 2;
                    const glowOffset = GLOW_OSCILLATION_RANGE[0] + glowAmplitude;
                    const stdDeviation = glowOffset + glowAmplitude * Math.sin(t_glow * GLOW_OSCILLATION_SPEED);
                    feGaussianBlur.setAttribute('stdDeviation', stdDeviation.toString());
                }
            }
        };

        const timeoutId = setTimeout(updateAnimation, 0); // Preserving original setTimeout pattern
        return () => clearTimeout(timeoutId);

    }, [
        targetEl, frame, frame0, fps, 
        effect.duration, effect.reverse, // Added effect.reverse to dependencies
        removeEffect, svgRef, 
        isFadingOut, fadeOutStartFrame // State dependencies for re-evaluation
    ]);

    return null;
};

export default LoadingEffectComponent;
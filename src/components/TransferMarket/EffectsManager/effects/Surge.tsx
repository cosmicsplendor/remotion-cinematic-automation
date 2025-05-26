import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { SurgeEffect, Effect, sanitizeName } from "../../helpers";
import { distributeEventStartTimes, getGlobalBBox, seededRand } from "../../../../../lib/d3/utils/math";
import { useVideoConfig } from "remotion";

const BURST_LIFESPAN = 1.25; // Duration of each individual burst
const GLOW_COLOR = '#fff'; // Cyan-blue glow
const GLOW_INTENSITY = 1.0; // Full intensity for bright glow
const SPARK_COUNT = 8; // Number of sparks per frame
const SPARK_LIFESPAN = 0.3; // How long sparks live
const SPARK_SPEED_RANGE = [40, 80]; // Spark velocity range
const SPARK_SIZE_RANGE = [1, 3]; // Spark size range

interface SparkData {
    x: number;
    y: number;
    vx: number; // velocity x
    vy: number; // velocity y
    size: number;
    birthTime: number;
    color: string;
    burstStartTime: number; // Track which burst this spark belongs to
}

// Easing function for smooth in-out sine
const easeInOutSine = (t: number): number => {
    return -(Math.cos(Math.PI * t) - 1) / 2;
};

const Effect: React.FC<{
    effect: SurgeEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: Effect) => void
}> = ({ effect, getSvgEl, svgRef, frame, removeEffect }) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();
    const groupElRef = useRef<SVGElement | null>(null);
    const glowRectRef = useRef<SVGRectElement | null>(null);
    const sparksRef = useRef<SVGCircleElement[]>([]);
    const sparkDataRef = useRef<SparkData[]>([]);
    const defsCreatedRef = useRef<boolean>(false);
    const burstStartTimesRef = useRef<number[]>([]);
    const activeBurstsRef = useRef<Set<number>>(new Set());
    
    const target = useMemo(() => sanitizeName(effect.target), [effect]);
    const groupId = useMemo(() => `surge-group-${target}`, [target]);
    const targetEl = useMemo(() => getSvgEl(`bar-${target}`), [getSvgEl, target]);

    // Create SVG definitions for glow effect
    const createGlowDefs = (svg: SVGSVGElement) => {
        if (defsCreatedRef.current) return;
        
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
            svg.appendChild(defs);
        }

        // Check if our filter already exists
        if (defs.querySelector('#surge-glow-filter')) {
            defsCreatedRef.current = true;
            return;
        }

        // Create glow filter with better transparency
        const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute('id', 'surge-glow-filter');
        filter.setAttribute('x', '-100%');
        filter.setAttribute('y', '-50%');
        filter.setAttribute('width', '300%');
        filter.setAttribute('height', '200%');

        // Gaussian blur for glow
        const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
        feGaussianBlur.setAttribute('stdDeviation', '4');
        feGaussianBlur.setAttribute('result', 'coloredBlur');

        // Merge with original for layered glow effect
        const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
        const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        feMergeNode2.setAttribute('in', 'coloredBlur');
        const feMergeNode3 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
        feMergeNode3.setAttribute('in', 'SourceGraphic');

        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        feMerge.appendChild(feMergeNode3);
        filter.appendChild(feGaussianBlur);
        filter.appendChild(feMerge);
        defs.appendChild(filter);

        defsCreatedRef.current = true;
    };

    useEffect(() => {
        setFrame0(frame);
        return () => {
            if (groupElRef.current && svgRef.current) {
                svgRef.current.removeChild(groupElRef.current);
            }
            sparksRef.current = [];
            sparkDataRef.current = [];
            activeBurstsRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;
        
        createGlowDefs(svgRef.current);
        
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute('id', groupId);
        svgRef.current.appendChild(group);
        groupElRef.current = group;

        // Calculate burst start times
        const burstStartTimes = distributeEventStartTimes(effect.duration, BURST_LIFESPAN, effect.bursts, effect.dist ?? "space-around");
        burstStartTimesRef.current = burstStartTimes;

        // Create the main glow rectangle - bright and glowing
        const glowRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        glowRect.setAttribute('fill', GLOW_COLOR);
        glowRect.setAttribute('filter', 'url(#surge-glow-filter)');
        glowRect.setAttribute('opacity', '0');
        group.appendChild(glowRect);
        glowRectRef.current = glowRect;

    }, [svgRef.current, groupId, effect.duration, effect.bursts]);

    useEffect(() => {
        if (!groupElRef.current || !targetEl || frame0 === null || !glowRectRef.current) return;
        
        const t = (frame - frame0) / fps;
        
        if (t > effect.duration + BURST_LIFESPAN) {
            removeEffect(effect);
            return;
        }
        
        const targetBox = getGlobalBBox(targetEl as SVGGraphicsElement);
        
        // Check which bursts are currently active
        const currentActiveBursts = new Set<number>();
        burstStartTimesRef.current.forEach((startTime, index) => {
            const burstAge = t - startTime;
            if (burstAge >= 0 && burstAge <= BURST_LIFESPAN) {
                currentActiveBursts.add(index);
            }
        });
        
        // Show glow if any burst is active
        const hasActiveBurst = currentActiveBursts.size > 0;
        
        if (hasActiveBurst) {
            // Find the most prominent active burst for glow positioning
            let dominantBurstProgress = 0;
            let maxIntensity = 0;
            
            currentActiveBursts.forEach(burstIndex => {
                const startTime = burstStartTimesRef.current[burstIndex];
                const burstAge = t - startTime;
                const burstProgress = burstAge / BURST_LIFESPAN;
                const easedProgress = easeInOutSine(burstProgress);
                
                // Calculate intensity (higher in middle of burst)
                let intensity = 1;
                if (burstProgress < 0.1) {
                    intensity = burstProgress / 0.1;
                } else if (burstProgress > 0.9) {
                    intensity = (1 - burstProgress) / 0.1;
                }
                
                if (intensity > maxIntensity) {
                    maxIntensity = intensity;
                    dominantBurstProgress = easedProgress;
                }
            });
            
            // Update glow rectangle based on dominant burst
            const glowWidth = 20;
            const glowX = targetBox.x + (targetBox.width - glowWidth) * dominantBurstProgress;
            
            glowRectRef.current.setAttribute('x', glowX.toString());
            glowRectRef.current.setAttribute('y', targetBox.y.toString());
            glowRectRef.current.setAttribute('width', glowWidth.toString());
            glowRectRef.current.setAttribute('height', targetBox.height.toString());
            glowRectRef.current.setAttribute('opacity', (GLOW_INTENSITY * maxIntensity).toString());
            
            // Generate sparks for active bursts
            currentActiveBursts.forEach(burstIndex => {
                const startTime = burstStartTimesRef.current[burstIndex];
                const burstAge = t - startTime;
                const burstProgress = burstAge / BURST_LIFESPAN;
                const easedProgress = easeInOutSine(burstProgress);
                
                const sparkCenterX = targetBox.x + (targetBox.width - 20) * easedProgress + 10; // Center of glow
                const sparkCenterY = targetBox.y + targetBox.height / 2;
                
                // Add new sparks for this burst
                for (let i = 0; i < SPARK_COUNT; i++) {
                    const spark = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    const sparkData: SparkData = {
                        x: sparkCenterX + seededRand(20, -20),
                        y: sparkCenterY + seededRand(targetBox.height / 2, -targetBox.height / 2),
                        vx: seededRand(SPARK_SPEED_RANGE[1], SPARK_SPEED_RANGE[0]) * (seededRand(1) > 0.5 ? 1 : -1),
                        vy: seededRand(SPARK_SPEED_RANGE[1], SPARK_SPEED_RANGE[0]) * (seededRand(1) > 0.5 ? 1 : -1),
                        size: seededRand(SPARK_SIZE_RANGE[1], SPARK_SIZE_RANGE[0]),
                        birthTime: t,
                        color: seededRand(1) > 0.7 ? '#FFD700' : GLOW_COLOR,
                        burstStartTime: startTime
                    };
                    
                    spark.setAttribute('fill', sparkData.color);
                    spark.setAttribute('r', sparkData.size.toString());
                    spark.setAttribute('cx', sparkData.x.toString());
                    spark.setAttribute('cy', sparkData.y.toString());
                    spark.setAttribute('opacity', '0.8');
                    
                    groupElRef.current?.appendChild(spark);
                    sparksRef.current.push(spark);
                    sparkDataRef.current.push(sparkData);
                }
            });
        } else {
            // No active bursts, hide glow
            glowRectRef.current.setAttribute('opacity', '0');
        }

        // Update existing sparks
        sparksRef.current.forEach((spark, index) => {
            const sparkData = sparkDataRef.current[index];
            const sparkAge = t - sparkData.birthTime;
            
            if (sparkAge > SPARK_LIFESPAN) {
                // Remove expired spark
                if (groupElRef.current && spark.parentNode) {
                    groupElRef.current.removeChild(spark);
                }
                sparksRef.current.splice(index, 1);
                sparkDataRef.current.splice(index, 1);
                return;
            }
            
            // Update spark position
            const newX = sparkData.x + sparkData.vx * sparkAge;
            const newY = sparkData.y + sparkData.vy * sparkAge;
            
            spark.setAttribute('cx', newX.toString());
            spark.setAttribute('cy', newY.toString());
            
            // Fade out spark
            const sparkProgress = sparkAge / SPARK_LIFESPAN;
            const sparkOpacity = 0.8 * (1 - sparkProgress);
            spark.setAttribute('opacity', sparkOpacity.toString());
            
            // Shrink spark
            const sparkSize = sparkData.size * (1 - sparkProgress * 0.5);
            spark.setAttribute('r', sparkSize.toString());
        });

    }, [targetEl, frame, frame0, fps, effect.duration, removeEffect]);

    return <></>;
};

export default Effect;
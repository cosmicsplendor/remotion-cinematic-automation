import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { ConfettiEffect, Effect, sanitizeName } from "../../helpers";
import { distributeEventStartTimes, getGlobalBBox, seededRand } from "../../../../../lib/d3/utils/math";
import { useVideoConfig } from "remotion";

const LIFESPAN = 1;
const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'];
const EXPLOSION_SPEED = 120; // pixels per second radial speed
const GRAVITY = 200; // pixels per second squared (downward acceleration)
const PARTICLE_SIZE_RANGE = [3, 8]; // min and max particle size
const FADE_DURATION = 0.4; // duration for fade out effect
const ROTATION_SPEED_RANGE = [180, 720]; // degrees per second rotation range

interface ParticleData {
    angle: number; // radial direction
    speed: number; // radial speed
    size: number;
    rotationSpeed: number; // degrees per second
    initialRotation: number; // starting rotation
    width: number;
    height: number;
    shape: 'rect' | 'circle';
}

const Effect: React.FC<{
    effect: ConfettiEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: Effect) => void
}> = ({ effect, getSvgEl, svgRef, frame, removeEffect }) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();
    const particlesRef = useRef<SVGGraphicsElement[]>([]);
    const particleDataRef = useRef<ParticleData[]>([]);
    const target = useMemo(() => sanitizeName(effect.target), [effect]);
    const groupId = useMemo(() => `confetti-group-${target}`, [target]);
    const targetEl = useMemo(() => getSvgEl(`logo-${target}`), [getSvgEl, target]);
    const groupElRef = useRef<SVGElement | null>(null);
    const burstStartTimesRef = useRef<number[]>([]);

    useEffect(() => {
        setFrame0(frame);
        return () => {
            if (groupElRef.current && svgRef.current) {
                svgRef.current.removeChild(groupElRef.current);
            }
            particlesRef.current = [];
            particleDataRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;
        
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute('id', groupId);
        svgRef.current.appendChild(group);
        groupElRef.current = group;
        
        const burstStartTimes = distributeEventStartTimes(effect.duration, LIFESPAN, effect.bursts, effect.dist ?? "space-around");
        burstStartTimesRef.current = burstStartTimes;

        burstStartTimes.forEach(startTime => {
            const numParticles = seededRand(30, 20);
            const offsetX = seededRand(8, -8);
            const offsetY = seededRand(-2, -12);
            
            for (let i = 0; i < numParticles; i++) {
                const isRect = seededRand(1) > 0.2;
                const particle = document.createElementNS("http://www.w3.org/2000/svg", isRect ? "rect" : "circle");
                
                particle.setAttribute("offset-x", offsetX.toString());
                particle.setAttribute("offset-y", offsetY.toString());
                particle.setAttribute("lifetime", LIFESPAN.toString());
                particle.setAttribute("start-time", startTime.toString());
                particle.setAttribute("visibility", "hidden");
                
                const color = COLORS[Math.floor(seededRand(COLORS.length))];
                particle.setAttribute("fill", color);
                
                const size = seededRand(PARTICLE_SIZE_RANGE[1], PARTICLE_SIZE_RANGE[0]);
                const particleData: ParticleData = {
                    angle: seededRand(Math.PI * 2), // random direction (0 to 2π)
                    speed: seededRand(EXPLOSION_SPEED * 1.8, EXPLOSION_SPEED * 0.6), // more varied speed
                    size,
                    rotationSpeed: seededRand(ROTATION_SPEED_RANGE[1], ROTATION_SPEED_RANGE[0]),
                    initialRotation: seededRand(360),
                    width: isRect ? size * seededRand(2.5, 1.2) : size,
                    height: isRect ? size * seededRand(1.8, 0.8) : size,
                    shape: isRect ? 'rect' : 'circle'
                };
                
                if (particleData.shape === 'rect') {
                    particle.setAttribute("width", particleData.width.toString());
                    particle.setAttribute("height", particleData.height.toString());
                    particle.setAttribute("x", (-particleData.width / 2).toString());
                    particle.setAttribute("y", (-particleData.height / 2).toString());
                    particle.setAttribute("rx", "1"); // Slight rounding for modern look
                } else {
                    particle.setAttribute("r", particleData.size.toString());
                    particle.setAttribute("cx", "0");
                    particle.setAttribute("cy", "0");
                }
                
                particle.setAttribute("stroke", "rgba(255,255,255,0.3)");
                particle.setAttribute("stroke-width", "0.5");
                group.appendChild(particle);
                particlesRef.current.push(particle);
                particleDataRef.current.push(particleData);
            }
        });
    }, [svgRef.current, groupId, effect.duration, effect.bursts]);

    useEffect(() => {
        if (!groupElRef.current || !targetEl || frame0 === null) return;
        
        const t = (frame - frame0) / fps;
        
        if (t > effect.duration + LIFESPAN) {
            removeEffect(effect);
            return;
        }
        
        const targetBox = getGlobalBBox(targetEl as SVGGraphicsElement)
        const centerX = targetBox.x + targetBox.width / 2;
        const centerY = targetBox.y + targetBox.height / 2;
        
        particlesRef.current.forEach((particle, index) => {
            const particleData = particleDataRef.current[index];
            const offsetX = parseFloat(particle.getAttribute("offset-x") || "0");
            const offsetY = parseFloat(particle.getAttribute("offset-y") || "0");
            const lifetime = parseFloat(particle.getAttribute("lifetime") || "1");
            const startTime = parseFloat(particle.getAttribute("start-time") || "0");
            
            const particleAge = t - startTime;
            const isActive = particleAge >= 0 && particleAge <= lifetime;
            
            particle.setAttribute("visibility", isActive ? "visible" : "hidden");
            
            if (isActive) {
                const originX = centerX + offsetX;
                const originY = centerY + offsetY;
                const progress = particleAge / lifetime;
                const horizontalDistance = particleData.speed * particleAge * Math.cos(particleData.angle);
                const verticalVelocity = particleData.speed * Math.sin(particleData.angle);
                const verticalDistance = verticalVelocity * particleAge + 0.5 * GRAVITY * particleAge * particleAge;
                const airResistance = 1 - (progress * 0.1);
                const posX = originX + horizontalDistance * airResistance;
                const posY = originY + verticalDistance;
                let opacity = 1;
                if (burstStartTimesRef.current.length > 0 && startTime === burstStartTimesRef.current[0]) {
                    if (progress < FADE_DURATION / lifetime) {
                        const fadeProgress = progress / (FADE_DURATION / lifetime);
                        opacity = fadeProgress * fadeProgress; // Quadratic fade for smoothness
                    }
                }
                else if (burstStartTimesRef.current.length > 0 && startTime === burstStartTimesRef.current[burstStartTimesRef.current.length - 1]) {
                     if (progress > 1 - FADE_DURATION / lifetime) {
                        const fadeProgress = (progress - (1 - FADE_DURATION / lifetime)) / (FADE_DURATION / lifetime);
                        opacity = 1 - (fadeProgress * fadeProgress); // Quadratic fade for smoothness
                    }
                }
                else if (progress > 1 - FADE_DURATION / lifetime) {
                    const fadeProgress = (progress - (1 - FADE_DURATION / lifetime)) / (FADE_DURATION / lifetime);
                    opacity = 1 - (fadeProgress * fadeProgress); // Quadratic fade for smoothness
                }
                const currentRotation = particleData.initialRotation + (particleData.rotationSpeed * particleAge);
                let scale = 1;
                if (progress < 0.15) {
                    scale = 0.3 + (progress / 0.15) * 0.7;
                } else {
                    scale = 1 - (progress - 0.15) * 0.15;
                }
                const transform = `translate(${posX}, ${posY}) rotate(${currentRotation}) scale(${scale})`;
                particle.setAttribute("transform", transform);
                particle.setAttribute("opacity", opacity.toString());
                if (particleData.shape === 'rect') {
                    const currentWidth = particleData.width * scale;
                    const currentHeight = particleData.height * scale;
                    particle.setAttribute("width", currentWidth.toString());
                    particle.setAttribute("height", currentHeight.toString());
                    particle.setAttribute("x", (-currentWidth / 2).toString());
                    particle.setAttribute("y", (-currentHeight / 2).toString());
                } else {
                    particle.setAttribute("r", (particleData.size * scale).toString());
                }
                const shimmer = 0.8 + 0.2 * Math.sin(currentRotation * Math.PI / 180);
                particle.setAttribute("fill-opacity", (opacity * shimmer).toString());
            }
        });
    }, [targetEl, frame, frame0, fps, effect.duration, removeEffect]);

    return <></>;
};

export default Effect;
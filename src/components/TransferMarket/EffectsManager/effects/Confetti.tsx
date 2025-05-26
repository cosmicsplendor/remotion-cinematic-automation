import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { ConfettiEffect, Effect, Frame, sanitizeName } from "../../helpers";
import { distributeEventStartTimes, getGlobalBBox, seededRand } from "../../../../../lib/d3/utils/math";
import { useCurrentFrame, useVideoConfig } from "remotion";

const LIFESPAN = 1;
const COLORS = ['#FFD700', '#FF69B4', '#4169E1', '#32CD32', '#FF4500', '#9370DB'];
const EXPLOSION_SPEED = 100; // pixels per second radial speed
const PARTICLE_SIZE_RANGE = [2, 6]; // min and max particle radius
const FADE_DURATION = 0.3; // duration for fade out effect

interface ParticleData {
    angle: number; // radial direction
    speed: number; // radial speed
    size: number;
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
    const targetEl = useMemo(() => getSvgEl(`points-${target}`), [getSvgEl, target]);
    const [groupEl, setGroupEl] = useState<SVGElement | null>(null);

    useEffect(() => {
        setFrame0(frame);
        return () => {
            // Cleanup particles by removing the group
            if (groupEl && svgRef.current) {
                svgRef.current.removeChild(groupEl);
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
        setGroupEl(group);
        
        distributeEventStartTimes(effect.duration, LIFESPAN, effect.bursts).forEach(startTime => {
            // Initialize 20-30 particles per burst
            const numParticles = seededRand(30, 20);
            const offsetX = seededRand(12, -12);
            const offsetY = seededRand(12, -12);
            
            for (let i = 0; i < numParticles; i++) {
                const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                
                // Store particle metadata
                particle.setAttribute("offset-x", offsetX.toString());
                particle.setAttribute("offset-y", offsetY.toString());
                particle.setAttribute("lifetime", LIFESPAN.toString());
                particle.setAttribute("start-time", startTime.toString());
                particle.setAttribute("visibility", "hidden");
                particle.setAttribute("fill", COLORS[Math.floor(seededRand(COLORS.length))]);
                
                // Create particle data for radial explosion
                const particleData: ParticleData = {
                    angle: seededRand(Math.PI * 2), // random direction (0 to 2π)
                    speed: seededRand(EXPLOSION_SPEED * 1.5, EXPLOSION_SPEED * 0.5), // varied speed
                    size: seededRand(PARTICLE_SIZE_RANGE[1], PARTICLE_SIZE_RANGE[0])
                };
                
                // Set initial particle appearance
                particle.setAttribute("r", particleData.size.toString());
                particle.setAttribute("cx", "0");
                particle.setAttribute("cy", "0");
                
                // Add to collections
                group.appendChild(particle);
                particlesRef.current.push(particle);
                particleDataRef.current.push(particleData);
            }
        });
    }, [svgRef.current, groupId, effect.duration, effect.bursts]);

    useEffect(() => {
        if (!groupEl || !targetEl || frame0 === null) return;
        
        const t = (frame - frame0) / fps;
        
        if (t > effect.duration + LIFESPAN) {
            removeEffect(effect);
            return;
        }
        
        // Get target position for particle origin
        const targetBox = getGlobalBBox(targetEl as SVGGraphicsElement)
        console.log(targetEl)
        const centerX = targetBox.x + targetBox.width + 50;
        const centerY = targetBox.y + targetBox.height / 2;
        console.log(targetBox)
        // Update each particle
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
                
                // Radial explosion simulation
                const distance = particleData.speed * particleAge;
                const posX = originX + Math.cos(particleData.angle) * distance;
                const posY = originY + Math.sin(particleData.angle) * distance;
                console.log()
                // Calculate opacity (fade out near end of lifetime)
                let opacity = 1;
                if (progress > 1 - FADE_DURATION / lifetime) {
                    const fadeProgress = (progress - (1 - FADE_DURATION / lifetime)) / (FADE_DURATION / lifetime);
                    opacity = 1 - fadeProgress;
                }
                
                // Apply position and opacity
                particle.setAttribute("cx", posX.toString());
                particle.setAttribute("cy", posY.toString());
                particle.setAttribute("opacity", opacity.toString());
                
                // Optional: Add slight scaling effect
                const scale = 1 - progress * 0.2; // Shrink slightly over time
                particle.setAttribute("r", (particleData.size * scale).toString());
            }
        });
    }, [groupEl, targetEl, frame, frame0, fps, effect.duration, removeEffect]);

    return <></>;
};

export default Effect;
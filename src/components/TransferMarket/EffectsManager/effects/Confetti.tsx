import { RefObject, useEffect, useRef } from "react";
import { ConfettiEffect, Frame, sanitizeName } from "../../helpers";
import { seededRand } from "../../../../../lib/d3/utils/math";
import { select } from "d3";

type Particle = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    vrotation: number;
    size: number;
    color: string;
    lifespan: number;
    spawnTime: number;
};

const COLORS = ['#FFD700', '#FF69B4', '#4169E1', '#32CD32', '#FF4500', '#9370DB'];

const Effect: React.FC<{
    effect: ConfettiEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    progress: number;
}> = ({ effect, getSvgEl, svgRef, progress }) => {
    const particlesRef = useRef<Particle[]>([]);
    const containerRef = useRef<SVGGElement | null>(null);
    const frameRef = useRef<number>(0);
    const triggeredBurstsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        // Create container group if it doesn't exist
        if (!containerRef.current) {
            containerRef.current = select(svg)
                .append('g')
                .attr('class', `confetti-container-${sanitizeName(effect.target)}`)
                .node();
        }

        // Calculate burst points based on effect.bursts
        const burstPoints = Array.from({ length: effect.bursts }, (_, i) => {
            return (i + 1) / (effect.bursts + 1);
        });

        // Function to get SVG coordinates from target element
        const getTargetPosition = () => {
            const targetEl = getSvgEl(`points-${sanitizeName(effect.target)}`);
            if (!targetEl || !svg) return null;

            // Get the bounding box of the target element in SVG coordinates
            const targetBBox = targetEl.getBBox();
            
            // Calculate the right center point of the target
            const x = targetBBox.x + targetBBox.width; // Right edge
            const y = targetBBox.y + targetBBox.height / 2; // Vertical center
            
            return { x, y };
        };

        // Function to update particle positions
        const updateParticles = () => {
            if (!containerRef.current) return;

            const container = select(containerRef.current);
            const gravity = 500; // pixels per second squared
            const now = performance.now() / 1000; // Convert to seconds

            // Remove dead particles
            particlesRef.current = particlesRef.current.filter(p => {
                const age = now - p.spawnTime;
                return age < p.lifespan;
            });

            // Update positions
            particlesRef.current.forEach(p => {
                const dt = 1/60; // Assuming 60fps
                p.vy += gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rotation += p.vrotation * dt;
            });

            // Update DOM
            const particles = container.selectAll('rect.particle')
                .data(particlesRef.current, (d: any) => d.id);

            // Remove old particles
            particles.exit().remove();

            // Add new particles
            particles.enter()
                .append('rect')
                .attr('class', 'particle')
                .merge(particles as any)
                .attr('x', d => d.x - d.size/2)
                .attr('y', d => d.y - d.size/2)
                .attr('width', d => d.size)
                .attr('height', d => d.size)
                .attr('fill', d => d.color)
                .attr('transform', d => `rotate(${d.rotation} ${d.x} ${d.y})`);
        };

        // Function to spawn new particles at target's right center
        const spawnParticles = () => {
            const position = getTargetPosition();
            if (!position) return;

            const { x, y } = position;

            // Spawn 20-30 particles per burst
            const count = 20 + Math.floor(seededRand(11)); // 20-30 particles
            const now = performance.now() / 1000;

            for (let i = 0; i < count; i++) {
                // Create firework-like burst pattern
                const angle = (i / count) * 2 * Math.PI + seededRand(0.5); // Evenly distributed with small random offset
                const speed = 150 + seededRand(100); // Random speed between 150-250
                
                const particle: Particle = {
                    id: Date.now() + i, // Unique ID
                    x, // All particles start at the same point
                    y, // All particles start at the same point
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 50, // Small upward bias for firework effect
                    rotation: seededRand(360),
                    vrotation: seededRand(720) - 360, // -360 to 360 degrees per second
                    size: 4 + seededRand(4), // 4-8 pixels
                    color: COLORS[Math.floor(seededRand(COLORS.length))],
                    lifespan: 1.5 + seededRand(1), // 1.5-2.5 seconds
                    spawnTime: now
                };
                particlesRef.current.push(particle);
            }
        };

        // Cleanup function
        const cleanup = () => {
            if (containerRef.current) {
                containerRef.current.remove();
                containerRef.current = null;
            }
            cancelAnimationFrame(frameRef.current);
            particlesRef.current = [];
        };

        // Animation loop
        const animate = () => {
            updateParticles();
            frameRef.current = requestAnimationFrame(animate);
        };

        // Start animation loop
        animate();

        // Check if we should spawn particles based on progress and burst points
        burstPoints.forEach((point, index) => {
            if (progress >= point && !triggeredBurstsRef.current.has(index)) {
                triggeredBurstsRef.current.add(index);
                spawnParticles();
            }
        });

        // Reset triggered bursts when progress goes back to 0 (animation restart)
        if (progress < 0.1) {
            triggeredBurstsRef.current.clear();
        }

        return cleanup;
    }, [effect, getSvgEl, svgRef, progress]);

    return null;
}

export default Effect;
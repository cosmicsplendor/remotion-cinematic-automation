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
                .style('transform', d => `rotate(${d.rotation}deg)`);
        };

        // Function to spawn new particles
        const spawnParticles = () => {
            const targetEl = getSvgEl(`points-${sanitizeName(effect.target)}`);
            if (!targetEl) return;

            const bbox = targetEl.getBoundingClientRect();
            const svgBBox = svg.getBoundingClientRect();
            const x = bbox.right - svgBBox.left + 10; // Small margin
            const y = bbox.top + bbox.height/2 - svgBBox.top;

            // Spawn 20-30 particles per burst
            const count = seededRand(30, 20);
            const now = performance.now() / 1000;

            for (let i = 0; i < count; i++) {
                const angle = seededRand(360) * Math.PI / 180;
                const speed = seededRand(300, 100);
                const particle: Particle = {
                    id: seededRand(1000000),
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 200, // Initial upward velocity
                    rotation: seededRand(360),
                    vrotation: seededRand(720, -720),
                    size: seededRand(8, 4),
                    color: COLORS[seededRand(COLORS.length - 1)],
                    lifespan: 0.3 + seededRand(30) / 100, // 0.3-0.6 seconds
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
        burstPoints.forEach(point => {
            if (Math.abs(progress - point) < 0.01 && particlesRef.current.length === 0) {
                spawnParticles();
            }
        });

        return cleanup;
    }, [effect, getSvgEl, svgRef, progress]);

    return null;
}

export default Effect;
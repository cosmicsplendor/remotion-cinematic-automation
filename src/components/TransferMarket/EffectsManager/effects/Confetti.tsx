import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { ConfettiEffect, Effect, Frame, sanitizeName } from "../../helpers";
import { distributeEventStartTimes, seededRand } from "../../../../../lib/d3/utils/math";
import { useCurrentFrame, useVideoConfig } from "remotion";

const LIFESPAN = 1
const COLORS = ['#FFD700', '#FF69B4', '#4169E1', '#32CD32', '#FF4500', '#9370DB'];
const Effect: React.FC<{
    effect: ConfettiEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: Effect) => void
}> = ({ effect, getSvgEl, svgRef, frame, removeEffect }) => {
    const [frame0, setFrame0] = useState<number | null>(null)
    const { fps } = useVideoConfig()
    const particlesRef = useRef<SVGGraphicsElement[]>([]);
    const target = useMemo(() => sanitizeName(effect.target), [effect])
    const groupId = useMemo(() => `confetti-group-${target}`, [target]);
    const targetEl = useMemo(() => getSvgEl(`points-${target}`), [getSvgEl, target]);
    const [groupEl, setGroupEl] = useState<SVGElement | null>(null);

    useEffect(() => {
        setFrame0(frame)
        return () => {
            // cleanup particles, probably just remove the group
        }
    }, [])
    useEffect(() => {
        if (!svgRef.current) return;
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute('id', groupId);
        svgRef.current.appendChild(group);
        setGroupEl(group);
        distributeEventStartTimes(effect.duration, LIFESPAN, effect.bursts).forEach(startTime => {
            // initialize 20-30 particles per burst, data as well as svg element visual representation
            const numParticles = seededRand(30, 20);
            const offsetX = seededRand(12, -12);
            const offsetY = seededRand(12, -12);
            for (let i = 0; i < numParticles; i++) {
                const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                particle.setAttribute("offset-x", offsetX.toString());
                particle.setAttribute("offset-y", offsetY.toString());
                particle.setAttribute("lifetime", LIFESPAN.toString());
                particle.setAttribute("start-time", startTime.toString());
                // start off hidden, and only show when the effect starts
                particle.setAttribute("visibility", "hidden");
                particle.setAttribute("fill", COLORS[Math.floor(seededRand(COLORS.length - 1))]); // random color
                // set up the rest of the attributes needed for fire work like burst, could be size, opacity, etc. velocity, etc.



                // finally add to the group and keep track of it
                group.appendChild(particle);
                particlesRef.current.push(particle);
            }
        })
    }, [svgRef.current]);

    useEffect(() => {
        if (!groupEl || !targetEl || frame0 === null) return;
        const t = (frame - frame0) / fps
        if (t > effect.duration) {
            removeEffect(effect); // this will trigger unmount/cleanup
            return;
        }
        // update particles
        const targetBox = (targetEl as SVGGraphicsElement).getBBox()
        const centerX = targetBox.x + targetBox.width + 50;
        const centerY = targetBox.y + targetBox.height / 2
        // do the rest of the calculations
        particlesRef.current.forEach(particle => {
            const offsetX = parseFloat(particle.getAttribute("offset-x") || "0");
            const offsetY = parseFloat(particle.getAttribute("offset-y") || "0");
            const lifetime = parseFloat(particle.getAttribute("lifetime") || "1");
            const startTime = parseFloat(particle.getAttribute("start-time") || "0");
            const visibility = t >= startTime && t < startTime + lifetime ? "visible" : "hidden";
            particle.setAttribute("visibility", visibility);

            if (visibility === "visible") {
                const originX = centerX + offsetX;
                const originY = centerY + offsetY;
                // simulate particle properties based on time, could ease opacity, size, position, etc.
                const progress = (t - startTime) / lifetime;

            }
        })
    }, [groupEl, targetEl, frame]);
    return <></>
}

export default Effect;
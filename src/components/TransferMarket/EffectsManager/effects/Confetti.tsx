import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { ConfettiEffect, Effect, Frame, sanitizeName } from "../../helpers";
import { distributeEventStartTimes, seededRand } from "../../../../../lib/d3/utils/math";
import { useCurrentFrame, useVideoConfig } from "remotion";

type Particle = {
    id: number;
    offsetX: number;
    offsetY: number;
    startTime: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    lifespan: number;
    spawnTime: number;
};
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
    const particlesRef = useRef<Particle[]>([]);
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
            const numParticles = seededRand(20, 30);
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
    }, [groupEl, targetEl, frame]);
    return <></>
}

export default Effect;
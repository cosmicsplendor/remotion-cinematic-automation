import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { ConfettiEffect, Effect, Frame, sanitizeName } from "../../helpers";
import { seededRand } from "../../../../../lib/d3/utils/math";
import { useCurrentFrame, useVideoConfig } from "remotion";

type Particle = {
    id: number;
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
    const [frame0, setFrame0] = useState<number|null>(null)
    const { fps } = useVideoConfig()
    const particlesRef = useRef<Particle[]>([]);
    const target = useMemo(() => sanitizeName(effect.target), [effect])
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
        const group = svgRef.current.querySelector<SVGElement>(`.confetti-group-${target}`) || null;
        setGroupEl(group);
        // initialize particles
        for (let i = 0; i < effect.bursts; i++) {

        }
    }, [targetEl]);

    useEffect(() => {
        if (!groupEl || frame0 === null) return;
        const t = (frame - frame0) / fps
        // update particles

    }, [groupEl, frame]);
    return <></>
}

export default Effect;
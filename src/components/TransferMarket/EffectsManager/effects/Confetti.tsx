import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { ConfettiEffect, Frame, sanitizeName } from "../../helpers";
import { seededRand } from "../../../../../lib/d3/utils/math";
import { select } from "d3";

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

const COLORS = ['#FFD700', '#FF69B4', '#4169E1', '#32CD32', '#FF4500', '#9370DB'];

const Effect: React.FC<{
    effect: ConfettiEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    progress: number;
}> = ({ effect, getSvgEl, svgRef, progress }) => {
    const particlesRef = useRef<Particle[]>([]);
    const target = useMemo(() => sanitizeName(effect.target), [effect])
    const targetEl = useMemo(() => getSvgEl(`points-${target}`), [getSvgEl, target]);
    const [groupEl, setGroupEl] = useState<SVGElement | null>(null);

    useEffect(() => {
        return () => {
            // cleanup particles
        }
    }, [])
    useEffect(() => {
        if (!svgRef.current) return;
        const group = svgRef.current.querySelector<SVGElement>(`.confetti-group-${target}`) || null;
        setGroupEl(group);
        // initialize particles
    }, [targetEl]);

    useEffect(() => {
        if (!groupEl) return;
        // update particles
    }, [groupEl, progress]);
    return <></>
}

export default Effect;
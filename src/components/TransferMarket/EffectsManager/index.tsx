import { RefObject, useCallback, useEffect, useState } from "react";
import { Frame, StrHash } from "../helpers"
const EffectsManager: React.FC<{frame: number, progress: number, data: Frame, svgRef: RefObject<SVGSVGElement> }> = props => {
    const [effects, setEffects] = useState<StrHash[]>([])
    const { frame, progress, data, svgRef } = props;
    useEffect(() => {
        if (!data.effects || data.effects.length === 0) return;
        setEffects([
            ...effects,
            ...data.effects
        ])
    }, [data]);
    const getSvgEl = useCallback((id: string) => {
        if (!svgRef.current) return null;
        const el = svgRef.current.querySelector(`#${id}`);
        if (el instanceof SVGElement) {
            return el;
        }
        return null;
    }, [svgRef])
    return <></>
}

export default EffectsManager;
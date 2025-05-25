import { RefObject, useCallback, useEffect, useState } from "react";
import { Effect, Frame } from "../helpers"
import ConfettiEffect from "./effects/Confetti";
const EffectsManager: React.FC<{frame: number, progress: number, data: Frame, svgRef: RefObject<SVGSVGElement> }> = props => {
    const [effects, setEffects] = useState<Effect[]>([])
    const { progress, data, svgRef } = props;
    useEffect(() => {
        if (!data.effects || data.effects.length === 0) return;
        setEffects([
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
    return <>
        {
            effects.map((effect, index) => {
                if (effect.type === "confetti") {
                    return (
                        <ConfettiEffect
                            key={index}
                            effect={effect}
                            svgRef={svgRef}
                            getSvgEl={getSvgEl}
                            progress={progress}
                        />
                    );
                }
                return null;
            })
        }
    </>
}

export default EffectsManager;
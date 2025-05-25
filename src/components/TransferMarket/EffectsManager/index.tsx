import { RefObject, useCallback, useEffect, useState } from "react";
import { Effect, Frame } from "../helpers"
import ConfettiEffect from "./effects/Confetti";
const EffectsManager: React.FC<{frame: number, progress: number, data: Frame, svgRef: RefObject<SVGSVGElement> }> = props => {
    const [effects, setEffects] = useState<Effect[]>([])
    const { progress, data, svgRef } = props;
    useEffect(() => {
        if (!data.effects || data.effects.length === 0) return;
        setEffects([
            ...effects,
            ...data.effects
        ])
    }, [data]);
    const removeEffect = useCallback((effect: Effect) => {
        setEffects(effects => effects.filter(e => e !== effect));
    }, [setEffects]);
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
                    const el = getSvgEl(effect.target);
                    if (!el) return null;
                    return (
                        <ConfettiEffect
                            effect={effect}
                            getSvgEl={getSvgEl}
                            progress={progress}
                            data={data}
                            removeEffect={removeEffect}
                        />
                    );
                }
                return null;
            })
        }
    </>
}

export default EffectsManager;
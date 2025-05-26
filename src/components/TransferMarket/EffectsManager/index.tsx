import { RefObject, useCallback, useEffect, useState } from "react";
import { Effect, Frame } from "../helpers"
import ConfettiEffect from "./effects/Confetti";
import SurgeEffect from "./effects/Surge";
const EffectsManager: React.FC<{frame: number, progress: number, data: Frame, svgRef: RefObject<SVGSVGElement> }> = props => {
    const [effects, setEffects] = useState<Effect[]>([])
    const { frame, data, svgRef } = props;
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
    const removeEffect = useCallback((effect: Effect) => {
        setEffects((prevEffects) => prevEffects.filter((e) => e !== effect))
    }, [setEffects])
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
                            removeEffect={removeEffect}
                            frame={frame}
                        />
                    );
                } else if (effect.type === "surge") {
                    return (
                        <SurgeEffect
                            key={index}
                            effect={effect}
                            svgRef={svgRef}
                            getSvgEl={getSvgEl}
                            removeEffect={removeEffect}
                            frame={frame}
                        />
                    );
                }
                return null;
            })
        }
    </>
}

export default EffectsManager;
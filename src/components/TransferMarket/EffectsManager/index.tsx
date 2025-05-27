import { RefObject, useCallback, useEffect, useState } from "react";
import { Datum, Effect, Frame } from "../helpers"
import ConfettiEffect from "./effects/Confetti";
import SurgeEffect from "./effects/Surge";
import ArrowEffect from "./effects/Arrow";
import { easingFns } from "../../../../lib/d3/utils/math";
import ChangeEffect from "./effects/Change";
const DEFAULT_EASING = "linear"
const EffectsManager: React.FC<{ frame: number, progress: number, data: Frame, prevData: Datum[], svgRef: RefObject<SVGSVGElement> }> = props => {
    const [effects, setEffects] = useState<Effect[]>([])
    const { frame, data, prevData, svgRef, progress } = props;
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
    const getValue = (target: string) => {
        const prevVal = prevData.find(d => d.name === target)?.marketCap || 0
        const curTarget = data.data.find(d => d.name === target)
        const { easing=DEFAULT_EASING } = data;

        const curVal = curTarget?.marketCap || 0;
        if (curVal === 0 || prevVal === 0) return 0;
        return (curVal - prevVal) * easingFns[easing]?.(progress) || 0;
    }
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
                } else if (effect.type === "arrow") {
                    return <ArrowEffect
                        key={index}
                        effect={effect}
                        svgRef={svgRef}
                        getSvgEl={getSvgEl}
                        removeEffect={removeEffect}
                        frame={frame}
                    />
                } else if (effect.type === "change") {
                    return (
                        <ChangeEffect
                            key={index}
                            effect={effect}
                            svgRef={svgRef}
                            getSvgEl={getSvgEl}
                            removeEffect={removeEffect}
                            frame={frame}
                            getValue={() => getValue(effect.target)}
                        />
                    );
                }
                return null;
            })
        }
    </>
}

export default EffectsManager;
import { RefObject, useCallback, useEffect, useState } from "react";
import { Datum, Effect, Frame } from "../helpers"
import ConfettiEffect from "./effects/Confetti";
import SurgeEffect from "./effects/Surge";
import ArrowEffect from "./effects/Arrow";
import { easingFns } from "../../../../lib/d3/utils/math";
import ChangeEffect from "./effects/Change";
import FocusEffect from "./effects/Focus";
import LottieEffect from "./effects/Lottie";
import LoadingEffect from "./effects/Loading";

const DEFAULT_EASING = "linear"

const EffectsManager: React.FC<{ 
    frame: number, 
    progress: number, 
    data: Frame, 
    prevData: Datum[], 
    svgRef: RefObject<SVGSVGElement>
}> = props => {
    const [effects, setEffects] = useState<Effect[]>([])
    const [readyEffects, setReadyEffects] = useState<Effect[]>([])
    const { frame, data, prevData, svgRef, progress } = props;

    // Handle new effects with delays
    useEffect(() => {
        if (!data.effects || data.effects.length === 0) return;
        
        const newEffects = data.effects;
        const timeoutIds: NodeJS.Timeout[] = [];
        
        newEffects.forEach(effect => {
            const delay = effect.delay || 0;
            
            if (delay === 0) {
                // Add immediately if no delay
                setReadyEffects(prev => [...prev, effect]);
            } else {
                // Add after delay
                const timeoutId = setTimeout(() => {
                    setReadyEffects(prev => [...prev, effect]);
                }, delay * 1000);
                timeoutIds.push(timeoutId);
            }
        });

        setEffects(prev => [...prev, ...newEffects]);

        // Cleanup timeouts on unmount or effect change
        return () => {
            timeoutIds.forEach(id => clearTimeout(id));
        };
    }, [data.effects]);

    const getSvgEl = useCallback((id: string) => {
        if (!svgRef.current) return null;
        const el = svgRef.current.querySelector(`#${id}`);
        if (el instanceof SVGElement) {
            return el;
        }
        return null;
    }, [svgRef])

    const removeEffect = useCallback((effect: Effect) => {
        setEffects((prevEffects) => prevEffects.filter((e) => e !== effect));
        setReadyEffects((prevEffects) => prevEffects.filter((e) => e !== effect));
    }, [])

    const getChange = (target: string, progress=1) => {
        const prevVal = prevData.find(d => d.name === target)?.marketCap || 0
        const curTarget = data.data.find(d => d.name === target)
        const { easing=DEFAULT_EASING } = data;

        const curVal = curTarget?.marketCap || 0;
        if (curVal === 0 || prevVal === 0) return 0;
        const percentage = 100 * (curVal - prevVal) / prevVal;
        if (isNaN(percentage)) return 0;
        if (progress === 0) return 0;
        return percentage * easingFns[easing]?.(progress);
    }

    return <>
        {
            readyEffects.map((effect, index) => {
                // Use a unique key based on the effect's properties to avoid conflicts
                const key = `${effect.type}-${index}-${effect.target || 'default'}`;
                
                if (effect.type === "confetti") {
                    return (
                        <ConfettiEffect
                            key={key}
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
                            key={key}
                            effect={effect}
                            svgRef={svgRef}
                            getSvgEl={getSvgEl}
                            removeEffect={removeEffect}
                            frame={frame}
                        />
                    );
                } else if (effect.type === "lottie") {
                    return <LottieEffect
                        key={key}
                        effect={effect}
                        svgRef={svgRef}
                        getSvgEl={getSvgEl}
                        removeEffect={removeEffect}
                        frame={frame}
                    />
                } else if (effect.type === "arrow") {
                    return <ArrowEffect
                        key={key}
                        effect={effect}
                        svgRef={svgRef}
                        getSvgEl={getSvgEl}
                        removeEffect={removeEffect}
                        frame={frame}
                    />
                } else if (effect.type === "loading") {
                    return <LoadingEffect
                        key={key}
                        effect={effect}
                        svgRef={svgRef}
                        getSvgEl={getSvgEl}
                        removeEffect={removeEffect}
                        frame={frame}
                    />
                } else if (effect.type === "change") {
                    return (
                        <ChangeEffect
                            key={key}
                            effect={effect}
                            svgRef={svgRef}
                            getSvgEl={getSvgEl}
                            removeEffect={removeEffect}
                            frame={frame}
                            getValue={(progress: number) => getChange(effect.target, progress)}
                            prevData={prevData}
                            progress={progress}
                        />
                    );
                } else if (effect.type === "focus") {
                    return (
                        <FocusEffect 
                            key={key} 
                            effect={effect} 
                            svgRef={svgRef} 
                            getSvgEl={getSvgEl} 
                            frame={frame} 
                            removeEffect={removeEffect}
                        />
                    )
                }
                return null;
            })
        }
    </>
}

export default EffectsManager;
import { RefObject, useCallback, useEffect, useState } from "react";
import { useVideoConfig } from "remotion";
import { Datum, Effect as OriginalEffect, Frame } from "../helpers";
import ConfettiEffect from "./effects/Confetti";
import SurgeEffect from "./effects/Surge";
import ArrowEffect from "./effects/Arrow";
import { easingFns } from "../../../../lib/d3/utils/math";
import ChangeEffect from "./effects/Change";
import FocusEffect from "./effects/Focus";
import LottieEffect from "./effects/Lottie";
import LoadingEffect from "./effects/Loading";

const DEFAULT_EASING = "linear";

interface ManagedEffect {
    id: string; // Unique INSTANCE ID for React key and removal
    sourceEffect: OriginalEffect; // The original effect object from props
    introducedAtFrame: number; // Frame when this effect instance was added to managedEffects
    sourceIdSignature: string; // A signature of the source effect for comparison
}

// Generates a signature for an effect based on its content, excluding highly volatile parts like delay if desired for "sameness"
const generateEffectSourceIdSignature = (effect: OriginalEffect, indexInArray: number): string => {
    // Using indexInArray makes it sensitive to order.
    // If effects can be reordered but are the same, omit index or use a stable ID from the effect itself if available.
    return `effect-sig-${effect.type}-${effect.target || 'default'}-${indexInArray}-${JSON.stringify(effect.options || {})}`;
};


const EffectsManager: React.FC<{
    frame: number; // Current Remotion frame
    progress: number;
    data: Frame;
    prevData: Datum[];
    svgRef: RefObject<SVGSVGElement>;
}> = props => {
    const { frame: currentFrame, data, prevData, svgRef, progress } = props;
    const { fps } = useVideoConfig();

    const [managedEffects, setManagedEffects] = useState<ManagedEffect[]>([]);

    // This useEffect synchronizes `managedEffects` with `props.data.effects`.
    // It only adds new effects not already present.
    useEffect(() => {
        const effectsFromProps = data.effects || [];
        if (!effectsFromProps && managedEffects.length === 0) return;


        const newEffectsToAdd: ManagedEffect[] = [];
        const existingSignatures = new Set(managedEffects.map(me => me.sourceIdSignature));

        effectsFromProps.forEach((effectFromProp: any, index: number) => {
            const signature = generateEffectSourceIdSignature(effectFromProp, index);

            if (!existingSignatures.has(signature)) {
                // This effect (based on its signature) is not yet managed.
                const uniqueInstanceId = `managed-${signature}-frame${currentFrame}-${Math.random().toString(36).substr(2, 9)}`;
                newEffectsToAdd.push({
                    id: uniqueInstanceId,
                    sourceEffect: effectFromProp,
                    introducedAtFrame: currentFrame, // Key: use currentFrame at time of addition
                    sourceIdSignature: signature,
                });
            }
        });

        if (newEffectsToAdd.length > 0) {
            setManagedEffects(prev => [...prev, ...newEffectsToAdd]);
        }

        // Optional: Aggressive cleanup if effects disappear from props
        // This depends on whether effects should persist beyond their definition in data.effects
        /*
        const currentPropSignatures = new Set(effectsFromProps.map((ef, idx) => generateEffectSourceIdSignature(ef, idx)));
        setManagedEffects(prev => prev.filter(me => currentPropSignatures.has(me.sourceIdSignature)));
        */

    }, [data.effects, currentFrame]); // IMPORTANT: `currentFrame` is included here because `introducedAtFrame`
                                      // depends on it WHEN an effect is added. If `data.effects` is stable,
                                      // this hook will run each frame, but `newEffectsToAdd` will be empty
                                      // after the initial additions for that `data.effects` set.
                                      // This is acceptable. The expensive part (setState) is conditional.

    const getSvgEl = useCallback((id: string) => {
        if (!svgRef.current) return null;
        const el = svgRef.current.querySelector(`#${id}`);
        if (el instanceof SVGElement) {
            return el;
        }
        return null;
    }, [svgRef]);

    const removeEffectById = useCallback((effectId: string) => {
        setManagedEffects(prevEffects => prevEffects.filter(me => me.id !== effectId));
    }, []);

    const getChange = (target: string, initialData: Datum[], currentEffectProgress = 1) => {
        const prevVal = initialData.find(d => d.name === target)?.marketCap || 0;
        const curTarget = data.data.find(d => d.name === target);
        const { easing = DEFAULT_EASING } = data; // Easing from the main Frame data

        const curVal = curTarget?.marketCap || 0;

        if (prevVal === 0 && curVal === 0) return 0;
        if (prevVal === 0) return currentEffectProgress > 0 ? Infinity : 0; // New item, could be 100% or Infinity based on progress

        const percentage = 100 * (curVal - prevVal) / prevVal;
        if (isNaN(percentage)) return 0;
        if (currentEffectProgress === 0) return 0;

        const easingFn = easingFns[easing] || easingFns[DEFAULT_EASING];
        return percentage * easingFn(currentEffectProgress);
    };

    const readyEffectsToRender = managedEffects.filter(managedEffect => {
        const delayInSeconds = managedEffect.sourceEffect.delay || 0;
        const delayInFrames = Math.round(delayInSeconds * fps);
        return currentFrame >= managedEffect.introducedAtFrame + delayInFrames;
    });

    return (
        <>
            {readyEffectsToRender.map(managedEffect => {
                const { sourceEffect, id } = managedEffect;
                const key = id;

                const commonEffectProps = {
                    key: key,
                    effect: sourceEffect,
                    svgRef: svgRef,
                    getSvgEl: getSvgEl,
                    removeEffect: () => removeEffectById(id),
                    frame: currentFrame, // Pass the global currentFrame
                };

                if (sourceEffect.type === "confetti") {
                    return <ConfettiEffect {...commonEffectProps} />;
                } else if (sourceEffect.type === "surge") {
                    return <SurgeEffect {...commonEffectProps} />;
                } else if (sourceEffect.type === "lottie") {
                    return <LottieEffect {...commonEffectProps} />;
                } else if (sourceEffect.type === "arrow") {
                    return <ArrowEffect {...commonEffectProps} />;
                } else if (sourceEffect.type === "loading") {
                    return <LoadingEffect {...commonEffectProps} />;
                } else if (sourceEffect.type === "change") {
                    return (
                        <ChangeEffect
                            {...commonEffectProps}
                            getValue={(initialData: Datum[], p: number) => getChange(sourceEffect.target!, initialData, p)}
                            prevData={prevData}
                            progress={progress} // Overall scene/frame progress for easing
                        />
                    );
                } else if (sourceEffect.type === "focus") {
                    return <FocusEffect {...commonEffectProps} />;
                }
                return null;
            })}
        </>
    );
};

export default EffectsManager;
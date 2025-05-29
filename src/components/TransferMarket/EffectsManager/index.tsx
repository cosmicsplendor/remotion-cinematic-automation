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

const generateEffectSourceIdSignature = (effect: OriginalEffect, indexInArray: number): string => {
    return `effect-sig-${effect.type}-${effect.target || 'default'}-${indexInArray}}`;
};


const EffectsManager: React.FC<{
    frame: number; // Current Remotion frame
    progress: number;
    data: Frame;
    prevData: Datum[];
    svgRef: RefObject<SVGSVGElement>;
    allData: Frame[],
    currentDataIndex: number; // Current data index in the flattened data array
}> = props => {
    const { frame: currentFrame, data, prevData, svgRef, progress, allData, currentDataIndex } = props;
    const { fps } = useVideoConfig();

    const [managedEffects, setManagedEffects] = useState<ManagedEffect[]>([]);

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

    }, [data.effects, currentFrame]); // IMPORTANT: `currentFrame` is included here because `introducedAtFrame`

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

    // Assume 'easingFns' and 'DEFAULT_EASING' are accessible in this scope.
    // Assume 'Datum' has 'name' and 'marketCap' properties.

    const getChange = (
        target: string,              // The name of the target item (e.g., "Bitcoin")
        dataAtEffectStart: Datum[],  // Data array from ChangeEffectDisplay's initial mount (baseline)
        dataAtSegmentStart: Datum[], // Data array for the start of the current animation segment
        segmentProgress: number,     // Progress of the current animation segment (0 to 1)
    ): number => {
        const initialTargetDatum = dataAtEffectStart.find(d => d.name === target);
        const segmentStartDatum = dataAtSegmentStart.find(d => d.name === target);
        const segmentEndDatum = data.data.find(d => d.name === target);

        const initialVal = initialTargetDatum?.marketCap;
        const segmentStartVal = segmentStartDatum?.marketCap;
        const segmentEndVal = segmentEndDatum?.marketCap;
        const easingType = data.easing as string;

        if (
            initialVal === undefined || initialVal === null ||
            segmentStartVal === undefined || segmentStartVal === null ||
            segmentEndVal === undefined || segmentEndVal === null
        ) {
            return NaN; // Or 0, depending on how you want to handle missing data
        }

        const easingFn = easingFns[easingType] || easingFns[DEFAULT_EASING];
        const easedSegmentProgress = easingFn(segmentProgress);

        const currentInterpolatedValue = segmentStartVal + (segmentEndVal - segmentStartVal) * easedSegmentProgress;

        if (initialVal === 0) {
            if (currentInterpolatedValue === 0) return 0;
            return currentInterpolatedValue > 0 ? Infinity : -Infinity;
        }

        const overallPercentage = 100 * (currentInterpolatedValue - initialVal) / initialVal;

        if (isNaN(overallPercentage)) {
            return 0; // Default to 0% if calculation results in NaN (e.g. if initialVal was 0 and somehow missed above)
        }

        return overallPercentage;
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

                const baseProps = {
                    getSvgEl: getSvgEl,
                    svgRef: svgRef,
                    frame: currentFrame,
                };

                if (sourceEffect.type === "confetti") {
                    return (
                        <ConfettiEffect
                            key={key}
                            effect={sourceEffect}
                            {...baseProps}
                            removeEffect={() => removeEffectById(id)}
                        />
                    );
                } else if (sourceEffect.type === "surge") {
                    return (
                        <SurgeEffect
                            key={key}
                            effect={sourceEffect}
                            {...baseProps}
                            removeEffect={() => removeEffectById(id)}
                        />
                    );
                } else if (sourceEffect.type === "lottie") {
                    return (
                        <LottieEffect
                            key={key}
                            effect={sourceEffect}
                            {...baseProps}
                            removeEffect={() => removeEffectById(id)}
                        />
                    );
                } else if (sourceEffect.type === "arrow") {
                    return (
                        <ArrowEffect
                            key={key}
                            effect={sourceEffect}
                            {...baseProps}
                            removeEffect={() => removeEffectById(id)}
                        />
                    );
                } else if (sourceEffect.type === "loading") {
                    return (
                        <LoadingEffect
                            key={key}
                            effect={sourceEffect}
                            {...baseProps}
                            removeEffect={() => removeEffectById(id)}
                        />
                    );
                } else if (sourceEffect.type === "change") {
                    return (
                        <ChangeEffect
                            key={key}
                            effect={sourceEffect}
                            {...baseProps}
                            removeEffect={() => removeEffectById(id)}
                            getValue={(initialData: Datum[], previousData: Datum[], progress: number) =>
                                getChange(sourceEffect.target!, initialData, previousData, progress)}
                            prevData={prevData}
                            progress={progress}
                            initialData={sourceEffect.initialDataOffset ?
                                allData[currentDataIndex + sourceEffect.initialDataOffset]?.data :
                                prevData}
                        />
                    );
                } else if (sourceEffect.type === "focus") {
                    return (
                        <FocusEffect
                            key={key}
                            effect={sourceEffect}
                            {...baseProps}
                            removeEffect={() => removeEffectById(id)}
                        />
                    );
                }
                return null;
            })}
        </>
    );
};

export default EffectsManager;
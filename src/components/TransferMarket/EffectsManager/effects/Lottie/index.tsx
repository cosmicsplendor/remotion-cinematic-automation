import { RefObject, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useVideoConfig } from "remotion";
import { easingFns, getGlobalBBox } from "../../../../../../lib/d3/utils/math";
import lottie, { AnimationItem } from "lottie-web";
import anims from "./anims/index"
import { LottieEffect, sanitizeName } from "../../../../../components/TransferMarket/helpers";
interface LottieEffectProps {
    effect: LottieEffect;
    getSvgEl: (id: string) => SVGElement | null;
    svgRef: RefObject<SVGSVGElement>;
    frame: number;
    removeEffect: (effect: LottieEffect) => void;
}

// Default height if not specified
const DEFAULT_LOTTIE_HEIGHT = 150;
const LOTTIE_OFFSET_X = 20;

// Fade parameters
const FADE_IN_DURATION_SEC: number = 0.2;
const FADE_OUT_DURATION_SEC: number = 0.3;

function isAnimationKey(key: string, anims: object): key is keyof typeof anims {
    return key in anims;
}

const LottieEffect: React.FC<LottieEffectProps> = ({
    effect,
    getSvgEl,
    svgRef,
    frame,
    removeEffect,
}) => {
    const [frame0, setFrame0] = useState<number | null>(null);
    const { fps } = useVideoConfig();

    const groupRef = useRef<SVGGElement | null>(null);
    const foreignObjectRef = useRef<SVGForeignObjectElement | null>(null);
    const lottieContainerRef = useRef<HTMLDivElement | null>(null);
    const lottieInstanceRef = useRef<AnimationItem | null>(null);

    const groupId = useMemo(() => `lottie-effect-${sanitizeName(effect.target)}`, [effect.target]);

    const targetElement = useMemo(() => {
        const targetEl = effect.targetEl || "points";
        const targetElId = `${targetEl}-${sanitizeName(effect.target)}`;
        return getSvgEl(targetElId);
    }, [effect.targetEl, effect.target]);

    // Memoized helper function to calculate width from height preserving aspect ratio
    const calculateDimensions = useCallback((originalWidth: number, originalHeight: number, desiredHeight: number) => {
        const aspectRatio = originalWidth / originalHeight;
        return {
            width: Math.round(desiredHeight * aspectRatio),
            height: desiredHeight
        };
    }, []);

    // Calculate dimensions directly from animation data
    const lottieOptimalSize = useMemo(() => {
        if (isAnimationKey(effect.anim, anims)) {
            const animData = anims[effect.anim] as any;
            const desiredHeight = effect.height || DEFAULT_LOTTIE_HEIGHT;
            return calculateDimensions(animData.w, animData.h, desiredHeight);
        }
        return { width: DEFAULT_LOTTIE_HEIGHT, height: DEFAULT_LOTTIE_HEIGHT };
    }, [effect.anim, effect.height, calculateDimensions]);

    // LottieEffect setup: Set initial frame and cleanup
    useEffect(() => {
        setFrame0(frame);

        return () => {
            if (lottieInstanceRef.current) {
                lottieInstanceRef.current.destroy();
                lottieInstanceRef.current = null;
            }
            if (groupRef.current && svgRef.current) {
                svgRef.current.removeChild(groupRef.current);
            }
            groupRef.current = null;
            foreignObjectRef.current = null;
            lottieContainerRef.current = null;
        };
    }, []);

    // SVG foreignObject and Lottie initialization
    useEffect(() => {
        if (!svgRef.current) return;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("id", groupId);
        group.setAttribute("opacity", "0"); // Start hidden

        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("width", lottieOptimalSize.width.toString());
        foreignObject.setAttribute("height", lottieOptimalSize.height.toString());
        foreignObjectRef.current = foreignObject;

        const lottieDiv = document.createElement("div");
        lottieDiv.style.width = "100%";
        lottieDiv.style.height = "100%";
        lottieContainerRef.current = lottieDiv;

        foreignObject.appendChild(lottieDiv);
        group.appendChild(foreignObject);
        svgRef.current.appendChild(group);

        groupRef.current = group;

        // Initialize Lottie
        if (lottieContainerRef.current && isAnimationKey(effect.anim, anims)) {
            lottieInstanceRef.current = lottie.loadAnimation({
                container: lottieContainerRef.current,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                animationData: anims[effect.anim] as any
            });
        }

    }, [svgRef, groupId, lottieOptimalSize, effect.anim]);

    // Animation loop (positioning, Lottie frame control, fading)
    useEffect(() => {
        if (frame0 === null || !groupRef.current || !svgRef.current || !lottieInstanceRef.current) {
            return;
        }

        const lottieInstance = lottieInstanceRef.current;
        const currentTime = (frame - frame0) / fps;

        // Duration check
        if (currentTime > effect.duration && effect.duration >= 0) {
            removeEffect(effect);
            return;
        }

        // Target element check
        if (!targetElement) {
            groupRef.current.setAttribute("opacity", "0");
            lottieInstance.pause();
            return;
        }

        const targetBox = getGlobalBBox(targetElement as SVGGraphicsElement);

        // Positioning - use lottieOptimalSize
        let translateX = targetBox.x + targetBox.width + LOTTIE_OFFSET_X;
        let translateY = targetBox.y + targetBox.height / 2 - lottieOptimalSize.height / 2;

        if (typeof effect.offsetX === 'number') {
            translateX += effect.offsetX;
        }

        if (typeof effect.offsetY === 'number') {
            translateY += effect.offsetY;
        }

        // Lottie frame control
        const lottieProgress = effect.duration > 0 ? Math.min(1, currentTime / effect.duration) : 0;
        const lottieFrame = lottieProgress * lottieInstance.totalFrames;
        lottieInstance.goToAndStop(lottieFrame, true);

        // Opacity (Fade In/Out)
        let opacity = 1.0;
        
        // Fade In
        let fadeInProgress = 1.0;
        if (FADE_IN_DURATION_SEC > 0 && currentTime < FADE_IN_DURATION_SEC) {
            fadeInProgress = currentTime / FADE_IN_DURATION_SEC;
        } else if (FADE_IN_DURATION_SEC === 0 && currentTime < 0) {
            fadeInProgress = 0;
        }

        // Fade Out with sineOut easing
        let fadeOutProgress = 1.0;
        if (effect.duration >= 0 && FADE_OUT_DURATION_SEC > 0 && currentTime > effect.duration - FADE_OUT_DURATION_SEC) {
            const raw = Math.max(0, (effect.duration - currentTime) / FADE_OUT_DURATION_SEC);
            fadeOutProgress = easingFns.sineOut(raw);
        } else if (effect.duration >= 0 && FADE_OUT_DURATION_SEC === 0 && currentTime >= effect.duration) {
            fadeOutProgress = 0;
        }

        opacity = Math.max(0, Math.min(fadeInProgress, fadeOutProgress));

        // Apply transformations and style
        groupRef.current.setAttribute("transform", `translate(${translateX}, ${translateY})`);
        groupRef.current.setAttribute("opacity", opacity.toString());

    }, [
        frame,
        frame0,
        fps,
        targetElement,
        removeEffect,
        effect.duration,
        lottieOptimalSize // Use lottieOptimalSize instead of lottieSize
    ]);

    return <></>;
};

export default LottieEffect;
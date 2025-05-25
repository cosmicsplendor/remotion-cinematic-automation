import { ConfettiEffect, Frame } from "../../helpers";

const Effect: React.FC<{
    effect: ConfettiEffect;
    getSvgEl: (id: string) => SVGElement | null;
    progress: number;
    data: Frame;
    removeEffect: (effect: ConfettiEffect) => void;
}> = () => {
    return <></>
}

export default Effect;
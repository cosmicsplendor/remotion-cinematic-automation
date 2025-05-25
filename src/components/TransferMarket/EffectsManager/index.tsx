import { RefObject, useCallback } from "react";
import { Frame } from "../helpers"
const EffectsManager: React.FC<{frame: number, progress: number, data: Frame, svgRef: RefObject<SVGSVGElement> }> = props => {
    const { frame, progress, data, svgRef } = props;
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
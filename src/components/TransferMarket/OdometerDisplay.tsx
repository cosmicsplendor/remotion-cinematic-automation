import React, { useState, useEffect, useRef } from 'react';

interface OdometerDisplayProps {
    values: string[];
    currentIndex: number;
    top?: string;
    right?: string;
}

const OdometerDisplay: React.FC<OdometerDisplayProps> = ({
    values,
    currentIndex,
    top = "32px",
    right = "256px",
}) => {
    const [isFirstRender, setIsFirstRender] = useState(true);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [displayValues, setDisplayValues] = useState<string[]>([]);
    const [translateY, setTranslateY] = useState(0);
    const prevIndexRef = useRef<number>(currentIndex);
    const containerHeight = 54; // Height of one item

    useEffect(() => {
        if (isFirstRender) {
            // First render: show current value immediately
            setDisplayValues([values[currentIndex]]);
            setTranslateY(0);
            setShouldAnimate(false);
            setIsFirstRender(false);
            prevIndexRef.current = currentIndex;
            return;
        }

        const prevIndex = prevIndexRef.current;
        
        if (currentIndex === prevIndex) return;

        // Determine scroll direction and setup values
        let newDisplayValues: string[];
        let startTranslateY: number;
        let endTranslateY: number;

        // Check if we're wrapping from last to first (scroll up from bottom)
        if (prevIndex === values.length - 1 && currentIndex === 0) {
            // Wrap from last to first - old value slides up, new value comes from bottom
            newDisplayValues = [values[prevIndex], values[currentIndex]];
            startTranslateY = 0; // Start with old value (last item) visible
            endTranslateY = -containerHeight; // End with new value (first item) visible, old value slides up and out
        }
        // Check if we're wrapping from first to last (scroll down to bottom)
        else if (prevIndex === 0 && currentIndex === values.length - 1) {
            // Wrap from first to last - scroll down
            newDisplayValues = [values[prevIndex], values[currentIndex]];
            startTranslateY = 0; // Start with previous value in view
            endTranslateY = -containerHeight; // End with current value in view
        }
        // Normal increment (currentIndex = prevIndex + 1)
        else if (currentIndex === prevIndex + 1) {
            // Scroll up - old value slides up and out, new value slides up from bottom
            newDisplayValues = [values[prevIndex], values[currentIndex]];
            startTranslateY = 0; // Start with old value (Q2) visible at top
            endTranslateY = -containerHeight; // End with new value (Q3) visible, old value above screen
        }
        // Normal decrement (currentIndex = prevIndex - 1)
        else if (currentIndex === prevIndex - 1) {
            // Scroll up - new value comes from top
            newDisplayValues = [values[currentIndex], values[prevIndex]];
            startTranslateY = -containerHeight;
            endTranslateY = 0;
        }
        // Handle any other case (jump to value)
        else {
            newDisplayValues = [values[currentIndex]];
            startTranslateY = 0;
            endTranslateY = 0;
        }

        // Set initial state without animation
        setShouldAnimate(false);
        setDisplayValues(newDisplayValues);
        setTranslateY(startTranslateY);

        // Start animation after ensuring initial state is rendered
        const timeoutId = setTimeout(() => {
            setShouldAnimate(true);
            setTranslateY(endTranslateY);
        }, 50);

        prevIndexRef.current = currentIndex;

        // Cleanup
        return () => clearTimeout(timeoutId);
    }, [currentIndex, values, isFirstRender, containerHeight]);

    const outerBoxStyle: React.CSSProperties = {
        position: 'absolute',
        top,
        right,
        opacity: 0.8,
        display: 'inline-block',
        boxSizing: 'border-box',
        backgroundImage: 'linear-gradient(to bottom, #ffff00, #ffa500)',
        filter: 'grayscale(1)',
        border: '1px solid #444',
        borderRadius: '8px',
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingLeft: '6px',
        paddingRight: '6px',
    };

    const innerDigitCellStyle: React.CSSProperties = {
        boxSizing: 'border-box',
        fontFamily: 'monospace',
        fontSize: '32px',
        fontWeight: 600,
        color: '#444444',
        height: `${containerHeight}px`,
        width: '80px', // Fixed width
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '5px',
        paddingRight: '6px',
        backgroundImage: 'linear-gradient(to bottom, #cccccc 0%, #ffffff 20%, #ffffff 80%, #cccccc 100%)',
        border: `${0.03 * 32}px solid #666`,
        borderRadius: `${0.2 * 32}px`,
        boxShadow: 'inset 0 0 0.1em rgba(0, 0, 0, 0.5), 0 0 0 0.03em #ddd, 0 0 0 0.05em rgba(0, 0, 0, 0.2)',
        overflow: 'hidden', // Clip content outside this container
        position: 'relative',
    };

    const scrollContainerStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        transform: `translateY(${translateY}px)`,
        transition: shouldAnimate ? 'transform 1s ease-in-out' : 'none',
    };

    const spanStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${containerHeight}px`,
        width: '100%',
        flexShrink: 0,
    };

    return (
        <div style={outerBoxStyle}>
            <div style={innerDigitCellStyle}>
                <div style={scrollContainerStyle}>
                    {displayValues.map((value, index) => (
                        <span key={`${value}-${index}-${currentIndex}`} style={spanStyle}>
                            {value}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OdometerDisplay;
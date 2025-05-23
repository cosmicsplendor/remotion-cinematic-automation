import React from 'react';

interface QuarterDisplayProps {
    value: number;
    top?: string; // Making top and right optional with defaults
    right?: string;
}

const QuarterDisplay: React.FC<QuarterDisplayProps> = ({
    value,
    top = "32px",
    right = "256px",
}) => {
    // Styles for the INNER "digit-like" cell (your existing component's core style)
    const innerDigitCellStyle: React.CSSProperties = {
        boxSizing: 'border-box',
        fontFamily: 'monospace', // Font for "Q{value}"
        fontSize: '32px',                   // Font size for "Q{value}"
        fontWeight: 600,
        opacity: 1,                  // Opacity for "Q{value}"
        color: '#444444',                   // Text color for "Q{value}"
        height: "54px",                     // Fixed height for the inner cell
        display: 'flex',
        alignItems: 'center',               // Center text vertically
        justifyContent: 'center',           // Center text horizontally
        paddingLeft: '5px',                 // Horizontal padding within the inner cell
        paddingRight: '6px',
        // Background and border styling like an odometer digit from the CSS reference
        backgroundImage: 'linear-gradient(to bottom, #cccccc 0%, #ffffff 20%, #ffffff 80%, #cccccc 100%)',
        // border: '0.03em solid #444', // Calculated based on 32px fontSize: 0.03 * 32 = 0.96px (~1px)
        // borderRadius: '0.2em',      // Calculated based on 32px fontSize: 0.2 * 32 = 6.4px
        border: `${0.03 * 32}px solid #666`, // More explicit calculation for clarity
        borderRadius: `${0.2 * 32}px`,      // More explicit calculation for clarity
        boxShadow: 'inset 0 0 0.1em rgba(0, 0, 0, 0.5), 0 0 0 0.03em #ddd, 0 0 0 0.05em rgba(0, 0, 0, 0.2)',
        // The filter: 'grayscale(1)' from your previous component for the inner part is effectively
        // achieved if the outer box has it, as the inner colors are already grayscale.
        // If you wanted the inner box to be grayscaled independently, you'd keep it.
    };

    // Styles for the OUTER box.
    // This takes inspiration from the original "Q2" button in your image,
    // and the ".odometer.odometer-auto-theme" CSS for the overall odometer container.
    const outerBoxStyle: React.CSSProperties = {
        position: 'absolute', // Positioning for the entire component
        top,
        right,
        opacity: 0.7, // Opacity for the outer box
        display: 'inline-block', // So it wraps the inner div properly
        boxSizing: 'border-box',

        // Background like the original "Q2" button and odometer container reference
        // The CSS reference for .odometer-auto-theme had: linear-gradient(#ffff00, #ffa500)
        backgroundImage: 'linear-gradient(to bottom, #ffff00, #ffa500)',

        // Filter to match the grayscale appearance of the original "Q2" button in your image
        filter: 'grayscale(1)',

        // Border and borderRadius like the original "Q2" button
        border: '1px solid #444', // From the visual of the original Q2 button
        borderRadius: '8px',    // From the visual of the original Q2 button

        // User-specified padding for this outer box
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingLeft: '6px',
        paddingRight: '6px',
    };

    return (
        <div style={outerBoxStyle}> {/* Outer Box */}
            <div style={innerDigitCellStyle}> {/* Inner Digit-like Cell */}
                JAN
            </div>
        </div>
    );
};

export default QuarterDisplay;

// Example of how to use it:
// import QuarterDisplay from './QuarterDisplay';
//
// function App() {
//   return (
//     <div style={{ position: 'relative', height: '150px', border: '1px solid lightblue' }}>
//       <QuarterDisplay value={2} />
//       <QuarterDisplay value={3} top="32px" right="100px" />
//     </div>
//   );
// }
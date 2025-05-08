// src/editor/components/SVGViewer.tsx
import React from 'react';
import styled from 'styled-components';

const SVGContainer = styled.div<{ width?: number | string; height?: number | string }>`
  display: inline-block;
  line-height: 0; /* Prevents extra space below SVG */
  ${({ width }) => width && `width: ${typeof width === 'number' ? `${width}px` : width};`}
  ${({ height }) => height && `height: ${typeof height === 'number' ? `${height}px` : height};`}

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

interface SVGViewerProps {
  svgString: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

export const SVGViewer: React.FC<SVGViewerProps> = ({ svgString, width, height, style, className }) => {
  if (!svgString) return null;
  return (
    <SVGContainer
      width={width}
      height={height}
      style={style}
      className={className}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
};
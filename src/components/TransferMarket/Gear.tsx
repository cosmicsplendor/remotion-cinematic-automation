import React from 'react';

const RotatingGear: React.FC<{right: string, top: string }> = ({ top, right }) => {
  return (
    <div 
      style={{ 
        position: 'absolute', 
        top, 
        right,
        width: '120px',
        height: '120px'
      }}
    >
      <div className="gear-container">
        <svg 
          width="120" 
          height="120" 
          viewBox="0 0 120 120"
          className="rotating-gear"
        >
          {/* Outer gear teeth */}
          <g fill="#BFBFBF" stroke="#A6A6A6" strokeWidth="1">
            {/* Generate 12 gear teeth around the circle */}
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 30) * Math.PI / 180;
              const innerRadius = 45;
              const outerRadius = 55;
              const toothWidth = 8;
              
              const x1 = 60 + Math.cos(angle - toothWidth/2 * Math.PI/180) * innerRadius;
              const y1 = 60 + Math.sin(angle - toothWidth/2 * Math.PI/180) * innerRadius;
              const x2 = 60 + Math.cos(angle - toothWidth/2 * Math.PI/180) * outerRadius;
              const y2 = 60 + Math.sin(angle - toothWidth/2 * Math.PI/180) * outerRadius;
              const x3 = 60 + Math.cos(angle + toothWidth/2 * Math.PI/180) * outerRadius;
              const y3 = 60 + Math.sin(angle + toothWidth/2 * Math.PI/180) * outerRadius;
              const x4 = 60 + Math.cos(angle + toothWidth/2 * Math.PI/180) * innerRadius;
              const y4 = 60 + Math.sin(angle + toothWidth/2 * Math.PI/180) * innerRadius;
              
              return (
                <polygon
                  key={i}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                />
              );
            })}
          </g>
          
          {/* Main gear body */}
          <circle 
            cx="60" 
            cy="60" 
            r="45" 
            fill="#D4D4D4" 
            stroke="#BFBFBF" 
            strokeWidth="2"
          />
          
          {/* Inner circle for depth */}
          <circle 
            cx="60" 
            cy="60" 
            r="35" 
            fill="#E8E8E8" 
            stroke="#D4D4D4" 
            strokeWidth="1"
          />
          
          {/* Center hole - much bigger */}
          <circle 
            cx="60" 
            cy="60" 
            r="16" 
            fill="#A6A6A6" 
            stroke="#8C8C8C" 
            strokeWidth="1"
          />
          
          {/* Decorative spokes */}
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 60) * Math.PI / 180;
            const x1 = 60 + Math.cos(angle) * 20;
            const y1 = 60 + Math.sin(angle) * 20;
            const x2 = 60 + Math.cos(angle) * 30;
            const y2 = 60 + Math.sin(angle) * 30;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#BFBFBF"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        
        {/* Supporting gear bottom-right */}
        <svg 
          width="50" 
          height="50" 
          viewBox="0 0 50 50"
          className="supporting-gear"
          style={{
            position: 'absolute',
            bottom: '-15px',
            right: '-15px'
          }}
        >
          {/* Small gear teeth */}
          <g fill="#BFBFBF" stroke="#A6A6A6" strokeWidth="0.5">
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i * 45) * Math.PI / 180;
              const innerRadius = 18;
              const outerRadius = 23;
              const toothWidth = 18;
              
              const x1 = 25 + Math.cos(angle - toothWidth/2 * Math.PI/180) * innerRadius;
              const y1 = 25 + Math.sin(angle - toothWidth/2 * Math.PI/180) * innerRadius;
              const x2 = 25 + Math.cos(angle - toothWidth/2 * Math.PI/180) * outerRadius;
              const y2 = 25 + Math.sin(angle - toothWidth/2 * Math.PI/180) * outerRadius;
              const x3 = 25 + Math.cos(angle + toothWidth/2 * Math.PI/180) * outerRadius;
              const y3 = 25 + Math.sin(angle + toothWidth/2 * Math.PI/180) * outerRadius;
              const x4 = 25 + Math.cos(angle + toothWidth/2 * Math.PI/180) * innerRadius;
              const y4 = 25 + Math.sin(angle + toothWidth/2 * Math.PI/180) * innerRadius;
              
              return (
                <polygon
                  key={i}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                />
              );
            })}
          </g>
          
          {/* Small gear body */}
          <circle 
            cx="25" 
            cy="25" 
            r="18" 
            fill="#D4D4D4" 
            stroke="#BFBFBF" 
            strokeWidth="1"
          />
          
          {/* Small gear center */}
          <circle 
            cx="25" 
            cy="25" 
            r="6" 
            fill="#A6A6A6" 
            stroke="#8C8C8C" 
            strokeWidth="0.5"
          />
        </svg>
        
      </div>
      
      <style jsx>{`
        .gear-container {
          position: relative;
          width: 120px;
          height: 120px;
        }
        
        .rotating-gear {
          animation: rotate 8s linear infinite;
        }
        
        .supporting-gear {
          animation: rotate-reverse 6s linear infinite;
        }
        
        .quarter-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: 'Futura Bold', Arial, sans-serif;
          font-size: 28px;
          font-weight: 600;
          color: #555;
          pointer-events: none;
          text-shadow: 0 1px 2px rgba(255,255,255,0.8);
        }
        
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes rotate-reverse {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        
        .gear-container:hover .rotating-gear {
          animation-duration: 2s;
        }
        
        .gear-container:hover .supporting-gear {
          animation-duration: 1.5s;
        }
      `}</style>
    </div>
  );
};

export default RotatingGear;
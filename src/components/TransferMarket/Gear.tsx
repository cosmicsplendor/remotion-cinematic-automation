import React from 'react'

const RotatingGear: React.FC<{ right: string; top: string; t: number }> = ({
  top,
  right,
  t=0
}) => {
  const mainGearDuration = 4
  const smallGearDuration = 2

  const mainRotation = (t % mainGearDuration) / mainGearDuration * 360
  const smallRotation = -(t % smallGearDuration) / smallGearDuration * 360

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right,
        width: '120px',
        height: '120px',
        opacity: 0.4
      }}
    >
      <div
        className="gear-container"
        style={{ position: 'relative', width: '120px', height: '120px' }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={{
            transform: `rotate(${mainRotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          {/* Outer gear teeth */}
          <g fill="#BFBFBF" stroke="#A6A6A6" strokeWidth="1">
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 30) * Math.PI / 180
              const innerRadius = 45
              const outerRadius = 55
              const toothWidth = 16

              const x1 =
                60 +
                Math.cos(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius
              const y1 =
                60 +
                Math.sin(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius
              const x2 =
                60 +
                Math.cos(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const y2 =
                60 +
                Math.sin(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const x3 =
                60 +
                Math.cos(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const y3 =
                60 +
                Math.sin(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const x4 =
                60 +
                Math.cos(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius
              const y4 =
                60 +
                Math.sin(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius

              return (
                <polygon
                  key={i}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                />
              )
            })}
          </g>

          <circle
            cx="60"
            cy="60"
            r="45"
            fill="#D4D4D4"
            stroke="#BFBFBF"
            strokeWidth="2"
          />
          <circle
            cx="60"
            cy="60"
            r="35"
            fill="#E8E8E8"
            stroke="#D4D4D4"
            strokeWidth="1"
          />
          <circle
            cx="60"
            cy="60"
            r="16"
            fill="#A6A6A6"
            stroke="#8C8C8C"
            strokeWidth="1"
          />

          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 60) * Math.PI / 180
            const x1 = 60 + Math.cos(angle) * 20
            const y1 = 60 + Math.sin(angle) * 20
            const x2 = 60 + Math.cos(angle) * 30
            const y2 = 60 + Math.sin(angle) * 30

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
            )
          })}
        </svg>

        <svg
          width="50"
          height="50"
          viewBox="0 0 50 50"
          style={{
            position: 'absolute',
            bottom: '-15px',
            right: '-15px',
            transform: `rotate(${smallRotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          <g fill="#BFBFBF" stroke="#A6A6A6" strokeWidth="0.5">
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i * 45) * Math.PI / 180
              const innerRadius = 18
              const outerRadius = 23
              const toothWidth = 24

              const x1 =
                25 +
                Math.cos(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius
              const y1 =
                25 +
                Math.sin(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius
              const x2 =
                25 +
                Math.cos(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const y2 =
                25 +
                Math.sin(angle - (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const x3 =
                25 +
                Math.cos(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const y3 =
                25 +
                Math.sin(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  outerRadius
              const x4 =
                25 +
                Math.cos(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius
              const y4 =
                25 +
                Math.sin(angle + (toothWidth / 2) * (Math.PI / 180)) *
                  innerRadius

              return (
                <polygon
                  key={i}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                />
              )
            })}
          </g>

          <circle
            cx="25"
            cy="25"
            r="18"
            fill="#D4D4D4"
            stroke="#BFBFBF"
            strokeWidth="1"
          />
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
    </div>
  )
}

export default RotatingGear

/**
 * Ruler Component
 * Displays horizontal and vertical rulers for precise positioning
 */

import React from 'react';

interface RulerProps {
  direction: 'horizontal' | 'vertical';
  length: number;
  scale?: number;
  offset?: number;
}

export const Ruler: React.FC<RulerProps> = ({
  direction,
  length,
  scale = 1,
  offset = 0,
}) => {
  const RULER_SIZE = 20;
  const UNIT = 50; // Show number every 50px
  const TICK_INTERVAL = 10; // Small tick every 10px

  const ticks: Array<{ pos: number; isMajor: boolean; label?: string }> = [];

  for (let i = 0; i <= length; i += TICK_INTERVAL) {
    const isMajor = i % UNIT === 0;
    const pos = i * scale + offset;

    ticks.push({
      pos,
      isMajor,
      label: isMajor ? String(i) : undefined,
    });
  }

  if (direction === 'horizontal') {
    return (
      <div
        className="bg-gray-100 border-b border-gray-300 relative overflow-hidden"
        style={{ height: RULER_SIZE, width: '100%' }}
      >
        <svg
          width="100%"
          height={RULER_SIZE}
          className="absolute"
          style={{ left: offset }}
        >
          {ticks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={tick.pos}
                y1={RULER_SIZE}
                x2={tick.pos}
                y2={tick.isMajor ? RULER_SIZE - 10 : RULER_SIZE - 5}
                stroke="#666"
                strokeWidth={tick.isMajor ? 1 : 0.5}
              />
              {tick.label && (
                <text
                  x={tick.pos + 3}
                  y={RULER_SIZE - 12}
                  fontSize="10"
                  fill="#666"
                  fontFamily="monospace"
                >
                  {tick.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  }

  // Vertical ruler
  return (
    <div
      className="bg-gray-100 border-r border-gray-300 relative overflow-hidden"
      style={{ width: RULER_SIZE, height: '100%' }}
    >
      <svg
        width={RULER_SIZE}
        height="100%"
        className="absolute"
        style={{ top: offset }}
      >
        {ticks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={RULER_SIZE}
              y1={tick.pos}
              x2={tick.isMajor ? RULER_SIZE - 10 : RULER_SIZE - 5}
              y2={tick.pos}
              stroke="#666"
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.label && (
              <text
                x={3}
                y={tick.pos + 12}
                fontSize="10"
                fill="#666"
                fontFamily="monospace"
                transform={`rotate(-90 ${RULER_SIZE / 2} ${tick.pos})`}
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

import React, { useState } from 'react';
import { GlucoseReading, MealRecord, InsulinDoseRecord } from '../types';

export type ChartTimeRange = 'today' | '7days' | '14days' | '30days';

interface GlucoseChartProps {
  readings: GlucoseReading[];
  meals: MealRecord[];
  doses: InsulinDoseRecord[];
  isDark?: boolean;
  timeRange?: ChartTimeRange;
  onTimeRangeChange?: (range: ChartTimeRange) => void;
}

export const GlucoseChart: React.FC<GlucoseChartProps> = ({
  readings,
  meals,
  doses,
  isDark,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
}) => {
  const [internalTimeRange, setInternalTimeRange] = useState<ChartTimeRange>('7days');
  const activeTimeRange = controlledTimeRange ?? internalTimeRange;

  const handleRangeSelect = (r: ChartTimeRange) => {
    setInternalTimeRange(r);
    onTimeRangeChange?.(r);
  };

  const [hoveredPoint, setHoveredPoint] = useState<{
    reading: GlucoseReading;
    x: number;
    y: number;
  } | null>(null);

  // Filter by time range
  const now = new Date().getTime();
  const rangeMs =
    activeTimeRange === 'today'
      ? 24 * 3600 * 1000
      : activeTimeRange === '7days'
      ? 7 * 24 * 3600 * 1000
      : activeTimeRange === '14days'
      ? 14 * 24 * 3600 * 1000
      : 30 * 24 * 3600 * 1000;

  const startTime = now - rangeMs;

  const filteredReadings = readings
    .filter((r) => new Date(r.timestamp).getTime() >= startTime)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const filteredMeals = meals.filter(
    (m) => new Date(m.timestamp).getTime() >= startTime
  );
  const filteredDoses = doses.filter(
    (d) => new Date(d.timestamp).getTime() >= startTime
  );

  // Chart dimensions
  const width = 800;
  const height = 240;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 26;
  const padBottom = 34;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const minBg = 40;
  const maxBg = 300;

  const getX = (timestamp: string) => {
    const t = new Date(timestamp).getTime();
    const ratio = Math.max(0, Math.min(1, (t - startTime) / rangeMs));
    return padLeft + ratio * chartW;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minBg, Math.min(maxBg, val));
    const ratio = (clamped - minBg) / (maxBg - minBg);
    return padTop + (1 - ratio) * chartH;
  };

  const targetTopY = getY(180);
  const targetBottomY = getY(70);
  const targetHeight = targetBottomY - targetTopY;

  // Build line path and area path
  const points = filteredReadings.map((r) => ({
    x: getX(r.timestamp),
    y: getY(r.value),
    reading: r,
  }));

  const linePath =
    points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
      : '';

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`
      : '';

  const getPointColor = (val: number) => {
    if (val < 70) return '#DC2626'; // hypo red
    if (val <= 180) return '#111111'; // in range sleek jet black
    return '#FF5A36'; // hyper coral-orange
  };

  const getContextLabel = (ctx: string) => {
    switch (ctx) {
      case 'jejum':
      case 'fasting': return 'Jejum';
      case 'cafe_manha': return 'Café da Manhã';
      case 'pos_cafe':
      case 'post_meal_1h': return 'Pós Café';
      case 'almoco':
      case 'pre_meal': return 'Almoço';
      case 'pos_almoco':
      case 'post_meal_2h': return 'Pós Almoço';
      case 'jantar':
      case 'bedtime': return 'Jantar';
      case 'pos_jantar': return 'Pós Jantar';
      case 'madrugada':
      case 'dawn': return 'Madrugada';
      case 'exercise': return 'Exercício';
      default: return 'Geral';
    }
  };

  const latestPoint = points.length > 0 ? points[points.length - 1] : null;

  return (
    <div className="bg-white dark:bg-[#161619] rounded-[28px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] relative transition-colors duration-200 overflow-hidden max-w-full">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-[#111111] dark:text-white text-base sm:text-lg tracking-tight">
              Curva Glicêmica & Cruzamento Clínico
            </h3>
            <span className="text-[11px] bg-[#FF5A36]/10 text-[#FF5A36] font-bold px-2.5 py-0.5 rounded-full tabular-nums">
              {filteredReadings.length} medições
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Correlação entre glicemia, carboidratos e doses de insulina
          </p>
        </div>

        {/* Range Pill Selector */}
        <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-[#222226] p-1 rounded-full self-start sm:self-auto max-w-full">
          {(
            [
              { id: 'today', label: '24h' },
              { id: '7days', label: '7 Dias' },
              { id: '14days', label: '14 Dias' },
              { id: '30days', label: '30 Dias' },
            ] as { id: ChartTimeRange; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => handleRangeSelect(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition whitespace-nowrap ${
                activeTimeRange === item.id
                  ? 'bg-[#111111] dark:bg-[#FF5A36] text-white shadow-xs font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Container - responsive without horizontal overflow */}
      <div className="w-full overflow-hidden my-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
        >
          <defs>
            <linearGradient id="coralAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5A36" stopOpacity={isDark ? 0.28 : 0.2} />
              <stop offset="100%" stopColor="#FF5A36" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          {[70, 100, 140, 180, 240].map((bgVal) => {
            const y = getY(bgVal);
            return (
              <g key={bgVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={isDark ? '#27272A' : '#F1F1F3'}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 3}
                  fontSize="9.5"
                  textAnchor="end"
                  fill={isDark ? '#71717A' : '#A1A1AA'}
                  className="font-mono font-medium"
                >
                  {bgVal}
                </text>
              </g>
            );
          })}

          {/* Target Range Highlight (70 - 180 mg/dL) */}
          <rect
            x={padLeft}
            y={targetTopY}
            width={chartW}
            height={targetHeight}
            fill={isDark ? '#27272A' : '#F8F8F9'}
            fillOpacity={isDark ? 0.35 : 0.7}
          />
          <line
            x1={padLeft}
            y1={targetTopY}
            x2={width - padRight}
            y2={targetTopY}
            stroke="#FF5A36"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity="0.55"
          />
          <line
            x1={padLeft}
            y1={targetBottomY}
            x2={width - padRight}
            y2={targetBottomY}
            stroke="#111111"
            strokeWidth="1"
            strokeDasharray="4,4"
            opacity={isDark ? '0.4' : '0.25'}
          />
          <text
            x={width - padRight - 5}
            y={targetTopY - 5}
            fontSize="9"
            textAnchor="end"
            fill="#FF5A36"
            className="font-bold"
          >
            Alvo 180
          </text>
          <text
            x={width - padRight - 5}
            y={targetBottomY + 11}
            fontSize="9"
            textAnchor="end"
            fill={isDark ? '#A1A1AA' : '#71717A'}
            className="font-bold"
          >
            Min 70
          </text>

          {/* Soft Coral Gradient Area under Curve */}
          {areaPath && <path d={areaPath} fill="url(#coralAreaGrad)" />}

          {/* Vertical Lollipop Stems for recent points */}
          {points.map((pt, idx) => (
            <line
              key={`stem_${idx}`}
              x1={pt.x}
              y1={pt.y}
              x2={pt.x}
              y2={height - padBottom}
              stroke={isDark ? '#27272A' : '#EAEAEF'}
              strokeWidth="1"
            />
          ))}

          {/* Meals Markers (Carbohydrates) */}
          {filteredMeals.map((meal) => {
            const x = getX(meal.timestamp);
            return (
              <g key={meal.id} className="cursor-pointer group">
                <circle cx={x} cy={height - padBottom - 8} r="7" fill="#111111" />
                <text
                  x={x}
                  y={height - padBottom + 12}
                  fontSize="8.5"
                  textAnchor="middle"
                  fill={isDark ? '#E4E4E7' : '#111111'}
                  fontWeight="bold"
                  className="font-mono"
                >
                  {meal.totalCarbs}g
                </text>
              </g>
            );
          })}

          {/* Insulin Doses Markers */}
          {filteredDoses.map((dose) => {
            const x = getX(dose.timestamp);
            return (
              <g key={dose.id} className="cursor-pointer">
                <circle cx={x} cy={padTop + 8} r="6.5" fill="#FF5A36" />
                <text
                  x={x}
                  y={padTop - 4}
                  fontSize="8.5"
                  textAnchor="middle"
                  fill="#FF5A36"
                  fontWeight="bold"
                  className="font-mono"
                >
                  {dose.units}U
                </text>
              </g>
            );
          })}

          {/* Glycemic Curve Path */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#FF5A36"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Reading Data Points */}
          {points.map((pt, idx) => {
            const isLast = idx === points.length - 1;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => setHoveredPoint(pt)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isLast ? '5.5' : '4'}
                  fill={isLast ? '#FF5A36' : isDark ? '#F4F4F5' : getPointColor(pt.reading.value)}
                  stroke={isDark ? '#161619' : '#ffffff'}
                  strokeWidth="2"
                  className="transition-transform hover:scale-150"
                />
              </g>
            );
          })}

          {/* Latest Point Floating Callout Pill (like in the reference image) */}
          {latestPoint && !hoveredPoint && (
            <g transform={`translate(${Math.min(width - 95, Math.max(55, latestPoint.x))}, ${Math.max(24, latestPoint.y - 26)})`}>
              <rect
                x="-36"
                y="-12"
                width="72"
                height="22"
                rx="11"
                fill="#FF5A36"
              />
              <text
                x="0"
                y="3"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fill="#FFFFFF"
                className="font-mono"
              >
                {latestPoint.reading.value} mg/dL
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip (Sleek Jet-Black Pill Pin) */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-[#111111] text-white px-3.5 py-2.5 rounded-2xl text-xs shadow-xl"
            style={{
              left: Math.min(window.innerWidth - 190, Math.max(16, hoveredPoint.x - 60)),
              top: Math.max(10, hoveredPoint.y - 68),
            }}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[#FF5A36] font-mono text-sm">
                {hoveredPoint.reading.value} mg/dL
              </span>
              <span className="text-[10px] text-neutral-300 font-normal">
                · {getContextLabel(hoveredPoint.reading.context)}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
              {new Date(hoveredPoint.reading.timestamp).toLocaleString([], {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {hoveredPoint.reading.notes && (
              <p className="text-[10px] text-[#FF8A70] mt-0.5 max-w-[160px] truncate">
                {hoveredPoint.reading.notes}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Clean Unboxed Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 mt-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#111111] dark:bg-white inline-block"></span>
            No Alvo (70–180)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A36] inline-block"></span>
            Acima (&gt; 180)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
            Hipo (&lt; 70)
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 sm:mt-0 font-semibold">
          <span className="text-[#111111] dark:text-neutral-200">
            ● CHO (g)
          </span>
          <span className="text-[#FF5A36]">
            ● Insulina (U)
          </span>
        </div>
      </div>
    </div>
  );
};

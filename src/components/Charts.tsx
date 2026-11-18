import React, { useState } from 'react';
import { HealthReading } from '../types/medimitra';

export const BloodPressureChart: React.FC<{
  readings: HealthReading[];
  highSys?: number;
  highDia?: number;
}> = ({ readings, highSys = 140, highDia = 90 }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const sorted = [...readings]
    .filter((r) => r.type === 'bp' && r.systolic && r.diastolic)
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .slice(-14);

  if (sorted.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
        Log your first Blood Pressure reading to view your trend chart.
      </div>
    );
  }

  const W = 640;
  const H = 220;
  const padL = 44;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const minVal = 50;
  const maxVal = 200;

  const yPos = (val: number) =>
    padT + plotH - ((Math.min(maxVal, Math.max(minVal, val)) - minVal) / (maxVal - minVal)) * plotH;
  const xPos = (idx: number) =>
    sorted.length === 1 ? padL + plotW / 2 : padL + (idx / (sorted.length - 1)) * plotW;

  const sysPoints = sorted.map((r, i) => `${xPos(i)},${yPos(r.systolic!)}`).join(' ');
  const diaPoints = sorted.map((r, i) => `${xPos(i)},${yPos(r.diastolic!)}`).join(' ');

  const active = hoverIdx !== null ? sorted[hoverIdx] : sorted[sorted.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-300">
            <span className="w-3 h-0.5 bg-teal-600 inline-block" /> Systolic (mmHg)
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700 dark:text-sky-300">
            <span className="w-3 h-0.5 bg-sky-600 inline-block" /> Diastolic (mmHg)
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block" /> Threshold ({highSys}/{highDia})
          </span>
        </div>
        {active && (
          <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
            {new Date(active.measuredAt).toLocaleDateString()} · {active.systolic}/{active.diastolic} mmHg
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56 overflow-visible" role="img" aria-label="Blood pressure trend chart">
        {[60, 90, 120, 140, 180].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              y1={yPos(v)}
              x2={W - padR}
              y2={yPos(v)}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={yPos(v) + 4}
              textAnchor="end"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Threshold dashed lines */}
        <line
          x1={padL}
          y1={yPos(highSys)}
          x2={W - padR}
          y2={yPos(highSys)}
          stroke="#f59e0b"
          strokeDasharray="5 4"
          strokeWidth="1.5"
        />
        <line
          x1={padL}
          y1={yPos(highDia)}
          x2={W - padR}
          y2={yPos(highDia)}
          stroke="#0284c7"
          strokeDasharray="4 4"
          strokeWidth="1.2"
        />

        {sorted.length > 1 && (
          <>
            <polyline fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={sysPoints} />
            <polyline fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={diaPoints} />
          </>
        )}

        {sorted.map((r, i) => (
          <g key={r.id} onMouseEnter={() => setHoverIdx(i)} onClick={() => setHoverIdx(i)} className="cursor-pointer">
            <circle
              cx={xPos(i)}
              cy={yPos(r.systolic!)}
              r={hoverIdx === i ? 6 : 4.5}
              fill={r.flagged ? '#e11d48' : '#0d9488'}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle
              cx={xPos(i)}
              cy={yPos(r.diastolic!)}
              r={hoverIdx === i ? 6 : 4.5}
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={xPos(i)}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
            >
              {new Date(r.measuredAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const GlucoseChart: React.FC<{
  readings: HealthReading[];
  fastingMax?: number;
  postMealMax?: number;
}> = ({ readings, fastingMax = 125, postMealMax = 180 }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const sorted = [...readings]
    .filter((r) => r.type === 'glucose' && r.glucoseValue)
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .slice(-14);

  if (sorted.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
        Log your first Blood Glucose reading to view your trend chart.
      </div>
    );
  }

  const W = 640;
  const H = 220;
  const padL = 44;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const minVal = 40;
  const maxVal = 300;

  const yPos = (val: number) =>
    padT + plotH - ((Math.min(maxVal, Math.max(minVal, val)) - minVal) / (maxVal - minVal)) * plotH;
  const xPos = (idx: number) =>
    sorted.length === 1 ? padL + plotW / 2 : padL + (idx / (sorted.length - 1)) * plotW;

  const points = sorted.map((r, i) => `${xPos(i)},${yPos(r.glucoseValue!)}`).join(' ');
  const active = hoverIdx !== null ? sorted[hoverIdx] : sorted[sorted.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-300">
            <span className="w-3 h-0.5 bg-teal-600 inline-block" /> Glucose (mg/dL)
          </span>
          <span className="text-emerald-700 dark:text-emerald-300">
            Target Band: 70–{fastingMax} fasting · &lt;{postMealMax} post-meal
          </span>
        </div>
        {active && (
          <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
            {new Date(active.measuredAt).toLocaleDateString()} · {active.glucoseValue} mg/dL ({active.glucoseContext?.replace('_', ' ')})
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56 overflow-visible" role="img" aria-label="Blood glucose trend chart">
        {/* Safe fasting zone band */}
        <rect
          x={padL}
          y={yPos(fastingMax)}
          width={plotW}
          height={Math.max(4, yPos(70) - yPos(fastingMax))}
          fill="#10b981"
          fillOpacity="0.09"
        />

        {[70, 125, 180, 250].map((v) => (
          <g key={v}>
            <line
              x1={padL}
              y1={yPos(v)}
              x2={W - padR}
              y2={yPos(v)}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={yPos(v) + 4}
              textAnchor="end"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
            >
              {v}
            </text>
          </g>
        ))}

        <line
          x1={padL}
          y1={yPos(postMealMax)}
          x2={W - padR}
          y2={yPos(postMealMax)}
          stroke="#f59e0b"
          strokeDasharray="5 4"
          strokeWidth="1.5"
        />

        {sorted.length > 1 && (
          <polyline fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        )}

        {sorted.map((r, i) => (
          <g key={r.id} onMouseEnter={() => setHoverIdx(i)} onClick={() => setHoverIdx(i)} className="cursor-pointer">
            <circle
              cx={xPos(i)}
              cy={yPos(r.glucoseValue!)}
              r={hoverIdx === i ? 6.5 : 5}
              fill={r.flagged ? '#e11d48' : r.glucoseContext === 'fasting' ? '#0d9488' : '#0284c7'}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={xPos(i)}
              y={H - 10}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
            >
              {new Date(r.measuredAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

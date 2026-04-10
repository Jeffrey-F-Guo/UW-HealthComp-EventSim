// src/components/MainChart.jsx
import React, { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const COLORS = {
  queue:   '#00d4ff',
  wait:    '#00ff9d',
  dropped: '#ff3b6b',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-time">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="chart-tooltip-row" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="chart-tooltip-val">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend() {
  return (
    <div className="chart-legend">
      {[
        { key: 'queueSize',   label: 'Queue Size',     color: COLORS.queue },
        { key: 'avgWaitMs',   label: 'Avg Wait (days)',  color: COLORS.wait  },
        { key: 'totalDropped',label: 'Total Dropped',  color: COLORS.dropped },
      ].map(({ key, label, color }) => (
        <div key={key} className="legend-item">
          <span className="legend-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          {label}
        </div>
      ))}
    </div>
  );
}

export function MainChart({ history }) {
  const data = useMemo(() =>
    history.map((f, i) => ({
      t:            i,
      label:        new Date(f.timestamp * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      queueSize:    f.queueSize,
      avgWaitMs:    f.avgWaitMs,
      totalDropped: f.droppedFull + f.droppedExpiry,
    })),
  [history]);

  // Show every Nth label to avoid crowding
  const tickInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="chart-container glass-panel">
      <div className="chart-header">
        <span className="chart-title">SYSTEM THROUGHPUT · BACKLOG &amp; WAIT TIME ANALYSIS</span>
        <CustomLegend />
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradQueue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.queue}   stopOpacity={0.18} />
                <stop offset="95%" stopColor={COLORS.queue}   stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradWait" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.wait}    stopOpacity={0.15} />
                <stop offset="95%" stopColor={COLORS.wait}    stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDrop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={COLORS.dropped} stopOpacity={0.12} />
                <stop offset="95%" stopColor={COLORS.dropped} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,212,255,0.07)"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              interval={tickInterval}
              tick={{ fill: 'rgba(106,138,170,0.8)', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}
              axisLine={{ stroke: 'rgba(0,212,255,0.15)' }}
              tickLine={false}
            />

            {/* Left Y axis: queue + dropped */}
            <YAxis
              yAxisId="left"
              tick={{ fill: 'rgba(106,138,170,0.8)', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
            />

            {/* Right Y axis: wait ms */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'rgba(0,255,157,0.6)', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={v => `${v}days`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="queueSize"
              name="Queue Size"
              stroke={COLORS.queue}
              strokeWidth={2}
              fill="url(#gradQueue)"
              dot={false}
              activeDot={{ r: 4, fill: COLORS.queue, strokeWidth: 0 }}
              isAnimationActive={false}
              style={{ filter: `drop-shadow(0 0 4px ${COLORS.queue})` }}
            />

            <Area
              yAxisId="right"
              type="monotone"
              dataKey="avgWaitMs"
              name="Avg Wait (days)"
              stroke={COLORS.wait}
              strokeWidth={2}
              fill="url(#gradWait)"
              dot={false}
              activeDot={{ r: 4, fill: COLORS.wait, strokeWidth: 0 }}
              isAnimationActive={false}
              style={{ filter: `drop-shadow(0 0 4px ${COLORS.wait})` }}
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalDropped"
              name="Total Dropped"
              stroke={COLORS.dropped}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, fill: COLORS.dropped, strokeWidth: 0 }}
              isAnimationActive={false}
              style={{ filter: `drop-shadow(0 0 3px ${COLORS.dropped})` }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

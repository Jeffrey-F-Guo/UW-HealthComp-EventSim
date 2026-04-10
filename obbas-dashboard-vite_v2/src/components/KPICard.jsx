// src/components/KPICard.jsx
import React, { useEffect, useRef } from 'react';

export function KPICard({ label, value, unit, trend, trendLabel, accent, subLabel }) {
  const prevRef = useRef(value);
  const flashRef = useRef(null);

  useEffect(() => {
    if (prevRef.current !== value && flashRef.current) {
      flashRef.current.classList.remove('kpi-flash');
      void flashRef.current.offsetWidth; // reflow
      flashRef.current.classList.add('kpi-flash');
    }
    prevRef.current = value;
  }, [value]);

  const isGood = trend < 0;
  const isBad  = trend > 0;
  const trendClass = isGood ? 'trend-good' : isBad ? 'trend-bad' : 'trend-neutral';
  const trendArrow = isGood ? '↓' : isBad ? '↑' : '—';

  return (
    <div className={`kpi-card kpi-accent-${accent}`} ref={flashRef}>
      <div className="kpi-accent-bar" />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-row">
        <span className="kpi-value">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {/* <div className={`kpi-trend ${trendClass}`}>
        {trendArrow} {Math.abs(trend).toFixed(1)}% {trendLabel}
      </div> */}
      {subLabel && <div className="kpi-sub">{subLabel}</div>}
    </div>
  );
}

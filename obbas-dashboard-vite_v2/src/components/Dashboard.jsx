// src/components/Dashboard.jsx
//
// Top-level dashboard component.
// Props:
//   wsUrl (string) – WebSocket URL, default 'ws://localhost:9000/ws'
//
// The dashboard connects to your Python server via useSimWebSocket and
// distributes live data down to child components.

import React, { useState, useEffect, useMemo } from 'react';
import { useSimWebSocket } from '../hooks/useSimWebSocket';
import { KPICard }        from './KPICard';
import { MainChart }      from './MainChart';
import { OfficesSidebar } from './OfficesSidebar';
import { RegionMap }      from './RegionMap';

// ─── baseline snapshot (used to compute % change trends) ────────────────────
const BASELINE = {
  queueSize:     3742,
  avgWaitMs:     417,
  droppedExpiry: 1742,
  droppedFull:   468,
};

function pctChange(current, base) {
  if (!base) return 0;
  return ((current - base) / base) * 100;
}

// // ─── Mode toggle ─────────────────────────────────────────────────────────────
// function ModeToggle({ obbas, onToggle }) {
//   return (
//     <div className="mode-toggle-wrap">
//       <span className={`toggle-label ${!obbas ? 'active' : 'inactive'}`}>BASELINE MODEL</span>
//       <button className="toggle-switch" onClick={onToggle} aria-pressed={obbas}>
//         <div className={`toggle-track ${obbas ? 'on' : 'off'}`}>
//           <div className={`toggle-thumb ${obbas ? 'on' : 'off'}`} />
//         </div>
//       </button>
//       <span className={`toggle-label ${obbas ? 'active' : 'inactive'}`}>OBBAS BILL ACTIVE</span>
//     </div>
//   );
// }

// ─── Sim clock ───────────────────────────────────────────────────────────────
function useSimClock() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `T+${hh}:${mm}:${ss}`;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export default function Dashboard({ wsUrl = 'ws://localhost:9000/ws' }) {
  const { connected, lastFrame, history, error, send } = useSimWebSocket(wsUrl);
  const [obbas, setObbas] = useState(true);
  const clock = useSimClock();

  // Notify server when toggle changes (informational only — Python doesn't
  // currently act on this, but it's here if you want to add that later)
  function handleToggle() {
    const next = !obbas;
    setObbas(next);
  }

  // Notify server when an office slider/toggle changes.
  // OfficesSidebar already formats this as the exact UPDATE_CONFIG
  // message Python expects, so we send it straight through.
  function handleOfficeChange(msg) {
    send(msg);
  }

  // Current displayed values: use live frame if connected, else zeros
  const cur = useMemo(() => ({
    queueSize:     lastFrame?.queueSize     ?? 0,
    avgWaitMs:     lastFrame?.avgWaitMs     ?? 0,
    droppedExpiry: lastFrame?.droppedExpiry ?? 0,
    droppedFull:   lastFrame?.droppedFull   ?? 0,
    totalProcessed: lastFrame?.totalProcessed ?? 0,
  }), [lastFrame]);

  const trendLabel = obbas ? 'vs baseline' : 'BASELINE';

  return (
    <div className="dashboard">
      {/* Scanline + corner HUD decorations */}
      <div className="scanline" />
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <div className="logo-mark">⊕</div>
          <div className="title-block">
            <h1 className="title-main">
              <span className="title-accent">OBBAS</span> Policy Impact Simulator
            </h1>
            <p className="title-sub">
              WA STATE HEALTH INSURANCE RENEWAL · DISCRETE EVENT SIMULATION ENGINE
            </p>
          </div>
        </div>

        {/* <ModeToggle obbas={obbas} onToggle={handleToggle} /> */}

        <div className="header-right">
          <div className="conn-status">
            <span className={`conn-dot ${connected ? 'live' : error ? 'error' : 'connecting'}`} />
            <span className="conn-label">
              {connected ? 'LIVE' : error ? 'DISCONNECTED' : 'CONNECTING…'}
            </span>
            {!connected && (
              <span className="conn-url">{wsUrl}</span>
            )}
          </div>
          <div className="sim-clock">{clock}</div>
        </div>
      </header>

      {/* ── KPI ROW ────────────────────────────────────────────────────── */}
      <div className="kpi-row">
        <KPICard
          label="Active Pending Queue"
          value={cur.queueSize}
          accent="cyan"
          trend={obbas ? pctChange(cur.queueSize, BASELINE.queueSize) : 0}
          trendLabel={trendLabel}
          subLabel="policies awaiting review"
        />
        <KPICard
          label="Avg Processing Latency (days)"
          value={cur.avgWaitMs}
          unit="days"
          accent="green"
          trend={obbas ? pctChange(cur.avgWaitMs, BASELINE.avgWaitMs) : 0}
          trendLabel={trendLabel}
          subLabel="per renewal event"
        />
        <KPICard
          label="Procedural Denials (Time)"
          value={cur.droppedExpiry}
          accent="amber"
          trend={obbas ? pctChange(cur.droppedExpiry, BASELINE.droppedExpiry) : 0}
          trendLabel={trendLabel}
          subLabel="expired without response"
        />
        <KPICard
          label="Procedural Denials (Full)"
          value={cur.droppedFull}
          accent="red"
          trend={obbas ? pctChange(cur.droppedFull, BASELINE.droppedFull) : 0}
          trendLabel={trendLabel}
          subLabel="complete process failures"
        />
        <KPICard
          label="Total Processed"
          value={cur.totalProcessed}
          accent="purple"
          trend={obbas ? pctChange(cur.totalProcessed, BASELINE.totalProcessed) : 0}
          trendLabel={trendLabel}
          subLabel="Successfully processed policies"
        />
      </div>

      {/* ── MAIN LAYOUT ────────────────────────────────────────────────── */}
      <div className="main-layout">
        <div className="sidebar-left">
          <OfficesSidebar onOfficeChange={handleOfficeChange} />
          {/* <RegionMap lastFrame={lastFrame} /> */}
        </div>
        <MainChart history={history} />
      </div>
    </div>
  );
}

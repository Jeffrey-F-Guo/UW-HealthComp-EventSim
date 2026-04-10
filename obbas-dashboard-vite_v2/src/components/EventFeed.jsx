// src/components/EventFeed.jsx
import React, { useEffect, useRef, useState } from 'react';

let lineId = 0;
const OFFICES = ['Seattle', 'Spokane', 'Tacoma', 'Bellingham', 'Olympia', 'Yakima'];

function randInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function randId() { return Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + randInt(1000, 9999); }
function randOffice() { return OFFICES[randInt(0, OFFICES.length - 1)]; }

function syntheticLine(frame) {
  const office = randOffice();
  const policyId = randId();
  const pool = [
    () => ({ tag: 'OK',   msg: `Thread-${randInt(1,16)}: Policy ${policyId} · ${office} → AUTO_RENEW complete (${randInt(180,500)}ms)` }),
    () => ({ tag: 'OK',   msg: `Eligibility check passed · Member ${policyId} · coverage continuous` }),
    () => ({ tag: 'INFO', msg: `OBBAS rule-engine: complexity ${randInt(1,10)}/10 → ${frame?.queueSize > 2000 ? 'STANDARD_PATH' : 'SIMPLIFIED_PATH'}` }),
    () => ({ tag: 'INFO', msg: `Batch ${randId().slice(0,6)} dispatched · ${randInt(50,200)} renewals · ${office}` }),
    () => ({ tag: 'WARN', msg: `Queue depth at ${randInt(78,96)}% capacity · ${office} office · throttling initiated` }),
    () => ({ tag: 'WARN', msg: `Manual review backlog: ${randInt(120,400)} items · est. clearance ${randInt(4,14)}h` }),
    () => ({ tag: 'ERR',  msg: `Policy ${policyId} · PROCEDURAL_DENIAL_TIME · agent unresponsive after ${randInt(28,72)}d` }),
    () => ({ tag: 'ERR',  msg: `Packet dropped (queue full) · ${office} · overflow count +1` }),
  ];
  return pool[randInt(0, pool.length - 1)]();
}

function tagClass(tag) {
  return { OK: 'tag-ok', INFO: 'tag-info', WARN: 'tag-warn', ERR: 'tag-err' }[tag] ?? 'tag-info';
}

export function EventFeed({ lastFrame }) {
  const [lines, setLines] = useState([]);
  const bodyRef = useRef(null);
  const prevFrameRef = useRef(null);

  // Generate synthetic log lines every ~1.2s and also on new real frames
  useEffect(() => {
    function addLine(frame) {
      const now = new Date();
      const ts = now.toLocaleTimeString('en-US', { hour12: false });
      const { tag, msg } = syntheticLine(frame);
      setLines(prev => {
        const next = [{ id: lineId++, ts, tag, msg }, ...prev];
        return next.length > 60 ? next.slice(0, 60) : next;
      });
    }

    // Synthetic ticker
    const interval = setInterval(() => addLine(lastFrame), 1200);

    // Extra line on real data arrival
    if (lastFrame && lastFrame !== prevFrameRef.current) {
      prevFrameRef.current = lastFrame;
      addLine(lastFrame);
    }

    return () => clearInterval(interval);
  }, [lastFrame]);

  return (
    <div className="event-feed glass-panel">
      <div className="feed-header">
        <span className="feed-title">Live Event Feed</span>
        <span className="feed-streaming">● STREAMING</span>
      </div>
      <div className="feed-body" ref={bodyRef}>
        {lines.map(line => (
          <div key={line.id} className="feed-line">
            <span className="feed-ts">{line.ts}</span>
            {' '}
            <span className={`feed-tag ${tagClass(line.tag)}`}>{line.tag.padEnd(4)}</span>
            {' '}
            <span className="feed-msg">{line.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

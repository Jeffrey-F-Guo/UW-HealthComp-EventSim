// src/components/OfficesSidebar.jsx
//
// Sliders map directly to your Python OfficeConfig fields:
//   volume   → packets_per_sec  (slider 0–20, sent as float)
//   complexity → complexity     (slider 1–10, sent as int)
//   manual   → manual_ratio     (slider 0–100%, sent as 0.0–1.0 float)
//
// Python expects:
//   { "type": "UPDATE_CONFIG", "zone_id": 1, "payload": { "pps": 8, "complexity": 3, "manual": 0.2 } }

import React, { useState, useCallback } from 'react';

// zone_id 1–5 maps to index 0–4, matching your Python configs array
const INITIAL_OFFICES = [
  { zone_id: 1, name: 'Seattle',    type: 'Urban',     pps: 8,  complexity: 3, manual: 20 },
  { zone_id: 2, name: 'Spokane',    type: 'Urban',     pps: 8,  complexity: 3, manual: 20 },
  { zone_id: 3, name: 'Tacoma',     type: 'Metro',     pps: 8,  complexity: 3, manual: 20 },
  { zone_id: 4, name: 'Bellingham', type: 'Regional',  pps: 8,  complexity: 3, manual: 20 },
  { zone_id: 5, name: 'Olympia',    type: 'State Hub', pps: 8,  complexity: 3, manual: 20 },
];

function SliderRow({ name, value, displayValue, min, max, onChange }) {
  return (
    <div className="slider-item">
      <div className="slider-head">
        <span className="slider-name">{name}</span>
        <span className="slider-val">{displayValue ?? value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="sim-slider"
      />
    </div>
  );
}

export function OfficesSidebar({ onOfficeChange }) {
  const [offices, setOffices] = useState(INITIAL_OFFICES);

  const update = useCallback((zone_id, key, val) => {
    setOffices(prev => {
      const next = prev.map(o => o.zone_id === zone_id ? { ...o, [key]: val } : o);
      const updated = next.find(o => o.zone_id === zone_id);
      // Send to Python in the exact format it expects
      onOfficeChange?.({
        type: 'UPDATE_CONFIG',
        zone_id,
        payload: {
          pps:        updated.pps,
          complexity: updated.complexity,
          manual:     updated.manual / 100,   // convert % → 0.0–1.0
        },
      });
      return next;
    });
  }, [onOfficeChange]);

  return (
    <>
      <div className="panel-header">
        <span>Office Controls</span>
        <div className="panel-header-line" />
      </div>
      <div className="offices-scroll">
        {offices.map((o, idx) => (
          <div key={o.zone_id} className="office-card glass-panel" style={{ animationDelay: `${idx * 60}ms` }}>
            <div className="office-card-header">
              <div>
                <div className="office-name">{o.name}</div>
                <div className="office-type">{o.type} · ZONE {String(o.zone_id).padStart(2, '0')}</div>
              </div>
            </div>
            <div className="slider-group">
              <SliderRow
                name="Packets / sec"
                value={o.pps}
                displayValue={`${o.pps} pps`}
                min={0} max={20}
                onChange={v => update(o.zone_id, 'pps', v)}
              />
              <SliderRow
                name="Case Complexity"
                value={o.complexity}
                displayValue={`${o.complexity} / 10`}
                min={1} max={10}
                onChange={v => update(o.zone_id, 'complexity', v)}
              />
              <SliderRow
                name="Manual Processing"
                value={o.manual}
                displayValue={`${o.manual}%`}
                min={0} max={100}
                onChange={v => update(o.zone_id, 'manual', v)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

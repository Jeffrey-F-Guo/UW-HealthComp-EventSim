import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// --- Types ---
interface Zone {
  id: number;
  name: string;
  pps: number;        // Packets per second
  complexity: number; // 1-10
  manual: number;     // 0.0 - 1.0 (Ratio)
}

interface Metrics {
  queue_len: number;
  total_dropped: number;
  avg_latency: number;
}

interface WebSocketMessage {
  type: string;
  payload: any;
}

// --- Initial Data ---
const INITIAL_ZONES: Zone[] = [
  { id: 1, name: "Seattle (Urban)", pps: 8, complexity: 3, manual: 0.2 },
  { id: 2, name: "Spokane (Urban)", pps: 8, complexity: 3, manual: 0.2 },
  { id: 3, name: "Yakima (Rural)", pps: 8, complexity: 3, manual: 0.2 },
  { id: 4, name: "Bellingham (North)", pps: 8, complexity: 3, manual: 0.2 },
  { id: 5, name: "Olympia (Capital)", pps: 8, complexity: 3, manual: 0.2 },
];

function App() {
  const [metrics, setMetrics] = useState<Metrics>({ queue_len: 0, total_dropped: 0, avg_latency: 0 });
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);

  // --- WebSocket Connection ---
  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:9000/ws');

    socketRef.current.onopen = () => {
      console.log("✅ Connected to Simulation Bridge");
      setIsConnected(true);
    };

    socketRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        if (data.type === "METRICS_UPDATE") {
          setMetrics(data.payload as Metrics);
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    socketRef.current.onclose = () => setIsConnected(false);

    return () => {
      // if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // --- Send Updates to Python ---
  const handleZoneChange = (zoneId: number, field: keyof Zone, value: number) => {
    // 1. Update Local State
    const newZones = zones.map(z => 
      z.id === zoneId ? { ...z, [field]: value } : z
    );
    setZones(newZones);

    // 2. Send Command to Python
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "UPDATE_CONFIG",
        zone_id: zoneId,
        payload: { [field]: value }
      }));
    }
  };

  // Helper to determine Metric Color
  const getStatusColor = (val: number, thresholds: { warning: number; critical: number }) => {
    if (val >= thresholds.critical) return "status-critical";
    if (val >= thresholds.warning) return "status-warning";
    return "status-normal";
  };

  return (
    <div className="dashboard-container">
      <header>
        <h1>Medicaid Renewal Simulation</h1>
        <p style={{ color: isConnected ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
          ● System Status: {isConnected ? "ONLINE" : "OFFLINE (Start Python Bridge)"}
        </p>
      </header>

      {/* --- Top Level Metrics --- */}
      <div className="metrics-header">
        <div className="metric-card">
          <div className="metric-label">Active Queue</div>
          <div className={`metric-value ${getStatusColor(metrics.queue_len, { warning: 50, critical: 100 })}`}>
            {metrics.queue_len}
          </div>
          <div className="metric-sub">Applications Pending</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Avg Wait Time</div>
          <div className={`metric-value ${getStatusColor(metrics.avg_latency, { warning: 200, critical: 500 })}`}>
            {metrics.avg_latency} <span style={{fontSize: '1rem'}}>ms</span>
          </div>
          <div className="metric-sub">Processing Latency</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Lost Coverage</div>
          <div className="metric-value status-critical">
            {metrics.total_dropped}
          </div>
          <div className="metric-sub">Procedural Denials (Drops)</div>
        </div>
      </div>

      {/* --- Zone Controls --- */}
      <h2 style={{borderBottom: '1px solid #333', paddingBottom: '10px'}}>Office Controls</h2>
      <div className="zones-grid">
        {zones.map(zone => (
          <ZoneController 
            key={zone.id} 
            zone={zone} 
            onChange={handleZoneChange} 
          />
        ))}
      </div>
    </div>
  );
}

// --- Sub-Component: Individual Zone Card ---
interface ZoneControllerProps {
  zone: Zone;
  onChange: (id: number, field: keyof Zone, value: number) => void;
}

const ZoneController: React.FC<ZoneControllerProps> = ({ zone, onChange }) => {
  return (
    <div className="zone-card">
      <div className="zone-header">
        <span className="zone-title">{zone.name}</span>
        <span className="zone-id">ID: {zone.id}</span>
      </div>

      {/* Slider 1: Packet Rate */}
      <div className="control-group">
        <div className="control-label">
          <span>Renewal Volume (Rate)</span>
          <span className="value-badge">{zone.pps} /sec</span>
        </div>
        <input 
          type="range" 
          min="0" max="20" 
          className="slider"
          value={zone.pps}
          onChange={(e) => onChange(zone.id, 'pps', parseInt(e.target.value))}
        />
      </div>

      {/* Slider 2: Complexity */}
      <div className="control-group">
        <div className="control-label">
          <span>Form Complexity</span>
          <span className="value-badge">Lvl {zone.complexity}</span>
        </div>
        <input 
          type="range" 
          min="1" max="10" 
          className="slider"
          value={zone.complexity}
          onChange={(e) => onChange(zone.id, 'complexity', parseInt(e.target.value))}
        />
      </div>

      {/* Slider 3: Manual Ratio (LAMP Tool) */}
      <div className="control-group">
        <div className="control-label">
          <span>Manual Processing %</span>
          <span className="value-badge">{Math.round(zone.manual * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0" max="1" step="0.1"
          className="slider"
          style={{ accentColor: zone.manual < 0.5 ? '#22c55e' : '#ef4444' }}
          value={zone.manual}
          onChange={(e) => onChange(zone.id, 'manual', parseFloat(e.target.value))}
        />
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
          {zone.manual > 0.5 ? "⚠️ Human Review Dominant" : "✅ LAMP Automation Active"}
        </div>
      </div>
    </div>
  );
};

export default App;
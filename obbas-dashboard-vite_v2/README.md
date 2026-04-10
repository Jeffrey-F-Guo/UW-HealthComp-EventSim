# OBBAS Policy Impact Simulator — React Dashboard

A dark-mode, real-time simulation dashboard that visualizes health insurance
renewal processing data streamed from a Python WebSocket server.

---

## Quick Start

### 1. Install & run the React app

```bash
npm install
npm start          # opens http://localhost:3000
```

### 2. Run the example Python server (optional)

```bash
pip install websockets
python python_server_example.py
```

The dashboard auto-connects to `ws://localhost:9000/ws` and will keep retrying
if the server isn't up yet — no manual refresh needed.

---

## WebSocket Protocol

### Python → React  (each frame)

Send a JSON object at whatever frequency your simulation runs:

```json
{
  "queue_size":     2847,
  "avg_wait_ms":    342,
  "dropped_full":   487,
  "dropped_expiry": 1203,
  "timestamp":      1700000000.0,
  "obbas_active":   true
}
```

| Field | Type | Description |
|---|---|---|
| `queue_size` | int | Active Pending Queue KPI |
| `avg_wait_ms` | int | Avg Processing Latency KPI |
| `dropped_full` | int | Procedural Denials (Full) KPI |
| `dropped_expiry` | int | Procedural Denials (Time) KPI |
| `timestamp` | float | Unix seconds (optional) |
| `obbas_active` | bool | Syncs the mode toggle (optional) |

### React → Python  (control messages)

The dashboard sends these back when the user interacts:

**Mode toggle:**
```json
{ "type": "set_mode", "obbas_active": true }
```

**Office slider/toggle change:**
```json
{
  "type": "office_update",
  "office": {
    "id": "sea",
    "name": "Seattle",
    "volume": 78,
    "complexity": 62,
    "manual": 35,
    "auto": true
  }
}
```

---

## Configuring the WebSocket URL

**Environment variable (recommended):**

Create `.env` in the project root:
```
VITE_WS_URL=ws://your-server:8765
```

**Or pass as a prop directly in `src/index.js`:**
```jsx
<Dashboard wsUrl="ws://192.168.1.100:8765" />
```

---

## Project Structure

```
src/
  hooks/
    useSimWebSocket.js    ← WebSocket connection + auto-reconnect
  components/
    Dashboard.jsx         ← Top-level layout, owns all state
    KPICard.jsx           ← Individual metric card
    MainChart.jsx         ← Recharts live line chart
    OfficesSidebar.jsx    ← Sliders and toggles per office
    RegionMap.jsx         ← Canvas dot-matrix node map
    EventFeed.jsx         ← Simulated terminal log feed
  index.css               ← All styles (CSS variables, glass, etc.)
  index.js                ← React root entry point
python_server_example.py  ← Drop-in Python WS server template
```

---

## Baseline Comparison

The trend indicators on each KPI card compare the live value against a
hard-coded baseline snapshot in `Dashboard.jsx`:

```js
const BASELINE = {
  queueSize:     3742,
  avgWaitMs:     417,
  droppedExpiry: 1742,
  droppedFull:   468,
};
```

Update these numbers to match your actual baseline run data.

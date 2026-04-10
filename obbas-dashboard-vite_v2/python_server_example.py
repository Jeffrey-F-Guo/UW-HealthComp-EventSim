"""
python_server_example.py
────────────────────────
A minimal example showing how to broadcast simulation frames to the React
dashboard over WebSocket.

Install:  pip install websockets
Run:      python python_server_example.py

The dashboard connects to ws://localhost:9000/ws by default.
"""

import asyncio
import json
import time
import math
import random
import websockets

# ── Simulation state (replace with your real DES engine) ─────────────────────
class SimState:
    def __init__(self):
        self.t          = 0
        self.obbas      = True          # toggled by the React UI

    def tick(self):
        """Produce one frame of simulated data. Replace with real DES output."""
        self.t += 1
        t = self.t
        scale = 1.0 if self.obbas else 1.35   # OBBAS reduces load

        queue_size     = max(0, int(2400 * scale + 600 * scale * math.sin(t * 0.05) + random.randint(-200, 200)))
        avg_wait_ms    = max(0, int(280  * scale + 80  * scale * math.cos(t * 0.07) + random.randint(-30, 30)))
        dropped_full   = max(0, int(15   * scale + 8   * scale * math.sin(t * 0.03) + random.randint(-3, 3)))
        dropped_expiry = max(0, int(40   * scale + 20  * scale * math.cos(t * 0.04) + random.randint(-5, 5)))

        return {
            "queue_size":     queue_size,      # → KPI: Active Pending Queue
            "avg_wait_ms":    avg_wait_ms,     # → KPI: Avg Processing Latency
            "dropped_full":   dropped_full,    # → KPI: Procedural Denials (Full)
            "dropped_expiry": dropped_expiry,  # → KPI: Procedural Denials (Time)
            "timestamp":      time.time(),
            "obbas_active":   self.obbas,
        }

sim = SimState()
CLIENTS: set = set()

# ── Connection handler ────────────────────────────────────────────────────────
async def handler(websocket):
    CLIENTS.add(websocket)
    print(f"[+] Client connected  ({len(CLIENTS)} total)")
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
                # React UI sends: {"type": "set_mode", "obbas_active": true/false}
                if msg.get("type") == "set_mode":
                    sim.obbas = bool(msg.get("obbas_active", True))
                    print(f"    Mode → {'OBBAS ACTIVE' if sim.obbas else 'BASELINE'}")
                # React UI sends: {"type": "office_update", "office": {...}}
                elif msg.get("type") == "office_update":
                    office = msg.get("office", {})
                    print(f"    Office update: {office.get('name')} vol={office.get('volume')}")
            except json.JSONDecodeError:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        CLIENTS.discard(websocket)
        print(f"[-] Client disconnected ({len(CLIENTS)} total)")

# ── Broadcast loop ────────────────────────────────────────────────────────────
async def broadcast_loop():
    while True:
        if CLIENTS:
            frame = sim.tick()
            payload = json.dumps(frame)
            # Fan out to all connected clients
            await asyncio.gather(
                *[ws.send(payload) for ws in CLIENTS],
                return_exceptions=True
            )
        await asyncio.sleep(1.0)   # 1 frame per second; adjust as needed

# ── Entry point ───────────────────────────────────────────────────────────────
async def main():
    print("OBBAS Simulation Server")
    print("  WebSocket: ws://localhost:9000/ws")
    print("  Waiting for React dashboard to connect…\n")
    async with websockets.serve(handler, "localhost", 8765):
        await broadcast_loop()

if __name__ == "__main__":
    asyncio.run(main())

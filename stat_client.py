import socket
import struct
import time
import random
import threading
import asyncio
import sys
from dataclasses import dataclass
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

SERVER_IP = '127.0.0.1'
SERVER_PORT = 8080
REACT_PORT = 9000
REPORT_PORT = 5050

# Params to configure each office
@dataclass
class OfficeConfig:
    zone_id: int
    packets_per_sec: float
    complexity: int
    manual_ratio: float

# data struct to hold report metrics
@dataclass
class ServerReport:
    queue_len: int = 0
    total_dropped: int = 0
    avg_latency: int = 0

configs = [
    OfficeConfig(zone_id=1, packets_per_sec=8, complexity=3, manual_ratio=0.2),
    OfficeConfig(zone_id=2, packets_per_sec=8, complexity=3, manual_ratio=0.2),
    OfficeConfig(zone_id=3, packets_per_sec=8, complexity=3, manual_ratio=0.2),
    OfficeConfig(zone_id=4, packets_per_sec=8, complexity=3, manual_ratio=0.2),
    OfficeConfig(zone_id=5, packets_per_sec=8, complexity=3, manual_ratio=0.2),
]

config_lock = threading.Lock() # prevent race conditions when updating and using configs
report_lock = threading.Lock() # prevent race conditions between threads updating report
report = ServerReport()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OfficeClient(threading.Thread):
    def __init__(self, zone_id):
        super().__init__()
        self.zone_id = zone_id
        self.packet_id = 1
        self.running = True
        self.sock = None

    def create_packet(self, complexity, manual_ratio):
        timestamp_ms = int(time.time() * 1000)
        
        # generate case complexity from gaussian
        comp = int(random.gauss(complexity, 2))
        # clamp values to 1-10 scale
        comp = max(1, min(10, comp))
        
        is_manual = 1 if random.random() < manual_ratio else 0

        try:
            return struct.pack('>IIQBB', 
                               self.packet_id, 
                               self.zone_id, 
                               timestamp_ms, 
                               comp, 
                               is_manual)
        except struct.error as e:
            print(f"[Zone {self.zone_id}] Pack error: {e}")
            return None

    def connect(self):
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.connect((SERVER_IP, SERVER_PORT))
            print(f"[Zone {self.zone_id}] Connected to Server on port {SERVER_PORT}")
            return True
        except ConnectionRefusedError:
            print(f"[Zone {self.zone_id}] Connection Failed")
            return False

    def run(self):
        while self.running:
            if not self.connect():
                time.sleep(2)  # Wait before retrying connection
                continue

            try:
                while self.running:
                    with config_lock:
                        cfg = configs[self.zone_id - 1]
                        pps = cfg.packets_per_sec
                        complexity = cfg.complexity
                        manual_ratio = cfg.manual_ratio
                    if pps > 0:
                        sleep_time = random.expovariate(pps)
                        time.sleep(sleep_time)
                        payload = self.create_packet(complexity, manual_ratio)
                        if payload:
                            self.sock.sendall(payload)
                            self.packet_id += 1

                    else:
                        time.sleep(0.1)
    


            except BrokenPipeError:
                print(f"[Zone {self.zone_id}] Server disconnected")
            except Exception as e:
                print(f"[Zone {self.zone_id}] Error: {e}")
            finally:
                if self.sock:
                    self.sock.close()

office_clients = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("React client connected")
    
    try:
        while True:
            await websocket.send_json({
                "type": "METRICS_UPDATE",
                "payload": {
                    "queue_len": report.queue_len,
                    "total_dropped": report.total_dropped,
                    "avg_latency": report.avg_latency
                }
            })
            
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=0.05)
                if data["type"] == "UPDATE_CONFIG":
                    zone_id = data.get("zone_id")
                    if zone_id and 1 <= zone_id <= 5:
                        payload = data.get("payload", {})
                        
                        with config_lock:
 
                            if "pps" in payload:
                                configs[zone_id - 1].packets_per_sec = payload["pps"]
                            if "complexity" in payload:
                                configs[zone_id - 1].complexity = payload["complexity"]
                            if "manual" in payload:
                                configs[zone_id - 1].manual_ratio = payload["manual"]
                        
            except asyncio.TimeoutError:
                pass
                
            await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        print("React client disconnected")
def report_listener():
    while True:
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((SERVER_IP, REPORT_PORT))

            while True:
                data = sock.recv(12)
                if not data:
                    print("Report channel disconnected")
                    break
                queue, dropped, latency = struct.unpack('>III', data)
                with report_lock:
                    report.queue_len = queue
                    report.total_dropped = dropped
                    report.avg_latency = latency

        except (ConnectionRefusedError, ConnectionResetError):
            time.sleep(2)
            continue
        finally:
            if sock: sock.close()


def start_simulation():
    global office_clients
    office_clients = []
    
    print("Starting Medicaid Network Simulation...")
    
    for zone_id in range(1, 6):
        client = OfficeClient(zone_id)
        client.daemon = True
        client.start()
        office_clients.append(client)
    report_thread = threading.Thread(target=report_listener, daemon=True)
    report_thread.start()

def main():
    start_simulation()
    
    print(f"React server starting on port {REACT_PORT}...")
    uvicorn.run(app, host="0.0.0.0", port=REACT_PORT, log_level="error")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Shutting down...")
        for client in office_clients:
            client.running = False
        sys.exit(0)
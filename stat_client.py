import socket
import struct
import time
import random
import sys

# --- Configuration (The "Sliders") ---
SERVER_IP = '127.0.0.1'
SERVER_PORT = 8080

# Simulation Settings
ZONE_ID = 1                 # e.g., 1=Seattle, 2=Spokane
AVG_PACKETS_PER_SEC = 20    # Arrival Rate (Lambda)
MEAN_COMPLEXITY = 5         # Average complexity (1-10)
STD_DEV_COMPLEXITY = 2      # Variance in complexity
MANUAL_RATIO = 0.8          # 80% of packets are Manual, 20% are OCR (LAMP)

def get_poisson_sleep_time(rate):
    """Returns seconds to sleep to simulate Poisson arrival process."""
    if rate <= 0: return 1.0
    return random.expovariate(rate)

def create_packet_data(packet_id):
    """
    Creates the 18-byte binary payload matching the C struct.
    Struct Format: >IIQBB (Big Endian, No Padding)
    """
    # 1. Timestamp (Milliseconds)
    timestamp_ms = time.time_ns() // 1000000  # Convert nanoseconds to milliseconds

    # 2. Complexity (Gaussian Distribution, clamped 1-10)
    complexity = int(random.gauss(MEAN_COMPLEXITY, STD_DEV_COMPLEXITY))
    complexity = max(1, min(10, complexity)) # Clamp between 1 and 10

    # 3. Manual vs OCR (Bernoulli Trial)
    # If random float < 0.8, it's Manual (1). Else OCR (0).
    is_manual = 1 if random.random() < MANUAL_RATIO else 0

    # 4. Pack the data
    # > = Big Endian (Network Order)
    # I = uint32_t (ID)
    # I = uint32_t (Zone)
    # Q = uint64_t (Timestamp)
    # B = uint8_t  (Complexity)
    # B = uint8_t  (Manual)
    try:
        payload = struct.pack('>IIQBB', packet_id, ZONE_ID, timestamp_ms, complexity, is_manual)
        return payload
    except struct.error as e:
        print(f"Packing error: {e}")
        return None

def run_client():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((SERVER_IP, SERVER_PORT))
        print(f"Connected to HCA Server at {SERVER_IP}:{SERVER_PORT}")
        print(f"Simulating Zone {ZONE_ID} with {AVG_PACKETS_PER_SEC} pkts/sec...")
    except ConnectionRefusedError:
        print("Error: Could not connect to server. Is it running?")
        return

    packet_id = 1

    try:
        while True:
            # 1. Generate Packet
            payload = create_packet_data(packet_id)
            
            # 2. Send Data
            if payload:
                sock.sendall(payload)
                # Optional: Print every 100th packet to avoid console spam
                if packet_id % 100 == 0:
                    print(f"[Sent] ID: {packet_id} | Size: {len(payload)} bytes")

            packet_id += 1

            # 3. Wait (Simulate Inter-arrival time)
            sleep_time = get_poisson_sleep_time(AVG_PACKETS_PER_SEC)
            time.sleep(sleep_time)

    except KeyboardInterrupt:
        print("\nStopping simulation...")
    except BrokenPipeError:
        print("\nServer disconnected.")
    finally:
        sock.close()

if __name__ == "__main__":
    run_client()
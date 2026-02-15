#include "Queue.h"
#include <pthread.h>

// TCP server initialization
int init_tcp();

// Packet reception and handling
int recieve_packets();

// Thread management

void* simulate_worker(void *arg);

// Packet processing
int process_packet(MedicaidPacket packet);

// Timing utilities
uint64_t get_current_timestamp_ms();


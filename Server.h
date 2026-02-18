#include "Queue.h"
#include <pthread.h>

// TCP server initialization
int init_tcp(int port);

void *send_metrics(void *arg);
// Thread management
void* simulate_worker(void *arg);

// Packet processing
int process_packet(MedicaidPacket packet);

// Timing utilities
uint64_t get_current_timestamp_ms();

int calculate_ema(uint64_t current_value, uint64_t previous_ema);

// Client connection handling
void *handle_client_connection(void *arg);
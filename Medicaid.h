#include <stdint.h>
#include <string.h>
#include <arpa/inet.h>
#include <sys/socket.h>

#define PACKET_SIZE 18

typedef struct {
    uint32_t id;                // Packet identifier
    uint32_t zone;              // Zone (local office) identifier
    uint64_t timestamp_ms;         // Packet submission time
    // Healthcare hyperparams
    uint8_t complexity;         // Renewal complexity 1-10
    uint8_t manual;             // manual or assisted processing 1-0
} MedicaidPacket;

typedef struct {
    uint32_t current_queue_len; // Backlog of cases to process
    uint32_t total_dropped;     // Total number of cases dropped due to expiration
    uint32_t avg_latency_ms;    // Running average - represents average medicaid processing time
} ServerReport; // 12 Bytes


int serialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size);
int deserialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size);
uint64_t my_htonll(uint64_t val);
uint64_t my_ntohll(uint64_t val);
MedicaidPacket create_medicaid_packet(uint32_t id, uint32_t zone, uint64_t timestamp_ms, uint8_t complexity, uint8_t manual);
int send_medicaid_packet(MedicaidPacket* packet, int sock_fd);
int recv_medicaid_packet(MedicaidPacket* packet, int sock_fd);
int init_packet_struct(MedicaidPacket* packet);
int init_report_struct(ServerReport* report);
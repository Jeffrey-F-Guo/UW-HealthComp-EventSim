#include <stdint.h>
#include <string.h>
#include <arpa/inet.h>

typedef struct {
    uint32_t id;                // Packet identifier
    uint32_t zone;              // Zone (local office) identifier
    uint64_t timestamp_ns;         // Packet submission time
    // Healthcare hyperparams
    uint8_t complexity;         // Renewal complexity 1-10
    uint8_t manual;             // manual or assisted processing 1-0
} MedicaidPacket;


int serialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size);
int deserialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size);
uint64_t my_htonll(uint64_t val);
uint64_t my_ntohll(uint64_t val);
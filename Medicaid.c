# include "Medicaid.h"
int init_packet_struct(MedicaidPacket* packet) {
    if (!packet) {
        return -1;
    }
    memset(packet, 0, sizeof(MedicaidPacket));
    packet->id = 0;
    packet->zone = 0;
    packet->timestamp_ms = 0;
    packet->complexity = 0;
    packet->manual = 0;
    return 0;
}

int init_report_struct(ServerReport* report) {
    if (!report) {
        return -1;
    }
    memset(report, 0, sizeof(ServerReport));
    report->current_queue_len = 0;
    report->total_dropped = 0;
    report->avg_latency_ms = 0;
    return 0;
}
uint64_t my_htonll(uint64_t val) {
    u_int32_t low = htonl(val & 0xFFFFFFFF);
    u_int32_t high = htonl(val >> 32);
    return ((uint64_t)low << 32) | high;
}

uint64_t my_ntohll(uint64_t val) {
    return  my_htonll(val);
}
MedicaidPacket create_medicaid_packet(uint32_t id, uint32_t zone, uint64_t timestamp_ms, uint8_t complexity, uint8_t manual) {
    MedicaidPacket packet;
    packet.id = id;
    packet.zone = zone;
    packet.timestamp_ms = timestamp_ms;
    packet.complexity = complexity;
    packet.manual = manual;
    return packet;
}

int send_medicaid_packet(MedicaidPacket* packet, int sock_fd) {
    uint8_t buffer[PACKET_SIZE];
    int result = serialize_packet(packet, buffer, sizeof(buffer));
    if (result < 0) {
        return -1;
    }
    
    size_t total_sent = 0;
    while (total_sent < PACKET_SIZE) {
        int sent_bytes = send(sock_fd, buffer + total_sent, PACKET_SIZE - total_sent, 0);
        if (sent_bytes <= 0) {
            return -1;
        }
        total_sent += sent_bytes;
    }
    
    return 0;
}

int recv_medicaid_packet(MedicaidPacket* packet, int sock_fd) {
    uint8_t buffer[PACKET_SIZE];
    size_t total_recvd = 0;
    while (total_recvd < PACKET_SIZE) {
        int recvd_bytes = recv(sock_fd, buffer + total_recvd, PACKET_SIZE - total_recvd, 0);
        if (recvd_bytes <= 0) {
            return -1;
        }
        total_recvd += recvd_bytes;
    }
    
    int result = deserialize_packet(packet, buffer, sizeof(buffer));
    if (result < 0) {
        return -1;
    }
    return 0;
}

int serialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size) {
    if (!packet || !buffer || buffer_size < PACKET_SIZE) {
        return -1;
    }

    // A medicaid packet is guaranteed to be 18 bytes
    uint8_t *ptr = buffer;
    
    uint32_t id_net = htonl(packet->id);                
    uint32_t zone_net = htonl(packet->zone);            
    uint64_t timestamp_ms_net = my_htonll(packet->timestamp_ms);       
    uint8_t complexity = packet->complexity;         // one byte, dont need to account for endianess
    uint8_t manual = packet->manual;  


    memcpy(ptr, &id_net, sizeof(packet->id));
    ptr += sizeof(packet->id);

    memcpy(ptr, &zone_net, sizeof(packet->zone));
    ptr += sizeof(packet->zone);

    memcpy(ptr, &timestamp_ms_net, sizeof(packet->timestamp_ms));
    ptr += sizeof(packet->timestamp_ms);

    memcpy(ptr, &complexity, sizeof(packet->complexity));
    ptr += sizeof(packet->complexity);
    
    memcpy(ptr, &manual, sizeof(packet->manual));
    ptr += sizeof(packet->manual);

    return 0; 
}

int deserialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size) {
    if (!packet || !buffer || buffer_size < PACKET_SIZE) {
        return -1;
    }
    uint8_t* ptr = buffer;
    uint32_t id;
    uint32_t zone;
    uint64_t timestamp_ms;
    uint8_t complexity;
    uint8_t manual;

    memcpy(&id, ptr, sizeof(packet->id));
    ptr += sizeof(packet->id);

    memcpy(&zone, ptr, sizeof(packet->zone));
    ptr += sizeof(packet->zone);

    memcpy(&timestamp_ms, ptr, sizeof(packet->timestamp_ms));
    ptr += sizeof(packet->timestamp_ms);

    memcpy(&complexity, ptr, sizeof(packet->complexity));
    ptr += sizeof(packet->complexity);
    
    memcpy(&manual, ptr, sizeof(packet->manual));
    ptr += sizeof(packet->manual);

    packet->id = ntohl(id);
    packet->zone = ntohl(zone);
    packet->timestamp_ms = my_ntohll(timestamp_ms);
    packet->complexity = complexity;
    packet->manual = manual;

    return 0;
}
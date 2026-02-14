# include "Medicaid.h"


uint64_t my_htonll(uint64_t val) {
    u_int32_t low = htonl(val & 0xFFFFFFFF);
    u_int32_t high = htonl(val >> 32);

    return ((uint64_t)low << 32) | high;
}


uint64_t my_ntohll(uint64_t val) {
    return  my_htonll(val);
}
MedicaidPacket create_medicaid_packet(uint32_t id, uint32_t zone, uint32_t timestamp_ns, uint8_t complexity, uint8_t manual) {
    MedicaidPacket packet;
    packet.id = id;
    packet.zone = zone;
    packet.timestamp_ns = timestamp_ns;
    packet.complexity = complexity;
    packet.manual = manual;
    return packet;
}

int send_medicaid_packet(MedicaidPacket* packet, int client_fd) {
    uint8_t buffer[18];
    int result = serialize_packet(packet, buffer, sizeof(buffer));
    if (result < 0) {
        return -1;
    }
    send(client_fd, buffer, sizeof(buffer), 0);
    return 0;
}

int serialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size) {
    if (!packet || !buffer || buffer_size < 18) {
        return -1;
    }

    // A medicaid packet is guaranteed to be 18 bytes
    uint8_t *ptr = buffer;
    
    uint32_t id_net = htonl(packet->id);                
    uint32_t zone_net = htonl(packet->zone);            
    uint64_t timestamp_ns_net = my_htonll(packet->timestamp_ns);       
    uint8_t complexity = packet->complexity;         // one byte, dont need to account for endianess
    uint8_t manual = packet->manual;  


    memcpy(ptr, &id_net, sizeof(packet->id));
    ptr += sizeof(packet->id);

    memcpy(ptr, &zone_net, sizeof(packet->zone));
    ptr += sizeof(packet->zone);

    memcpy(ptr, &timestamp_ns_net, sizeof(packet->timestamp_ns));
    ptr += sizeof(packet->timestamp_ns);

    memcpy(ptr, &complexity, sizeof(packet->complexity));
    ptr += sizeof(packet->complexity);
    
    memcpy(ptr, &manual, sizeof(packet->manual));
    ptr += sizeof(packet->manual);

    return 0; 
}

int deserialize_packet(MedicaidPacket* packet, uint8_t* buffer, size_t buffer_size) {
    if (!packet || !buffer || buffer_size < 18) {
        return -1;
    }
    uint8_t* ptr = buffer;
    uint32_t id;
    uint32_t zone;
    uint64_t timestamp_ns;
    uint8_t complexity;
    uint8_t manual;

    memcpy(&id, ptr, sizeof(packet->id));
    ptr += sizeof(packet->id);

    memcpy(&zone, ptr, sizeof(packet->zone));
    ptr += sizeof(packet->zone);

    memcpy(&timestamp_ns, ptr, sizeof(packet->timestamp_ns));
    ptr += sizeof(packet->timestamp_ns);

    memcpy(&complexity, ptr, sizeof(packet->complexity));
    ptr += sizeof(packet->complexity);
    
    memcpy(&manual, ptr, sizeof(packet->manual));
    ptr += sizeof(packet->manual);

    packet->id = ntohl(id);
    packet->zone = ntohl(zone);
    packet->timestamp_ns = my_ntohll(timestamp_ns);
    packet->complexity = complexity;
    packet->manual = manual;

    return 0;
}
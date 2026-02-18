# include <stdio.h>
# include <string.h>
# include <stdint.h>
# include <sys/socket.h>
# include <netinet/in.h>
# include <arpa/inet.h>
# include <unistd.h>
# include <stdlib.h>
# include <pthread.h>
# include <time.h>

# include "Server.h"
#define BACKLOG 6 
#define NUMWORKERS 10
#define PACKET_EXPIRATION_MS 100000 // 3 seconds in milliseconds

#define BRIDGE_METRICS_PORT 5050
#define METRICS_REPORT_INTERVAL_MS 1000 // Send metrics every 1 second
#define PACKET_PORT 8080
/*
    Server code to simulate the HCA. represents state processing of renewals
    global queue receives packets from clients
    multitrheadign to simulate HCA processing renewals
*/



Queue q;
ServerReport report;

int main() {
    int server_fd;
    if ((server_fd = init_tcp(PACKET_PORT)) < 0) {
        fprintf(stderr, "Failed to initialize TCP\n");
        exit(EXIT_FAILURE);
    }
    if (init_queue(&q) < 0) {
        fprintf(stderr, "Failed to initialize queue\n");
        exit(EXIT_FAILURE);
    }
    if (init_report_struct(&report) < 0) {
        fprintf(stderr, "Failed to initialize report struct\n");
        exit(EXIT_FAILURE);
    }
    pthread_t client_threads[NUMWORKERS];
    pthread_t metrics_thread;
    for (int i = 0; i < NUMWORKERS; i++) {
        if (pthread_create(&client_threads[i], NULL, simulate_worker, NULL) != 0) {
            perror("pthread_create");
            exit(EXIT_FAILURE);
        }
    }
    pthread_create(&metrics_thread, NULL, send_metrics, NULL);

    // Accept incoming client connections
    while (1) {
        struct sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);
        int client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &client_len);
        if (client_fd < 0) {
            perror("accept");
            continue;
        }
        
        printf("Client connected from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));

        // spawn a thread to handle this client connection
        pthread_t client_thread;
        if (pthread_create(&client_thread, NULL, handle_client_connection, (void *)(intptr_t)client_fd) != 0) {
            perror("Failed to create client thread");
            close(client_fd);
        }
    }

    cleanup_queue(&q);
    close(server_fd);
    return 0;
}


void *handle_client_connection(void *arg) {
    // Handle a client connection in a separate thread
    pthread_detach(pthread_self()); // detach thread for auto-cleanup on exit
    int client_fd = (int)(intptr_t)arg;
    while (1) {
        MedicaidPacket packet;
        init_packet_struct(&packet);
        int n = recv_medicaid_packet(&packet, client_fd);

        if (n < 0) {
            printf("Client disconnected or error occurred\n");
            close(client_fd);
            break;
        }

        // printf("[RECV] ID=%u | Zone=%u | Time=%llu | Manual=%u\n",
        //         packet.id, packet.zone, packet.timestamp_ms, packet.manual);

        enqueue(&q, packet);
        
    }
    close(client_fd);
    return NULL;
}

void *simulate_worker(void *arg) {
    // thread function. Simulates HCA worker processing a document

    // grab from queue
    // This is a consumer problem
    while(1) {
        MedicaidPacket packet = dequeue(&q);
        uint64_t start_time = get_current_timestamp_ms();
        uint64_t wait_time = start_time - packet.timestamp_ms;
        // Check if timestamp still valid
        if (wait_time > PACKET_EXPIRATION_MS) { // If wait time is more than 10 seconds, discard packet
            printf("Discarding stale packet with ID %u from zone %u\n", packet.id, packet.zone);
            pthread_mutex_lock(&q.lock);
            report.total_dropped++;
            pthread_mutex_unlock(&q.lock);
            continue;
        }

        // delay to simulate packet being processed. depends on complexity
        process_packet(packet);

        // measure time
        uint64_t end_time = get_current_timestamp_ms();
        uint64_t total_time = end_time - start_time;

        pthread_mutex_lock(&q.lock);
        report.avg_latency_ms = calculate_ema(total_time, report.avg_latency_ms);
        pthread_mutex_unlock(&q.lock);
                
        printf("Packet %u from zone %u processed in %llu ms\n", packet.id, packet.zone, total_time);

    }
    return NULL;

}

void *send_metrics(void *arg) {
    int server_bridge_fd;
    if ((server_bridge_fd = init_tcp(BRIDGE_METRICS_PORT)) < 0) {
        fprintf(stderr, "Failed to initialize TCP\n");
        exit(EXIT_FAILURE);
    }
    while (1) {
        struct sockaddr_in client_bridge_addr;
        socklen_t client_bridge_len = sizeof(client_bridge_addr);

        int client_bridge_fd;
        if ((client_bridge_fd = accept(server_bridge_fd, (struct sockaddr *)&client_bridge_addr, &client_bridge_len)) < 0) {
            perror("Failed to accept bridge connection");
            continue;
        }

        uint8_t buffer[12];
        while (1) {
            // send a report package to client
            pthread_mutex_lock(&q.lock);
            uint32_t queue_net = htonl(q.count);
            uint32_t dropped_net = htonl(report.total_dropped);
            uint32_t latency_net = htonl(report.avg_latency_ms);
            pthread_mutex_unlock(&q.lock);

            uint8_t *ptr = buffer;
            memcpy(ptr, &queue_net, sizeof(uint32_t));
            ptr += sizeof(uint32_t);
            memcpy(ptr, &dropped_net, sizeof(uint32_t));
            ptr += sizeof(uint32_t);
            memcpy(ptr, &latency_net, sizeof(uint32_t));


            if (send(client_bridge_fd, buffer, sizeof(buffer), 0) < 0) {
                perror("Failed to send report");
                close(client_bridge_fd);
                break;
            }

            usleep(METRICS_REPORT_INTERVAL_MS * 1000); // Sleep for the send rate in microseconds
        }
    }
    
    return NULL;
   
}

int calculate_ema(uint64_t current_value, uint64_t previous_ema) {
    int days = 1000;
    if (previous_ema == 0) {
        return current_value;
    }
    int num = 2*(current_value) + (days-1)*previous_ema;
    int deno = 1+days;
    return num/deno;
}

int process_packet(MedicaidPacket packet) {
    // Simulate a packet being processed by the HCA
    int process_time_ms = (packet.manual ? 200 : 15) * packet.complexity; // Simulate processing time in milliseconds
    if (process_time_ms > 4000) process_time_ms = 4000;
    usleep(process_time_ms * 1000); // Sleep for the simulated processing time in microseconds
    return 0;
}


int init_tcp(int port) {
    struct sockaddr_in server_addr; // struct to hold config network connection
    int opt = 1;

    // Create socket
    int sock_fd = socket(AF_INET, SOCK_STREAM, 0);    // create a tcp socket using IPV4
    if (sock_fd < 0) {
        perror("socket");
        return -1;
    }
    
    // Allow socket to bind to address in use
    if (setsockopt(sock_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        return -1;
    }
    
    // Bind socket to port
    memset(&server_addr, 0, sizeof(server_addr));   // clear server struct memory
    server_addr.sin_family = AF_INET;               // set family to IPV4
    server_addr.sin_addr.s_addr = INADDR_ANY;       // Allow any address to connect
    server_addr.sin_port = htons(port);             // Set port number

    if (bind(sock_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind");
        return -1;
    }
    
    // Listen for incoming connections
    if (listen(sock_fd, BACKLOG) < 0) {
        perror("listen");
        return -1;
    }

    printf("Server listening on port %d\n", port);
    
    return sock_fd;
}

uint64_t get_current_timestamp_ms() {
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    return (uint64_t)(ts.tv_sec * 1000 + ts.tv_nsec / 1000000);
}

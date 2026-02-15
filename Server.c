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
#define PACKET_EXPIRATION_MS 10000 // 1 second in milliseconds
/*
    Server code to simulate the HCA. represents state processing of renewals
    global queue receives packets from clients
    multitrheadign to simulate HCA processing renewals
*/



int server_fd, opt = 1; // server_fd is the socket descriptor, opt is a flag for setsockopt
struct sockaddr_in server_addr; // struct to hold config network connection
int port = 8080;

struct sockaddr_in client_addr;
socklen_t client_len = sizeof(client_addr);
int client_fd;


Queue q;
ServerReport report;

int main() {
    printf("Hello, World!\n");
    if (init_tcp() < 0) {
        fprintf(stderr, "Failed to initialize TCP\n");
        exit(EXIT_FAILURE);
    }
    if (init_queue(&q) < 0) {
        fprintf(stderr, "Failed to initialize queue\n");
        exit(EXIT_FAILURE);
    }
    init_report_struct(&report);
    pthread_t threads[NUMWORKERS];
    for (int i = 0; i < NUMWORKERS; i++) {
        if (pthread_create(&threads[i], NULL, simulate_worker, NULL) != 0) {
            perror("pthread_create");
            exit(EXIT_FAILURE);
        }
    }
    // Accept incoming client connections
    while (1) {
        client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &client_len);
        if (client_fd < 0) {
            perror("accept");
            continue;
        }
        
        printf("Client connected from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));
        int count = 0;

        while (1) {
            MedicaidPacket packet;
            init_packet_struct(&packet);
            int n = recv_medicaid_packet(&packet, client_fd);

            if (n < 0) {
                printf("Client disconnected or error occurred\n");
                break;
            }

            printf("[RECV] ID=%u | Zone=%u | Time=%llu | Manual=%u\n",
                   packet.id, packet.zone, packet.timestamp_ms, packet.manual);

            enqueue(&q, packet);
            report.current_queue_len = /*htonl*/(q.count); // Use your actual queue variable
            if (count % 100 == 0) {
                printf("Received %d packets\n", count);
                printf("Queue length: %d\n", q.count);
                printf("============================================\n");

            }
            count++;
        }

        close(client_fd);
    }
    for (int i = 0; i < NUMWORKERS; i++) {
        pthread_join(threads[i], NULL);
    }
    cleanup_queue(&q);
    return 0;
}

int init_tcp() {
    // boilerplate tcp w/BSD sockets
    memset(&server_addr, 0, sizeof(server_addr));   // clear server struct memory
    server_addr.sin_family = AF_INET;               // set family to IPV4
    server_addr.sin_addr.s_addr = INADDR_ANY;       // Allow any address to connect
    server_addr.sin_port = htons(port);             // Set port number

    // Create socket
    server_fd = socket(AF_INET, SOCK_STREAM, 0);    // create a tcp socket using IPV4
    if (server_fd < 0) {
        perror("socket");
        return -1;
    }
    
    // Allow socket to bind to address in use
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        return -1;
    }
    
    // Bind socket to port

    
    if (bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind");
        return -1;
    }
    
    // Listen for incoming connections
    if (listen(server_fd, BACKLOG) < 0) {
        perror("listen");
        return -1;
    }

    printf("Server listening on port %d\n", port);
    
    return server_fd;
}

int recieve_packets() {
    // multiplexed receiving from office clients w/ poll
    return 0;
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
            printf("Discarding stale packet with ID %u\n", packet.id);
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
        printf("Packet %u processed in %llu ms\n", packet.id, total_time);
    }
    return NULL;

}

int process_packet(MedicaidPacket packet) {
    // Simulate a packet being processed by the HCA
    int process_time_ms = (packet.manual ? 1000 : 300) * packet.complexity; // Simulate processing time in milliseconds
    usleep(process_time_ms * 1000); // Sleep for the simulated processing time in microseconds
    return 0;
}



uint64_t get_current_timestamp_ms() {
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    return (uint64_t)(ts.tv_sec * 1000 + ts.tv_nsec / 1000000);
}
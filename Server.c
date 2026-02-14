# include <stdio.h>
# include <string.h>
# include <stdint.h>
# include <sys/socket.h>
# include <netinet/in.h>
# include <arpa/inet.h>
# include <unistd.h>
# include <stdlib.h>
# include "Server.h"
# include "Medicaid.h"
#define QLEN 5 
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

int main() {
    printf("Hello, World!\n");
    init_tcp();

    // Accept incoming client connections
    while (1) {
        client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &client_len);
        if (client_fd < 0) {
            perror("accept");
            continue;
        }
        
        printf("Client connected from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));
        // TODO: Handle client in thread_wrapper or pass to recieve_packets
        uint32_t mlen;
        recv(client_fd, &mlen, sizeof(mlen), 0);
        printf("Received message length: %u\n", mlen);
        char *message = malloc(mlen + 1);
        recv(client_fd, message, mlen, 0);
        message[mlen] = '\0'; // null terminate the string
        printf("Received message: %s\n", message);
        free(message);
        close(client_fd);
    }
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
    if (listen(server_fd, QLEN) < 0) {
        perror("listen");
        return -1;
    }

    printf("Server listening on port %d\n", port);
    
    return server_fd;
}

int recieve_packets() {
    // multiplexed receiving from office clients w/ poll
}

int thread_wrapper() {
    // thread wrapper. Simulates central HCA
}

int simulate_worker() {
    // thread function. Simulates HCA worker processing a document
}


int safe_send() {

}

int safe_recv() {

}

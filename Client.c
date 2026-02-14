# include <stdio.h>
# include <string.h>
# include <stdlib.h>
# include <sys/socket.h>
# include <netinet/in.h>
# include <arpa/inet.h>
# include <netdb.h>
# include <unistd.h>
# include "Client.h"
# include "Medicaid.h"
/*
    Client code to simulate a local office (CSO). generates and sends packets to server. 
    rate controlled using statistical distribution and user sliders

*/

int main() {
    int sd = init_tcp();
    if (sd < 0) {
        perror("Failed to initialize TCP connection");
        return -1;
    }
    send_packet(sd);
    return 0;
}


int send_packet(int client_fd) {
    char message[] = "Hello from client!";
    uint32_t mlen = sizeof(message) - 1;
    printf("Sending packet of length %u\n", mlen);
    send(client_fd, &mlen, sizeof(mlen), 0);
    send(client_fd, message, strlen(message), 0);
    while(1) {
        // spin
    }
    return 0;
}

int init_tcp() {
    struct hostent *ptrh;           /* Pointer to a host table entry */
    struct sockaddr_in server_adr;  /* Structure to hold server address */
    int sd;                         /* Socket descriptor */
    char *host = "127.0.0.1";       /* Server host (localhost) */
    int port = 8080;                /* Protocol port number */

        /* Create socket for TCP connection */
    sd = socket(AF_INET, SOCK_STREAM, 0);
    if (sd < 0) {
        perror("Socket creation failed");
        return -1;
    }

    /* Get host entry for the server */
    ptrh = gethostbyname(host);
    if (ptrh == NULL) {
        perror("Error: Cannot resolve host");
        close(sd);
        return -1;
    }

    /* Build server address structure */
    memset(&server_adr, 0, sizeof(server_adr));
    server_adr.sin_family = AF_INET;
    server_adr.sin_port = htons(port);
    memcpy(&server_adr.sin_addr, ptrh->h_addr, ptrh->h_length);

    /* Connect to the server */
    if (connect(sd, (struct sockaddr *)&server_adr, sizeof(server_adr)) < 0) {
        perror("Connect failed");
        close(sd);
        return -1;
    }

    printf("Connected to server at %s:%d\n", host, port);
    return sd;
}
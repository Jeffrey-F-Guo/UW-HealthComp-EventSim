# include "Medicaid.h"
#include <pthread.h>
#include <stdlib.h>
#define Q_SIZE 100000


typedef struct {
    MedicaidPacket *packets;
    int queue_size;
    int head;
    int tail;
    int count;

    pthread_mutex_t lock;
    pthread_cond_t not_empty; // condition variable to signal worker threads
} Queue;

int enqueue(Queue *q, MedicaidPacket packet);
MedicaidPacket dequeue(Queue *q);
int init_queue(Queue *q);
int cleanup_queue(Queue *q);
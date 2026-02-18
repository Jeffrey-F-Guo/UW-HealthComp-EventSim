#include "Queue.h"

int enqueue(Queue *q, MedicaidPacket packet) {
    pthread_mutex_lock(&q->lock);
    if (q->count >= Q_SIZE) {
        pthread_mutex_unlock(&q->lock);
        return -1;
    }
    q->count++;
    q->packets[q->tail] = packet;
    q->tail = (q->tail + 1) % Q_SIZE;

    pthread_cond_signal(&q->not_empty);
    pthread_mutex_unlock(&q->lock);
    return 0;

}

MedicaidPacket dequeue(Queue *q) {
    MedicaidPacket packet = {0};
    pthread_mutex_lock(&q->lock);
    while (q->count == 0) {
        pthread_cond_wait(&q->not_empty, &q->lock);
    }

    q->count--;
    packet = q->packets[q->head];
    q->head = (q->head + 1) % Q_SIZE;

    pthread_mutex_unlock(&q->lock);
    return packet;
}

int init_queue(Queue *q) {
    if (!q) {
        return -1;
    }
    memset(q, 0, sizeof(Queue));
    q->packets = (MedicaidPacket *)malloc(sizeof(MedicaidPacket) * Q_SIZE);
    if (!q->packets) {
        return -1;
    }
    q->queue_size = Q_SIZE;
    q->head = 0;
    q->tail = 0;
    q->count = 0;
    pthread_mutex_init(&q->lock, NULL);
    pthread_cond_init(&q->not_empty, NULL);
    return 0;
}

int cleanup_queue(Queue *q) {
    if (q && q->packets) {
        free(q->packets);
        q->packets = NULL;
    }
    pthread_mutex_destroy(&q->lock);
    pthread_cond_destroy(&q->not_empty);
    return 0;
}
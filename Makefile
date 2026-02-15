CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2
TARGETS = server client
SOURCES = Server.c Client.c Medicaid.c Queue.c
OBJECTS = Server.o Client.o Medicaid.o Queue.o

.PHONY: all clean

all: $(TARGETS)

server: Server.o Medicaid.o Queue.o
	$(CC) $(CFLAGS) -o server Server.o Medicaid.o Queue.o

client: Client.o Medicaid.o Queue.o
	$(CC) $(CFLAGS) -o client Client.o Medicaid.o Queue.o

Server.o: Server.c
	$(CC) $(CFLAGS) -c Server.c

Client.o: Client.c
	$(CC) $(CFLAGS) -c Client.c

Medicaid.o: Medicaid.c
	$(CC) $(CFLAGS) -c Medicaid.c

Queue.o: Queue.c
	$(CC) $(CFLAGS) -c Queue.c

clean:
	rm -f $(OBJECTS) $(TARGETS)

help:
	@echo "Available targets:"
	@echo "  make all     - Build server and client"
	@echo "  make server  - Build server executable"
	@echo "  make client  - Build client executable"
	@echo "  make clean   - Remove object files and executables"

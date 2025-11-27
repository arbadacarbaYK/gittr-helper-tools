BIN_DIR := bin
GO := go

.PHONY: all build test clean

all: build

build:
	mkdir -p $(BIN_DIR)
	$(GO) build -o $(BIN_DIR)/clone-events-sse ./cmd/clone-events-sse
	$(GO) build -o $(BIN_DIR)/blossom-fetch-helper ./cmd/blossom-fetch-helper

test:
	$(GO) test ./...

clean:
	rm -rf $(BIN_DIR)

BIN := bin/opendungeon
GO := go
LINT := golangci-lint
MAIN := cmd/main.go

all: run

build:
	$(GO) build -o $(BIN) $(MAIN)

clean:
	rm -rf $(BIN)

lint:
	$(LINT) run ./...

run:
	$(GO) run $(MAIN)

.PHONY: clean lint

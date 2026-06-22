BIN := bin/opendungeon
CYCLO := gocyclo
DATA := .data
GO := go
LINT := golangci-lint
MAIN := cmd/main.go

cyclolevel := 15

all: run

build:
	$(GO) build -o $(BIN) $(MAIN)

clean:
	rm -rf $(BIN) $(DATA)

cyclo:
	$(CYCLO) -over $(cyclolevel) .

lint:
	$(LINT) run ./...

run:
	$(GO) run $(MAIN)

test:
	$(GO) test ./...

tidy:
	$(GO) fmt ./...
	$(GO) mod tidy

.PHONY: clean cyclo lint test tidy

BIN := bin/opendungeon
CYCLO := gocyclo
GO := go
LINT := golangci-lint
MAIN := cmd/main.go

cyclolevel := 15

all: run

build:
	$(GO) build -o $(BIN) $(MAIN)

clean:
	rm -rf $(BIN)

cyclo:
	$(CYCLO) -over $(cyclolevel) .

lint:
	$(LINT) run ./...

run:
	$(GO) run $(MAIN)

test:
	$(GO) test ./...

.PHONY: clean cyclo lint test

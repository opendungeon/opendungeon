BIN := bin/opendungeon
CYCLO := gocyclo
DATA := .data
FLAGS := -baseDir=./.data -dev
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

docs:
	swag fmt
	swag init -g $(MAIN) --outputTypes go,yaml

lint:
	$(LINT) run ./...

run:
	$(GO) run $(MAIN) $(FLAGS)

test:
	$(GO) test ./...

tidy:
	$(GO) fmt ./...
	$(GO) mod tidy

.PHONY: clean cyclo docs lint test tidy

FROM oven/bun:latest AS client

WORKDIR /client

COPY web/ .

RUN bun install
RUN bun run build


FROM golang:1.26-alpine AS builder

WORKDIR /server

RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN sqlc generate
RUN go build -o /bin/opendungeon cmd/main.go


FROM alpine:latest AS runner

COPY --from=builder /bin/opendungeon /bin/opendungeon

RUN adduser -D oduser
RUN mkdir -p /var/lib/opendungeon/data \
    && mkdir -p /var/lib/opendungeon/storage \
    && mkdir -p /var/lib/opendungeon/logs \
    && mkdir -p /var/lib/opendungeon/static \
    && chown -R oduser /bin/opendungeon \
        /var/lib/opendungeon \
        /var/lib/opendungeon/static \
        /var/lib/opendungeon/logs \
        /var/lib/opendungeon/data \
        /var/lib/opendungeon/storage

COPY --from=client /client/build /var/lib/opendungeon/static

VOLUME /var/lib/opendungeon

USER oduser

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/api/health || exit 1

EXPOSE 80

CMD ["/bin/opendungeon", "-port=80", "-baseDir=/var/lib/opendungeon"]

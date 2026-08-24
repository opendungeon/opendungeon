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
COPY --from=client /client/build /srv/opendungeon

RUN adduser -D oduser
RUN mkdir -p /var/www/opendungeon/data \
    && mkdir -p /var/www/opendungeon/storage \
    && mkdir -p /var/www/opendungeon/logs \
    && chown -R oduser /bin/opendungeon \
        /var/www/opendungeon \
        /var/www/opendungeon/logs \
        /var/www/opendungeon/data \
        /var/www/opendungeon/storage

VOLUME /var/www/opendungeon

USER oduser

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/api/status || exit 1

EXPOSE 80

CMD ["/bin/opendungeon", "-port=80", "-baseDir=/var/www/opendungeon", "-staticDir=/srv/opendungeon"]

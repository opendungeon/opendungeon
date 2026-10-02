FROM oven/bun:alpine AS builder

WORKDIR /app

COPY . .

RUN bun install
RUN bun run build
RUN bun build /app/build/index.js --compile --outfile /bin/opendungeon


FROM alpine:latest AS runner

ENV PORT 80

COPY --from=builder /bin/opendungeon /bin/opendungeon

RUN adduser -D oduser

USER oduser

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/api/status || exit 1

EXPOSE 80

CMD ["/bin/opendungeon"]

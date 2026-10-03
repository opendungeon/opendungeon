FROM oven/bun:alpine AS builder

ENV MIGRATIONS_DIR /var/www/opendungeon/migrations

WORKDIR /app

COPY migrations /var/www/opendungeon/migrations

COPY package.json bun.lock .
RUN bun install

COPY . .
RUN bun run build
RUN bun build /app/build/index.js --compile --minify --outfile /bin/opendungeon


FROM oven/bun:alpine AS runner

ENV PORT 80

COPY --from=builder /var/www/opendungeon/migrations /var/www/opendungeon/migrations
COPY --from=builder /bin/opendungeon /bin/opendungeon

RUN adduser -D oduser

USER oduser

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/api/status || exit 1

EXPOSE 80

CMD ["/bin/opendungeon"]

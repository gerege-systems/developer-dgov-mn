# syntax=docker/dockerfile:1.7
#
# wallet.gerege.mn — БИЕ ДААСАН wallet микросервис (өөрийн Postgres + схем).
# Binary-ууд:
#   /app/api     — Fiber v3 wallet HTTP API + OAuth2 token + bank webhook
#   /app/admin   — super-admin API (тусдаа service; client/account/report/fee/recon)
#   /app/worker  — in-process scheduler (reconcile/snapshot/holdexpiry)
#   /app/migrate — goose migration runner (өөрийн ./migrations/*.sql)
#   /app/client  — client/admin үүсгэх CLI (id + random secret)
#
# Compose нь api-г entrypoint-оор; worker/migrator service entrypoint-ийг дарна.

# ---------- builder ----------
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64}

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o /out/api     ./cmd/api && \
    go build -trimpath -ldflags="-s -w" -o /out/admin   ./cmd/admin && \
    go build -trimpath -ldflags="-s -w" -o /out/worker  ./cmd/worker && \
    go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate && \
    go build -trimpath -ldflags="-s -w" -o /out/client  ./cmd/client

# ---------- runtime ----------
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=builder /out/api     /app/api
COPY --from=builder /out/admin   /app/admin
COPY --from=builder /out/worker  /app/worker
COPY --from=builder /out/migrate /app/migrate
COPY --from=builder /out/client  /app/client
COPY --from=builder /app/migrations /app/migrations
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app/api"]

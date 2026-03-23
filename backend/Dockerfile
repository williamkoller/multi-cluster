# ── Build stage ──
FROM golang:1.25-alpine AS build
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server .

# ── Production stage ──
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata sed \
 && mkdir -p /app/.kube \
 && chown -R 65534:65534 /app

COPY --from=build /app/server /server
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER 65534:65534

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]

FROM golang:1.26-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/server ./cmd/gidh-api && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/gidh-auth ./cmd/gidh-auth && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/gidh-batch ./cmd/gidh-batch

FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata wget
COPY --from=builder /app/bin/* /app/bin/

EXPOSE 8080
CMD ["/app/bin/server"]

FROM golang:1.26-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/gidh-auth ./cmd/gidh-auth && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/gidh-batch ./cmd/gidh-batch && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/gidh-stream ./cmd/gidh-stream

FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata wget
COPY --from=builder /app/bin/* /app/bin/

CMD ["/app/bin/gidh-stream"]

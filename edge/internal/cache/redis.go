package cache

import (
	"context"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	Client *redis.Client
}

func Connect(ctx context.Context) *RedisClient {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}
	pass := os.Getenv("REDIS_PASSWORD")

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: pass,
		DB:       0,
	})

	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	if err := rdb.Ping(pingCtx).Err(); err != nil {
		// Log warning, but don't crash if Redis is temporarily unreachable
		return &RedisClient{Client: rdb}
	}

	return &RedisClient{Client: rdb}
}

func (r *RedisClient) Close() {
	if r.Client != nil {
		_ = r.Client.Close()
	}
}

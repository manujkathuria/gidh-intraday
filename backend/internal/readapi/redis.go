package readapi

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisCache struct {
	client *redis.Client
}

func NewRedisCache() *RedisCache {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:         redisAddr,
		Password:     "", // no password by default in docker
		DB:           0,
		DialTimeout:  2 * time.Second,
		ReadTimeout:  1 * time.Second,
		WriteTimeout: 1 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[Redis] Warning: Redis unavailable (%v). Falling back to direct DB queries.", err)
		return &RedisCache{client: nil}
	}

	log.Printf("[Redis] Connected successfully to %s", redisAddr)
	return &RedisCache{client: rdb}
}

func (c *RedisCache) GetSnapshot(ctx context.Context, sessionDate, asOfTime string) (*ReplaySnapshotResponse, bool) {
	if c.client == nil {
		return nil, false
	}

	key := fmt.Sprintf("gidh:replay:snapshot:%s:%s", sessionDate, asOfTime)
	val, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}

	var res ReplaySnapshotResponse
	if err := json.Unmarshal(val, &res); err != nil {
		return nil, false
	}
	return &res, true
}

func (c *RedisCache) SetSnapshot(ctx context.Context, sessionDate, asOfTime string, res *ReplaySnapshotResponse) {
	if c.client == nil || res == nil {
		return
	}

	key := fmt.Sprintf("gidh:replay:snapshot:%s:%s", sessionDate, asOfTime)
	data, err := json.Marshal(res)
	if err != nil {
		return
	}

	// 09:14 pre-open baselines are permanent (0 TTL), intraday frames keep 2h TTL
	ttl := 2 * time.Hour
	if asOfTime <= "09:14:00" {
		ttl = 0 // permanent
	}
	_ = c.client.Set(ctx, key, data, ttl).Err()
}

func (c *RedisCache) SetDaySnapshots(ctx context.Context, sessionDate string, snapshots map[string]*ReplaySnapshotResponse) error {
	if c.client == nil || len(snapshots) == 0 {
		return nil
	}

	pipe := c.client.Pipeline()
	for asOfTime, snap := range snapshots {
		key := fmt.Sprintf("gidh:replay:snapshot:%s:%s", sessionDate, asOfTime)
		data, err := json.Marshal(snap)
		if err != nil {
			continue
		}
		pipe.Set(ctx, key, data, 2*time.Hour)
	}
	pipe.Set(ctx, fmt.Sprintf("gidh:replay:day:%s:warmed", sessionDate), "1", 2*time.Hour)
	_, err := pipe.Exec(ctx)
	return err
}

func (c *RedisCache) IsDayWarmed(ctx context.Context, sessionDate string) bool {
	if c.client == nil {
		return false
	}
	key := fmt.Sprintf("gidh:replay:day:%s:warmed", sessionDate)
	val, err := c.client.Get(ctx, key).Result()
	return err == nil && val == "1"
}

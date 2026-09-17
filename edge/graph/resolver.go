package graph

import (
	"gidh-intraday/edge/internal/cache"
	"gidh-intraday/edge/internal/db"
)

type Resolver struct {
	DB    *db.Database
	Redis *cache.RedisClient
}

package graph

import (
	"gidh-intraday/edge/internal/cache"
	"gidh-intraday/edge/internal/db"
	"gidh-intraday/edge/internal/ordermanager"
)

type Resolver struct {
	DB     *db.Database
	Redis  *cache.RedisClient
	Orders *ordermanager.Manager
}

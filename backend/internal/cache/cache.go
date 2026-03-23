package cache

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache provides a two-tier caching layer: Redis (L1) with in-memory fallback (L2).
// When Redis is unavailable, it degrades gracefully to in-memory only.
type Cache struct {
	mu     sync.RWMutex
	items  map[string]memEntry
	ttl    time.Duration
	rdb    *redis.Client
	useRdb bool
}

type memEntry struct {
	data      any
	raw       []byte // pre-serialized JSON for fast Redis sets
	expiresAt time.Time
}

// New creates a cache. If redisAddr is non-empty, Redis is used as the primary store.
func New(ttl time.Duration, redisAddr string) *Cache {
	c := &Cache{
		items: make(map[string]memEntry),
		ttl:   ttl,
	}

	if redisAddr != "" {
		rdb := redis.NewClient(&redis.Options{
			Addr:         redisAddr,
			DB:           0,
			DialTimeout:  2 * time.Second,
			ReadTimeout:  1 * time.Second,
			WriteTimeout: 1 * time.Second,
			PoolSize:     20,
			MinIdleConns: 5,
		})

		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		if err := rdb.Ping(ctx).Err(); err != nil {
			log.Printf("[cache] Redis unavailable at %s: %v — using in-memory only", redisAddr, err)
		} else {
			log.Printf("[cache] Redis connected at %s", redisAddr)
			c.rdb = rdb
			c.useRdb = true
		}
	}

	return c
}

// Get retrieves a value. Checks in-memory first, then Redis.
func (c *Cache) Get(key string) (any, bool) {
	// L2: check in-memory
	c.mu.RLock()
	e, ok := c.items[key]
	c.mu.RUnlock()

	if ok && time.Now().Before(e.expiresAt) {
		return e.data, true
	}

	// L1: check Redis
	if c.useRdb {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()

		val, err := c.rdb.Get(ctx, key).Bytes()
		if err == nil {
			// Store in memory for faster subsequent reads
			c.mu.Lock()
			c.items[key] = memEntry{
				data:      val, // raw bytes — caller must decode
				raw:       val,
				expiresAt: time.Now().Add(c.ttl),
			}
			c.mu.Unlock()
			return val, true
		}
	}

	return nil, false
}

// GetJSON retrieves and unmarshals a cached JSON value into dst.
// Returns true if the value was found and unmarshalled.
func (c *Cache) GetJSON(key string, dst any) bool {
	v, ok := c.Get(key)
	if !ok {
		return false
	}

	switch data := v.(type) {
	case []byte:
		return json.Unmarshal(data, dst) == nil
	default:
		// in-memory native object — re-serialize then unmarshal for type safety
		b, err := json.Marshal(data)
		if err != nil {
			return false
		}
		return json.Unmarshal(b, dst) == nil
	}
}

// SetJSON serializes the value as JSON and stores it in both tiers.
func (c *Cache) SetJSON(key string, data any) {
	raw, err := json.Marshal(data)
	if err != nil {
		log.Printf("[cache] marshal error for key %s: %v", key, err)
		return
	}

	// L2: in-memory
	c.mu.Lock()
	c.items[key] = memEntry{
		data:      data,
		raw:       raw,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Unlock()

	// L1: Redis
	if c.useRdb {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()
		if err := c.rdb.Set(ctx, key, raw, c.ttl).Err(); err != nil {
			log.Printf("[cache] Redis SET error for key %s: %v", key, err)
		}
	}
}

// InvalidatePrefix removes all keys starting with the given prefix.
func (c *Cache) InvalidatePrefix(prefix string) {
	c.mu.Lock()
	for k := range c.items {
		if strings.HasPrefix(k, prefix) {
			delete(c.items, k)
		}
	}
	c.mu.Unlock()

	if c.useRdb {
		c.deleteRedisPrefix(prefix)
	}
}

// InvalidateAll clears the entire cache.
func (c *Cache) InvalidateAll() {
	c.mu.Lock()
	c.items = make(map[string]memEntry)
	c.mu.Unlock()

	if c.useRdb {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		c.rdb.FlushDB(ctx)
	}
}

func (c *Cache) deleteRedisPrefix(prefix string) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var cursor uint64
	for {
		keys, next, err := c.rdb.Scan(ctx, cursor, prefix+"*", 100).Result()
		if err != nil {
			break
		}
		if len(keys) > 0 {
			c.rdb.Del(ctx, keys...)
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
}

// Close shuts down the Redis connection.
func (c *Cache) Close() error {
	if c.rdb != nil {
		return c.rdb.Close()
	}
	return nil
}

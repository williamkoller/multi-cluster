package cache

import (
	"sync"
	"sync/atomic"
	"time"
)

type entry struct {
	data      any
	expiresAt time.Time
}

// Cache is a thread-safe in-memory cache with TTL-based expiration.
type Cache struct {
	mu      sync.RWMutex
	items   map[string]entry
	ttl     time.Duration
	version atomic.Int64
}

// New creates a cache with the given TTL for entries.
func New(ttl time.Duration) *Cache {
	return &Cache{
		items: make(map[string]entry),
		ttl:   ttl,
	}
}

// Get retrieves a cached value. Returns (nil, false) if not found or expired.
func (c *Cache) Get(key string) (any, bool) {
	c.mu.RLock()
	e, ok := c.items[key]
	c.mu.RUnlock()

	if !ok || time.Now().After(e.expiresAt) {
		return nil, false
	}
	return e.data, true
}

// Set stores a value in the cache with the configured TTL.
func (c *Cache) Set(key string, data any) {
	c.mu.Lock()
	c.items[key] = entry{
		data:      data,
		expiresAt: time.Now().Add(c.ttl),
	}
	c.mu.Unlock()
	c.version.Add(1)
}

// Invalidate removes a specific key from the cache.
func (c *Cache) Invalidate(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
	c.version.Add(1)
}

// InvalidatePrefix removes all keys starting with the given prefix.
func (c *Cache) InvalidatePrefix(prefix string) {
	c.mu.Lock()
	for k := range c.items {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			delete(c.items, k)
		}
	}
	c.mu.Unlock()
	c.version.Add(1)
}

// InvalidateAll clears the entire cache.
func (c *Cache) InvalidateAll() {
	c.mu.Lock()
	c.items = make(map[string]entry)
	c.mu.Unlock()
	c.version.Add(1)
}

// Version returns a monotonically increasing counter that changes on every write.
func (c *Cache) Version() int64 {
	return c.version.Load()
}

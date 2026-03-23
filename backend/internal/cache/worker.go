package cache

import (
	"context"
	"log"
	"sync"
	"time"
)

// RefreshFunc is a function that fetches data and stores it in the cache.
type RefreshFunc func(ctx context.Context, c *Cache) error

// Worker periodically refreshes cache entries in the background so the API
// always serves from warm cache and never blocks on k8s API calls.
type Worker struct {
	cache    *Cache
	interval time.Duration
	funcs    []namedRefresh
	mu       sync.Mutex
	cancel   context.CancelFunc
}

type namedRefresh struct {
	name string
	fn   RefreshFunc
}

// NewWorker creates a background cache refresh worker.
func NewWorker(c *Cache, interval time.Duration) *Worker {
	return &Worker{
		cache:    c,
		interval: interval,
	}
}

// Register adds a named refresh function to the worker.
func (w *Worker) Register(name string, fn RefreshFunc) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.funcs = append(w.funcs, namedRefresh{name: name, fn: fn})
}

// Start begins the background refresh loop. Call Stop() to shut it down.
func (w *Worker) Start() {
	ctx, cancel := context.WithCancel(context.Background())
	w.cancel = cancel

	// Initial warm-up: run all refresh functions once immediately.
	w.refreshAll(ctx)

	go func() {
		ticker := time.NewTicker(w.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				w.refreshAll(ctx)
			}
		}
	}()

	log.Printf("[cache-worker] started with %s interval, %d refresh functions", w.interval, len(w.funcs))
}

// Stop shuts down the worker.
func (w *Worker) Stop() {
	if w.cancel != nil {
		w.cancel()
	}
}

func (w *Worker) refreshAll(ctx context.Context) {
	w.mu.Lock()
	fns := make([]namedRefresh, len(w.funcs))
	copy(fns, w.funcs)
	w.mu.Unlock()

	var wg sync.WaitGroup
	for _, nf := range fns {
		wg.Add(1)
		go func(nf namedRefresh) {
			defer wg.Done()

			rctx, cancel := context.WithTimeout(ctx, 30*time.Second)
			defer cancel()

			if err := nf.fn(rctx, w.cache); err != nil {
				log.Printf("[cache-worker] refresh %q failed: %v", nf.name, err)
			}
		}(nf)
	}
	wg.Wait()
}

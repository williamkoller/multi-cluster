package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/williamkoller/multi-cluster-pods-api/internal/api"
	"github.com/williamkoller/multi-cluster-pods-api/internal/cache"
	"github.com/williamkoller/multi-cluster-pods-api/internal/kubernetes"
	"github.com/williamkoller/multi-cluster-pods-api/internal/middleware"
	"github.com/williamkoller/multi-cluster-pods-api/internal/model"
)

func main() {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			log.Fatalf("failed to get user home dir: %v", err)
		}
		kubeconfig = home + "/.kube/config"
	}

	manager, err := kubernetes.NewMultiClusterManager(kubeconfig)
	if err != nil {
		log.Fatalf("failed to initialize multi-cluster manager: %v", err)
	}

	// Redis is optional — set REDIS_ADDR (e.g. "localhost:6379") to enable.
	redisAddr := os.Getenv("REDIS_ADDR")
	appCache := cache.New(30*time.Second, redisAddr)

	// Background worker pre-warms the cache every 10 seconds.
	worker := cache.NewWorker(appCache, 10*time.Second)
	registerRefreshFuncs(worker, manager)
	worker.Start()

	handler := api.NewHandler(manager, appCache)

	router := gin.Default()
	router.Use(middleware.CORS())
	apiGroup := router.Group("/api")

	apiGroup.GET("/health", handler.Health)
	apiGroup.GET("/clusters", handler.ListClusters)
	apiGroup.GET("/summary", handler.Summary)
	apiGroup.GET("/pods", handler.ListPodsAllClusters)
	apiGroup.GET("/pods/:cluster", handler.ListPodsByCluster)
	apiGroup.GET("/services", handler.ListServicesAllClusters)
	apiGroup.GET("/services/:cluster", handler.ListServicesByCluster)

	apiGroup.DELETE("/pods/:cluster/:namespace/:pod", handler.RestartPod)

	apiGroup.GET("/deployments", handler.ListDeploymentsAllClusters)
	apiGroup.GET("/deployments/:cluster", handler.ListDeploymentsByCluster)
	apiGroup.PUT("/deployments/:cluster/:namespace/:deployment/scale", handler.ScaleDeployment)
	apiGroup.POST("/deployments/:cluster/:namespace/:deployment/restart", handler.RolloutRestartDeployment)

	apiGroup.GET("/pods/:cluster/:namespace/:pod/logs", handler.GetPodLogs)
	apiGroup.GET("/pods/:cluster/:namespace/:pod/logs/stream", handler.StreamPodLogs)

	apiGroup.GET("/namespaces", handler.ListNamespaces)

	apiGroup.GET("/nodes", handler.ListNodesAllClusters)
	apiGroup.GET("/nodes/:cluster", handler.ListNodesByCluster)

	apiGroup.GET("/events", handler.ListEventsAllClusters)
	apiGroup.GET("/events/:cluster", handler.ListEventsByCluster)

	apiGroup.GET("/ingresses", handler.ListIngressesAllClusters)
	apiGroup.GET("/ingresses/:cluster", handler.ListIngressesByCluster)

	apiGroup.GET("/applications", handler.ListApplications)
	apiGroup.GET("/applications/:cluster", handler.ListApplicationsByCluster)

	addr := ":8080"
	log.Printf("server running on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

// registerRefreshFuncs sets up the background tasks that keep the cache warm.
// Each function queries the k8s API and writes results into the cache so that
// incoming HTTP requests always hit warm data.
func registerRefreshFuncs(w *cache.Worker, mgr *kubernetes.MultiClusterManager) {
	// Summary (most expensive: 6+ API calls per cluster)
	w.Register("summary", func(ctx context.Context, c *cache.Cache) error {
		summaries, err := mgr.GetSummary(ctx)
		if err != nil {
			return err
		}
		c.SetJSON("summary:all", model.SummaryResponse{Clusters: summaries})
		return nil
	})

	// Pods (all namespaces)
	w.Register("pods", func(ctx context.Context, c *cache.Cache) error {
		pods, err := mgr.ListPodsFromAllClusters(ctx, "")
		if err != nil {
			return err
		}
		c.SetJSON("pods:all:", pods)
		return nil
	})

	// Deployments (all namespaces)
	w.Register("deployments", func(ctx context.Context, c *cache.Cache) error {
		deploys, err := mgr.ListDeploymentsFromAllClusters(ctx, "")
		if err != nil {
			return err
		}
		c.SetJSON("deployments:all:", deploys)
		return nil
	})

	// Services (all namespaces)
	w.Register("services", func(ctx context.Context, c *cache.Cache) error {
		svcs, err := mgr.ListServicesFromAllClusters(ctx, "")
		if err != nil {
			return err
		}
		c.SetJSON("services:all:", svcs)
		return nil
	})

	// Nodes
	w.Register("nodes", func(ctx context.Context, c *cache.Cache) error {
		nodes, err := mgr.ListNodesFromAllClusters(ctx)
		if err != nil {
			return err
		}
		c.SetJSON("nodes:all", nodes)
		return nil
	})

	// Namespaces
	w.Register("namespaces", func(ctx context.Context, c *cache.Cache) error {
		ns, err := mgr.ListNamespacesFromAllClusters(ctx)
		if err != nil {
			return err
		}
		c.SetJSON("namespaces:all", ns)
		return nil
	})

	// Applications (all namespaces)
	w.Register("applications", func(ctx context.Context, c *cache.Cache) error {
		apps, err := mgr.GetApplicationsFromAllClusters(ctx, "")
		if err != nil {
			return err
		}
		c.SetJSON("applications:all:", apps)
		return nil
	})

	// Events (all namespaces)
	w.Register("events", func(ctx context.Context, c *cache.Cache) error {
		events, err := mgr.ListEventsFromAllClusters(ctx, "")
		if err != nil {
			return err
		}
		c.SetJSON("events:all:", events)
		return nil
	})

	// Ingresses (all namespaces)
	w.Register("ingresses", func(ctx context.Context, c *cache.Cache) error {
		ingresses, err := mgr.ListIngressesFromAllClusters(ctx, "")
		if err != nil {
			return err
		}
		c.SetJSON("ingresses:all:", ingresses)
		return nil
	})
}

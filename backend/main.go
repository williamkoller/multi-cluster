package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/williamkoller/multi-cluster-pods-api/internal/api"
	"github.com/williamkoller/multi-cluster-pods-api/internal/kubernetes"
	"github.com/williamkoller/multi-cluster-pods-api/internal/middleware"
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

	handler := api.NewHandler(manager)

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

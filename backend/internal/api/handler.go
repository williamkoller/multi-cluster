package api

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/williamkoller/multi-cluster-pods-api/internal/cache"
	"github.com/williamkoller/multi-cluster-pods-api/internal/kubernetes"
	"github.com/williamkoller/multi-cluster-pods-api/internal/model"
)

type Handler struct {
	manager *kubernetes.MultiClusterManager
	cache   *cache.Cache
}

func NewHandler(manager *kubernetes.MultiClusterManager, c *cache.Cache) *Handler {
	return &Handler{
		manager: manager,
		cache:   c,
	}
}

func parsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	return page, pageSize
}

func cacheKey(parts ...string) string {
	key := parts[0]
	for _, p := range parts[1:] {
		key += ":" + p
	}
	return key
}

// cachedList is a generic helper that checks the cache before fetching from the k8s API.
func cachedList[T any](h *Handler, ctx context.Context, key string, fetch func() ([]T, error)) ([]T, error) {
	var cached []T
	if h.cache.GetJSON(key, &cached) {
		return cached, nil
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	data, err := fetch()
	if err != nil {
		return nil, err
	}
	h.cache.SetJSON(key, data)
	return data, nil
}

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}

func (h *Handler) ListClusters(c *gin.Context) {
	clusters := h.manager.ListClusters()
	c.JSON(http.StatusOK, gin.H{
		"clusters": clusters,
	})
}

func (h *Handler) ListPodsAllClusters(c *gin.Context) {
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("pods", "all", namespace)
	pods, err := cachedList(h, ctx, key, func() ([]model.PodInfo, error) {
		return h.manager.ListPodsFromAllClusters(ctx, namespace)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(pods, page, pageSize))
}

func (h *Handler) ListPodsByCluster(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("pods", cluster, namespace)
	pods, err := cachedList(h, ctx, key, func() ([]model.PodInfo, error) {
		return h.manager.ListPodsFromCluster(ctx, cluster, namespace)
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(pods, page, pageSize))
}

func (h *Handler) ListServicesAllClusters(c *gin.Context) {
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("services", "all", namespace)
	services, err := cachedList(h, ctx, key, func() ([]model.ServiceInfo, error) {
		return h.manager.ListServicesFromAllClusters(ctx, namespace)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(services, page, pageSize))
}

func (h *Handler) ListServicesByCluster(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("services", cluster, namespace)
	services, err := cachedList(h, ctx, key, func() ([]model.ServiceInfo, error) {
		return h.manager.ListServicesFromCluster(ctx, cluster, namespace)
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(services, page, pageSize))
}

func (h *Handler) RestartPod(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Param("namespace")
	pod := c.Param("pod")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	if err := h.manager.DeletePod(ctx, cluster, namespace, pod); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	h.cache.InvalidatePrefix("pods:")

	c.JSON(http.StatusOK, gin.H{
		"message": "pod deleted successfully, controller will recreate it",
	})
}

func (h *Handler) ScaleDeployment(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Param("namespace")
	deployment := c.Param("deployment")

	var req model.ScaleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	info, err := h.manager.ScaleDeployment(ctx, cluster, namespace, deployment, req.Replicas)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	h.cache.InvalidatePrefix("deployments:")

	c.JSON(http.StatusOK, info)
}

func (h *Handler) ListDeploymentsAllClusters(c *gin.Context) {
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("deployments", "all", namespace)
	deploys, err := cachedList(h, ctx, key, func() ([]model.DeploymentInfo, error) {
		return h.manager.ListDeploymentsFromAllClusters(ctx, namespace)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(deploys, page, pageSize))
}

func (h *Handler) ListDeploymentsByCluster(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("deployments", cluster, namespace)
	deploys, err := cachedList(h, ctx, key, func() ([]model.DeploymentInfo, error) {
		return h.manager.ListDeploymentsFromCluster(ctx, cluster, namespace)
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(deploys, page, pageSize))
}

func (h *Handler) GetPodLogs(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Param("namespace")
	pod := c.Param("pod")
	tailStr := c.DefaultQuery("tail", "500")

	tailLines, err := strconv.ParseInt(tailStr, 10, 64)
	if err != nil || tailLines < 0 {
		tailLines = 500
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	logs, err := h.manager.GetPodLogs(ctx, cluster, namespace, pod, tailLines)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
	})
}

func (h *Handler) StreamPodLogs(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Param("namespace")
	pod := c.Param("pod")
	tailStr := c.DefaultQuery("tail", "100")

	tailLines, err := strconv.ParseInt(tailStr, 10, 64)
	if err != nil || tailLines < 0 {
		tailLines = 100
	}

	ctx := c.Request.Context()

	// Set SSE headers and flush immediately so the client connection opens fast.
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	c.Writer.WriteHeaderNow()

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		fmt.Fprintf(c.Writer, "event: error\ndata: streaming not supported\n\n")
		return
	}

	// Send an initial comment to confirm the connection is alive.
	fmt.Fprintf(c.Writer, ": connected\n\n")
	flusher.Flush()

	stream, err := h.manager.StreamPodLogs(ctx, cluster, namespace, pod, tailLines)
	if err != nil {
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", err.Error())
		flusher.Flush()
		return
	}
	defer stream.Close()

	scanner := bufio.NewScanner(stream)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return
		default:
			line := scanner.Text()
			fmt.Fprintf(c.Writer, "data: %s\n\n", line)
			flusher.Flush()
		}
	}

	if err := scanner.Err(); err != nil && err != io.EOF {
		fmt.Fprintf(c.Writer, "event: error\ndata: %s\n\n", err.Error())
		flusher.Flush()
	}
}

func (h *Handler) ListNamespaces(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("namespaces", "all")
	var cached map[string][]string
	if h.cache.GetJSON(key, &cached) {
		c.JSON(http.StatusOK, cached)
		return
	}

	namespaces, err := h.manager.ListNamespacesFromAllClusters(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.cache.SetJSON(key, namespaces)
	c.JSON(http.StatusOK, namespaces)
}

func (h *Handler) ListNodesAllClusters(c *gin.Context) {
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("nodes", "all")
	nodes, err := cachedList(h, ctx, key, func() ([]model.NodeInfo, error) {
		return h.manager.ListNodesFromAllClusters(ctx)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(nodes, page, pageSize))
}

func (h *Handler) ListNodesByCluster(c *gin.Context) {
	cluster := c.Param("cluster")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("nodes", cluster)
	nodes, err := cachedList(h, ctx, key, func() ([]model.NodeInfo, error) {
		return h.manager.ListNodesFromCluster(ctx, cluster)
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(nodes, page, pageSize))
}

func (h *Handler) ListEventsAllClusters(c *gin.Context) {
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("events", "all", namespace)
	events, err := cachedList(h, ctx, key, func() ([]model.EventInfo, error) {
		return h.manager.ListEventsFromAllClusters(ctx, namespace)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(events, page, pageSize))
}

func (h *Handler) ListEventsByCluster(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("events", cluster, namespace)
	events, err := cachedList(h, ctx, key, func() ([]model.EventInfo, error) {
		return h.manager.ListEventsFromCluster(ctx, cluster, namespace)
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(events, page, pageSize))
}

func (h *Handler) RolloutRestartDeployment(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Param("namespace")
	deployment := c.Param("deployment")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	if err := h.manager.RolloutRestartDeployment(ctx, cluster, namespace, deployment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	h.cache.InvalidatePrefix("deployments:")
	h.cache.InvalidatePrefix("pods:")

	c.JSON(http.StatusOK, gin.H{
		"message": "rollout restart initiated",
	})
}

func (h *Handler) ListIngressesAllClusters(c *gin.Context) {
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("ingresses", "all", namespace)
	ingresses, err := cachedList(h, ctx, key, func() ([]model.IngressInfo, error) {
		return h.manager.ListIngressesFromAllClusters(ctx, namespace)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(ingresses, page, pageSize))
}

func (h *Handler) ListIngressesByCluster(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("ingresses", cluster, namespace)
	ingresses, err := cachedList(h, ctx, key, func() ([]model.IngressInfo, error) {
		return h.manager.ListIngressesFromCluster(ctx, cluster, namespace)
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(ingresses, page, pageSize))
}

func (h *Handler) Summary(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("summary", "all")
	var cached model.SummaryResponse
	if h.cache.GetJSON(key, &cached) {
		c.JSON(http.StatusOK, cached)
		return
	}

	summaries, err := h.manager.GetSummary(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	resp := model.SummaryResponse{Clusters: summaries}
	h.cache.SetJSON(key, resp)
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ListApplications(c *gin.Context) {
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("applications", "all", namespace)
	apps, err := cachedList(h, ctx, key, func() ([]model.ApplicationInfo, error) {
		return h.manager.GetApplicationsFromAllClusters(ctx, namespace)
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(apps, page, pageSize))
}

func (h *Handler) ListApplicationsByCluster(c *gin.Context) {
	cluster := c.Param("cluster")
	namespace := c.Query("namespace")
	page, pageSize := parsePagination(c)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 30*time.Second)
	defer cancel()

	key := cacheKey("applications", cluster, namespace)
	apps, err := cachedList(h, ctx, key, func() ([]model.ApplicationInfo, error) {
		return h.manager.GetApplicationsFromCluster(ctx, cluster, namespace)
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.Paginate(apps, page, pageSize))
}

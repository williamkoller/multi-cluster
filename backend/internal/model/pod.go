package model

type PodInfo struct {
	Cluster   string `json:"cluster"`
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Ready     string `json:"ready"`
	Status    string `json:"status"`
	Age       string `json:"age"`
}

type ServiceInfo struct {
	Cluster   string    `json:"cluster"`
	Namespace string    `json:"namespace"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	ClusterIP string    `json:"clusterIp"`
	Ports     string    `json:"ports"`
	Age       string    `json:"age"`
	Pods      []PodInfo `json:"pods"`
}

type ScaleRequest struct {
	Replicas int32 `json:"replicas" binding:"required,min=0,max=100"`
}

type DeploymentInfo struct {
	Cluster   string `json:"cluster"`
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
	Replicas  int32  `json:"replicas"`
	Available int32  `json:"available"`
	Age       string `json:"age"`
}

type NodeInfo struct {
	Cluster           string `json:"cluster"`
	Name              string `json:"name"`
	Status            string `json:"status"`
	Roles             string `json:"roles"`
	Version           string `json:"version"`
	OS                string `json:"os"`
	Arch              string `json:"arch"`
	CPUCapacity       string `json:"cpuCapacity"`
	MemoryCapacity    string `json:"memoryCapacity"`
	CPUAllocatable    string `json:"cpuAllocatable"`
	MemoryAllocatable string `json:"memoryAllocatable"`
	Age               string `json:"age"`
}

type EventInfo struct {
	Cluster   string `json:"cluster"`
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	Object    string `json:"object"`
	Message   string `json:"message"`
	Count     int32  `json:"count"`
	LastSeen  string `json:"lastSeen"`
}

type IngressInfo struct {
	Cluster   string   `json:"cluster"`
	Namespace string   `json:"namespace"`
	Name      string   `json:"name"`
	Hosts     []string `json:"hosts"`
	Paths     string   `json:"paths"`
	Age       string   `json:"age"`
}

type ClusterSummary struct {
	Name                   string `json:"name"`
	Status                 string `json:"status"`
	Pods                   int    `json:"pods"`
	PodsRunning            int    `json:"podsRunning"`
	PodsPending            int    `json:"podsPending"`
	PodsFailed             int    `json:"podsFailed"`
	Deployments            int    `json:"deployments"`
	DeploymentsAvailable   int    `json:"deploymentsAvailable"`
	DeploymentsUnavailable int    `json:"deploymentsUnavailable"`
	Services               int    `json:"services"`
	Nodes                  int    `json:"nodes"`
	NodesReady             int    `json:"nodesReady"`
	Ingresses              int    `json:"ingresses"`
	Namespaces             int    `json:"namespaces"`
}

type SummaryResponse struct {
	Clusters []ClusterSummary `json:"clusters"`
}

// ArgoCD-style Application model.
// Each Deployment is treated as an Application with Health, Sync, and resource tree.

type HealthStatus string

const (
	HealthHealthy     HealthStatus = "Healthy"
	HealthProgressing HealthStatus = "Progressing"
	HealthDegraded    HealthStatus = "Degraded"
	HealthSuspended   HealthStatus = "Suspended"
	HealthMissing     HealthStatus = "Missing"
	HealthUnknown     HealthStatus = "Unknown"
)

type SyncStatus string

const (
	SyncSynced    SyncStatus = "Synced"
	SyncOutOfSync SyncStatus = "OutOfSync"
	SyncUnknown   SyncStatus = "Unknown"
)

type AppResource struct {
	Kind      string       `json:"kind"`
	Name      string       `json:"name"`
	Namespace string       `json:"namespace"`
	Status    string       `json:"status"`
	Health    HealthStatus `json:"health"`
}

type ApplicationInfo struct {
	Name        string        `json:"name"`
	Namespace   string        `json:"namespace"`
	Cluster     string        `json:"cluster"`
	Health      HealthStatus  `json:"health"`
	SyncStatus  SyncStatus    `json:"syncStatus"`
	Source      string        `json:"source"`
	TargetState TargetState   `json:"targetState"`
	LiveState   LiveState     `json:"liveState"`
	Resources   []AppResource `json:"resources"`
	Age         string        `json:"age"`
}

type TargetState struct {
	Replicas int32 `json:"replicas"`
}

type LiveState struct {
	AvailableReplicas   int32 `json:"availableReplicas"`
	ReadyReplicas       int32 `json:"readyReplicas"`
	UnavailableReplicas int32 `json:"unavailableReplicas"`
	UpdatedReplicas     int32 `json:"updatedReplicas"`
	TotalPods           int   `json:"totalPods"`
	RunningPods         int   `json:"runningPods"`
	PendingPods         int   `json:"pendingPods"`
	FailedPods          int   `json:"failedPods"`
}

type PaginatedResponse[T any] struct {
	Items      []T `json:"items"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalPages int `json:"totalPages"`
}

func Paginate[T any](items []T, page, pageSize int) PaginatedResponse[T] {
	total := len(items)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}
	if pageSize > 500 {
		pageSize = 500
	}

	totalPages := (total + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}

	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}

	return PaginatedResponse[T]{
		Items:      items[start:end],
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}
}

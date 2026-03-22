package kubernetes

import (
	"context"
	"fmt"
	"io"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/williamkoller/multi-cluster-pods-api/internal/model"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type MultiClusterManager struct {
	clients map[string]*kubernetes.Clientset
}

func NewMultiClusterManager(kubeconfigPath string) (*MultiClusterManager, error) {
	config, err := clientcmd.LoadFromFile(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	clients := make(map[string]*kubernetes.Clientset)

	for contextName := range config.Contexts {
		restConfig, err := buildConfigFromContext(kubeconfigPath, contextName)
		if err != nil {
			return nil, fmt.Errorf("failed to build rest config for context %s: %w", contextName, err)
		}

		clientset, err := kubernetes.NewForConfig(restConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to create clientset for context %s: %w", contextName, err)
		}

		clients[contextName] = clientset
	}

	return &MultiClusterManager{
		clients: clients,
	}, nil
}

func buildConfigFromContext(kubeconfigPath, contextName string) (*rest.Config, error) {
	loadingRules := &clientcmd.ClientConfigLoadingRules{ExplicitPath: kubeconfigPath}
	overrides := &clientcmd.ConfigOverrides{
		CurrentContext: contextName,
	}
	clientConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, overrides)
	return clientConfig.ClientConfig()
}

func (m *MultiClusterManager) ListClusters() []string {
	clusters := make([]string, 0, len(m.clients))
	for name := range m.clients {
		clusters = append(clusters, name)
	}
	sort.Strings(clusters)
	return clusters
}

func (m *MultiClusterManager) ListPodsFromCluster(ctx context.Context, cluster, namespace string) ([]model.PodInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	podList, err := client.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list pods in cluster %s: %w", cluster, err)
	}

	result := make([]model.PodInfo, 0, len(podList.Items))
	for _, pod := range podList.Items {
		result = append(result, model.PodInfo{
			Cluster:   cluster,
			Namespace: pod.Namespace,
			Name:      pod.Name,
			Ready:     formatReady(pod),
			Status:    string(pod.Status.Phase),
			Age:       translateTimestampSince(pod.CreationTimestamp.Time),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Namespace == result[j].Namespace {
			return result[i].Name < result[j].Name
		}
		return result[i].Namespace < result[j].Namespace
	})

	return result, nil
}

func (m *MultiClusterManager) ListPodsFromAllClusters(ctx context.Context, namespace string) ([]model.PodInfo, error) {
	clusters := m.ListClusters()
	results := make([][]model.PodInfo, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.ListPodsFromCluster(ctx, cluster, namespace)
		}(i, cluster)
	}
	wg.Wait()

	all := make([]model.PodInfo, 0)
	for i := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		all = append(all, results[i]...)
	}

	sort.Slice(all, func(i, j int) bool {
		if all[i].Cluster == all[j].Cluster {
			if all[i].Namespace == all[j].Namespace {
				return all[i].Name < all[j].Name
			}
			return all[i].Namespace < all[j].Namespace
		}
		return all[i].Cluster < all[j].Cluster
	})

	return all, nil
}

func formatReady(pod v1.Pod) string {
	total := len(pod.Status.ContainerStatuses)
	ready := 0

	for _, c := range pod.Status.ContainerStatuses {
		if c.Ready {
			ready++
		}
	}

	return fmt.Sprintf("%d/%d", ready, total)
}

func (m *MultiClusterManager) ListServicesFromCluster(ctx context.Context, cluster, namespace string) ([]model.ServiceInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	svcList, err := client.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list services in cluster %s: %w", cluster, err)
	}

	result := make([]model.ServiceInfo, 0, len(svcList.Items))

	for _, svc := range svcList.Items {
		var pods []model.PodInfo

		if len(svc.Spec.Selector) > 0 {
			selector := labels.Set(svc.Spec.Selector).String()
			podList, err := client.CoreV1().Pods(svc.Namespace).List(ctx, metav1.ListOptions{
				LabelSelector: selector,
			})
			if err == nil {
				for _, pod := range podList.Items {
					pods = append(pods, model.PodInfo{
						Cluster:   cluster,
						Namespace: pod.Namespace,
						Name:      pod.Name,
						Ready:     formatReady(pod),
						Status:    string(pod.Status.Phase),
						Age:       translateTimestampSince(pod.CreationTimestamp.Time),
					})
				}
			}
		}

		if pods == nil {
			pods = []model.PodInfo{}
		}

		result = append(result, model.ServiceInfo{
			Cluster:   cluster,
			Namespace: svc.Namespace,
			Name:      svc.Name,
			Type:      string(svc.Spec.Type),
			ClusterIP: svc.Spec.ClusterIP,
			Ports:     formatServicePorts(svc),
			Age:       translateTimestampSince(svc.CreationTimestamp.Time),
			Pods:      pods,
		})
	}

	return result, nil
}

func translateTimestampSince(t time.Time) string {
	diff := time.Since(t)

	switch {
	case diff < time.Minute:
		return fmt.Sprintf("%ds", int(diff.Seconds()))
	case diff < time.Hour:
		return fmt.Sprintf("%dm", int(diff.Minutes()))
	case diff < 24*time.Hour:
		return fmt.Sprintf("%dh", int(diff.Hours()))
	default:
		return fmt.Sprintf("%dd", int(diff.Hours()/24))
	}
}

func formatServicePorts(svc v1.Service) string {
	ports := ""

	for i, p := range svc.Spec.Ports {
		if i > 0 {
			ports += ","
		}
		ports += fmt.Sprintf("%d/%s", p.Port, p.Protocol)
	}

	return ports
}

func (m *MultiClusterManager) ListServicesFromAllClusters(ctx context.Context, namespace string) ([]model.ServiceInfo, error) {
	clusters := m.ListClusters()
	results := make([][]model.ServiceInfo, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.ListServicesFromCluster(ctx, cluster, namespace)
		}(i, cluster)
	}
	wg.Wait()

	all := make([]model.ServiceInfo, 0)
	for i := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		all = append(all, results[i]...)
	}

	return all, nil
}

func (m *MultiClusterManager) DeletePod(ctx context.Context, cluster, namespace, name string) error {
	client, ok := m.clients[cluster]
	if !ok {
		return fmt.Errorf("cluster %q not found", cluster)
	}

	return client.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

func (m *MultiClusterManager) ScaleDeployment(ctx context.Context, cluster, namespace, name string, replicas int32) (*model.DeploymentInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	scale, err := client.AppsV1().Deployments(namespace).GetScale(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get scale for deployment %s/%s: %w", namespace, name, err)
	}

	scale.Spec.Replicas = replicas

	_, err = client.AppsV1().Deployments(namespace).UpdateScale(ctx, name, scale, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to scale deployment %s/%s: %w", namespace, name, err)
	}

	deploy, err := client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get deployment %s/%s after scale: %w", namespace, name, err)
	}

	return &model.DeploymentInfo{
		Cluster:   cluster,
		Namespace: deploy.Namespace,
		Name:      deploy.Name,
		Replicas:  *deploy.Spec.Replicas,
		Available: deploy.Status.AvailableReplicas,
		Age:       translateTimestampSince(deploy.CreationTimestamp.Time),
	}, nil
}

func (m *MultiClusterManager) ListDeploymentsFromCluster(ctx context.Context, cluster, namespace string) ([]model.DeploymentInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	deploys, err := client.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments in cluster %s: %w", cluster, err)
	}

	result := make([]model.DeploymentInfo, 0, len(deploys.Items))
	for _, d := range deploys.Items {
		var replicas int32
		if d.Spec.Replicas != nil {
			replicas = *d.Spec.Replicas
		}
		result = append(result, model.DeploymentInfo{
			Cluster:   cluster,
			Namespace: d.Namespace,
			Name:      d.Name,
			Replicas:  replicas,
			Available: d.Status.AvailableReplicas,
			Age:       translateTimestampSince(d.CreationTimestamp.Time),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Namespace == result[j].Namespace {
			return result[i].Name < result[j].Name
		}
		return result[i].Namespace < result[j].Namespace
	})

	return result, nil
}

func (m *MultiClusterManager) ListDeploymentsFromAllClusters(ctx context.Context, namespace string) ([]model.DeploymentInfo, error) {
	clusters := m.ListClusters()
	results := make([][]model.DeploymentInfo, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.ListDeploymentsFromCluster(ctx, cluster, namespace)
		}(i, cluster)
	}
	wg.Wait()

	all := make([]model.DeploymentInfo, 0)
	for i := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		all = append(all, results[i]...)
	}

	sort.Slice(all, func(i, j int) bool {
		if all[i].Cluster == all[j].Cluster {
			if all[i].Namespace == all[j].Namespace {
				return all[i].Name < all[j].Name
			}
			return all[i].Namespace < all[j].Namespace
		}
		return all[i].Cluster < all[j].Cluster
	})

	return all, nil
}

func (m *MultiClusterManager) GetPodLogs(ctx context.Context, cluster, namespace, name string, tailLines int64) (string, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return "", fmt.Errorf("cluster %q not found", cluster)
	}

	opts := &v1.PodLogOptions{}
	if tailLines > 0 {
		opts.TailLines = &tailLines
	}

	req := client.CoreV1().Pods(namespace).GetLogs(name, opts)
	stream, err := req.Stream(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get logs for pod %s/%s: %w", namespace, name, err)
	}
	defer stream.Close()

	bytes, err := io.ReadAll(io.LimitReader(stream, 1<<20))
	if err != nil {
		return "", fmt.Errorf("failed to read logs: %w", err)
	}

	return string(bytes), nil
}

func (m *MultiClusterManager) StreamPodLogs(ctx context.Context, cluster, namespace, name string, tailLines int64) (io.ReadCloser, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	opts := &v1.PodLogOptions{
		Follow: true,
	}
	if tailLines > 0 {
		opts.TailLines = &tailLines
	} else {
		// When tailLines is 0, only follow new lines (last 1 second of history).
		sinceSeconds := int64(1)
		opts.SinceSeconds = &sinceSeconds
	}

	req := client.CoreV1().Pods(namespace).GetLogs(name, opts)
	stream, err := req.Stream(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to stream logs for pod %s/%s: %w", namespace, name, err)
	}

	return stream, nil
}

func (m *MultiClusterManager) ListNamespacesFromCluster(ctx context.Context, cluster string) ([]string, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	nsList, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces in cluster %s: %w", cluster, err)
	}

	result := make([]string, 0, len(nsList.Items))
	for _, ns := range nsList.Items {
		result = append(result, ns.Name)
	}
	sort.Strings(result)
	return result, nil
}

func (m *MultiClusterManager) ListNamespacesFromAllClusters(ctx context.Context) (map[string][]string, error) {
	clusters := m.ListClusters()
	results := make([][]string, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.ListNamespacesFromCluster(ctx, cluster)
		}(i, cluster)
	}
	wg.Wait()

	result := make(map[string][]string, len(clusters))
	for i, cluster := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		result[cluster] = results[i]
	}
	return result, nil
}

func (m *MultiClusterManager) ListNodesFromCluster(ctx context.Context, cluster string) ([]model.NodeInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	nodeList, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list nodes in cluster %s: %w", cluster, err)
	}

	result := make([]model.NodeInfo, 0, len(nodeList.Items))
	for _, node := range nodeList.Items {
		status := "NotReady"
		for _, cond := range node.Status.Conditions {
			if cond.Type == v1.NodeReady && cond.Status == v1.ConditionTrue {
				status = "Ready"
				break
			}
		}

		roles := []string{}
		for label := range node.Labels {
			if strings.HasPrefix(label, "node-role.kubernetes.io/") {
				roles = append(roles, strings.TrimPrefix(label, "node-role.kubernetes.io/"))
			}
		}
		if len(roles) == 0 {
			roles = append(roles, "<none>")
		}
		sort.Strings(roles)

		result = append(result, model.NodeInfo{
			Cluster:           cluster,
			Name:              node.Name,
			Status:            status,
			Roles:             strings.Join(roles, ","),
			Version:           node.Status.NodeInfo.KubeletVersion,
			OS:                node.Status.NodeInfo.OperatingSystem,
			Arch:              node.Status.NodeInfo.Architecture,
			CPUCapacity:       node.Status.Capacity.Cpu().String(),
			MemoryCapacity:    node.Status.Capacity.Memory().String(),
			CPUAllocatable:    node.Status.Allocatable.Cpu().String(),
			MemoryAllocatable: node.Status.Allocatable.Memory().String(),
			Age:               translateTimestampSince(node.CreationTimestamp.Time),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})

	return result, nil
}

func (m *MultiClusterManager) ListNodesFromAllClusters(ctx context.Context) ([]model.NodeInfo, error) {
	clusters := m.ListClusters()
	results := make([][]model.NodeInfo, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.ListNodesFromCluster(ctx, cluster)
		}(i, cluster)
	}
	wg.Wait()

	all := make([]model.NodeInfo, 0)
	for i := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		all = append(all, results[i]...)
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].Cluster == all[j].Cluster {
			return all[i].Name < all[j].Name
		}
		return all[i].Cluster < all[j].Cluster
	})
	return all, nil
}

func (m *MultiClusterManager) ListEventsFromCluster(ctx context.Context, cluster, namespace string) ([]model.EventInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	eventList, err := client.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list events in cluster %s: %w", cluster, err)
	}

	result := make([]model.EventInfo, 0, len(eventList.Items))
	for _, e := range eventList.Items {
		lastSeen := translateTimestampSince(e.LastTimestamp.Time)
		if e.LastTimestamp.IsZero() {
			lastSeen = translateTimestampSince(e.CreationTimestamp.Time)
		}
		result = append(result, model.EventInfo{
			Cluster:   cluster,
			Namespace: e.Namespace,
			Type:      e.Type,
			Reason:    e.Reason,
			Object:    fmt.Sprintf("%s/%s", strings.ToLower(e.InvolvedObject.Kind), e.InvolvedObject.Name),
			Message:   e.Message,
			Count:     e.Count,
			LastSeen:  lastSeen,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].LastSeen < result[j].LastSeen
	})

	return result, nil
}

func (m *MultiClusterManager) ListEventsFromAllClusters(ctx context.Context, namespace string) ([]model.EventInfo, error) {
	clusters := m.ListClusters()
	results := make([][]model.EventInfo, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.ListEventsFromCluster(ctx, cluster, namespace)
		}(i, cluster)
	}
	wg.Wait()

	all := make([]model.EventInfo, 0)
	for i := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		all = append(all, results[i]...)
	}
	return all, nil
}

func (m *MultiClusterManager) RolloutRestartDeployment(ctx context.Context, cluster, namespace, name string) error {
	client, ok := m.clients[cluster]
	if !ok {
		return fmt.Errorf("cluster %q not found", cluster)
	}

	deploy, err := client.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment %s/%s: %w", namespace, name, err)
	}

	if deploy.Spec.Template.Annotations == nil {
		deploy.Spec.Template.Annotations = make(map[string]string)
	}
	deploy.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)

	_, err = client.AppsV1().Deployments(namespace).Update(ctx, deploy, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to rollout restart deployment %s/%s: %w", namespace, name, err)
	}

	return nil
}

func (m *MultiClusterManager) ListIngressesFromCluster(ctx context.Context, cluster, namespace string) ([]model.IngressInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	ingList, err := client.NetworkingV1().Ingresses(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ingresses in cluster %s: %w", cluster, err)
	}

	result := make([]model.IngressInfo, 0, len(ingList.Items))
	for _, ing := range ingList.Items {
		hosts := []string{}
		paths := []string{}
		for _, rule := range ing.Spec.Rules {
			if rule.Host != "" {
				hosts = append(hosts, rule.Host)
			}
			if rule.HTTP != nil {
				for _, p := range rule.HTTP.Paths {
					paths = append(paths, p.Path)
				}
			}
		}
		result = append(result, model.IngressInfo{
			Cluster:   cluster,
			Namespace: ing.Namespace,
			Name:      ing.Name,
			Hosts:     hosts,
			Paths:     strings.Join(paths, ", "),
			Age:       translateTimestampSince(ing.CreationTimestamp.Time),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Namespace == result[j].Namespace {
			return result[i].Name < result[j].Name
		}
		return result[i].Namespace < result[j].Namespace
	})

	return result, nil
}

func (m *MultiClusterManager) ListIngressesFromAllClusters(ctx context.Context, namespace string) ([]model.IngressInfo, error) {
	clusters := m.ListClusters()
	results := make([][]model.IngressInfo, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.ListIngressesFromCluster(ctx, cluster, namespace)
		}(i, cluster)
	}
	wg.Wait()

	all := make([]model.IngressInfo, 0)
	for i := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		all = append(all, results[i]...)
	}
	return all, nil
}

func (m *MultiClusterManager) GetSummary(ctx context.Context) ([]model.ClusterSummary, error) {
	clusters := m.ListClusters()
	summaries := make([]model.ClusterSummary, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			client := m.clients[cluster]
			s := model.ClusterSummary{Name: cluster, Status: "Connected"}

			podList, err := client.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
			if err != nil {
				s.Status = "Error"
				errs[i] = nil // non-fatal: still return partial summary
				summaries[i] = s
				return
			}
			s.Pods = len(podList.Items)
			for _, p := range podList.Items {
				switch p.Status.Phase {
				case v1.PodRunning:
					s.PodsRunning++
				case v1.PodPending:
					s.PodsPending++
				case v1.PodFailed:
					s.PodsFailed++
				}
			}

			deploys, err := client.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
			if err == nil {
				s.Deployments = len(deploys.Items)
				for _, d := range deploys.Items {
					var desired int32
					if d.Spec.Replicas != nil {
						desired = *d.Spec.Replicas
					}
					if d.Status.AvailableReplicas >= desired && desired > 0 {
						s.DeploymentsAvailable++
					} else if desired > 0 {
						s.DeploymentsUnavailable++
					}
				}
			}

			svcList, err := client.CoreV1().Services("").List(ctx, metav1.ListOptions{})
			if err == nil {
				s.Services = len(svcList.Items)
			}

			nodeList, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
			if err == nil {
				s.Nodes = len(nodeList.Items)
				for _, n := range nodeList.Items {
					for _, cond := range n.Status.Conditions {
						if cond.Type == v1.NodeReady && cond.Status == v1.ConditionTrue {
							s.NodesReady++
							break
						}
					}
				}
			}

			ingList, err := client.NetworkingV1().Ingresses("").List(ctx, metav1.ListOptions{})
			if err == nil {
				s.Ingresses = len(ingList.Items)
			}

			nsList, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
			if err == nil {
				s.Namespaces = len(nsList.Items)
			}

			summaries[i] = s
		}(i, cluster)
	}
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}

	return summaries, nil
}

func (m *MultiClusterManager) GetApplicationsFromCluster(ctx context.Context, cluster, namespace string) ([]model.ApplicationInfo, error) {
	client, ok := m.clients[cluster]
	if !ok {
		return nil, fmt.Errorf("cluster %q not found", cluster)
	}

	deploys, err := client.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list deployments in cluster %s: %w", cluster, err)
	}

	apps := make([]model.ApplicationInfo, 0, len(deploys.Items))

	for _, d := range deploys.Items {
		var desiredReplicas int32
		if d.Spec.Replicas != nil {
			desiredReplicas = *d.Spec.Replicas
		}

		// Query pods owned by this deployment via label selector
		selector := labels.Set(d.Spec.Selector.MatchLabels).String()
		podList, err := client.CoreV1().Pods(d.Namespace).List(ctx, metav1.ListOptions{
			LabelSelector: selector,
		})

		var liveState model.LiveState
		var resources []model.AppResource

		if err == nil {
			liveState.TotalPods = len(podList.Items)
			for _, p := range podList.Items {
				podHealth := model.HealthUnknown
				switch p.Status.Phase {
				case v1.PodRunning:
					liveState.RunningPods++
					podHealth = model.HealthHealthy
				case v1.PodPending:
					liveState.PendingPods++
					podHealth = model.HealthProgressing
				case v1.PodFailed:
					liveState.FailedPods++
					podHealth = model.HealthDegraded
				}
				resources = append(resources, model.AppResource{
					Kind:      "Pod",
					Name:      p.Name,
					Namespace: p.Namespace,
					Status:    string(p.Status.Phase),
					Health:    podHealth,
				})
			}
		}

		liveState.AvailableReplicas = d.Status.AvailableReplicas
		liveState.ReadyReplicas = d.Status.ReadyReplicas
		liveState.UnavailableReplicas = d.Status.UnavailableReplicas
		liveState.UpdatedReplicas = d.Status.UpdatedReplicas

		// Add the deployment itself as a resource
		deployHealth := computeDeployHealth(desiredReplicas, d.Status.AvailableReplicas, d.Status.UnavailableReplicas)
		resources = append([]model.AppResource{{
			Kind:      "Deployment",
			Name:      d.Name,
			Namespace: d.Namespace,
			Status:    fmt.Sprintf("%d/%d", d.Status.AvailableReplicas, desiredReplicas),
			Health:    deployHealth,
		}}, resources...)

		// Query services that select the same labels
		svcList, svcErr := client.CoreV1().Services(d.Namespace).List(ctx, metav1.ListOptions{})
		if svcErr == nil {
			for _, svc := range svcList.Items {
				if len(svc.Spec.Selector) == 0 {
					continue
				}
				match := true
				for k, v := range svc.Spec.Selector {
					if d.Spec.Selector.MatchLabels[k] != v {
						match = false
						break
					}
				}
				if match {
					resources = append(resources, model.AppResource{
						Kind:      "Service",
						Name:      svc.Name,
						Namespace: svc.Namespace,
						Status:    string(svc.Spec.Type),
						Health:    model.HealthHealthy,
					})
				}
			}
		}

		// Compute overall health
		health := computeDeployHealth(desiredReplicas, d.Status.AvailableReplicas, d.Status.UnavailableReplicas)

		// Compute sync status (target vs live)
		syncStatus := model.SyncSynced
		if desiredReplicas > 0 && d.Status.UpdatedReplicas != desiredReplicas {
			syncStatus = model.SyncOutOfSync
		} else if desiredReplicas > 0 && d.Status.AvailableReplicas != desiredReplicas {
			syncStatus = model.SyncOutOfSync
		} else if desiredReplicas == 0 && d.Status.Replicas > 0 {
			syncStatus = model.SyncOutOfSync
		}

		apps = append(apps, model.ApplicationInfo{
			Name:       d.Name,
			Namespace:  d.Namespace,
			Cluster:    cluster,
			Health:     health,
			SyncStatus: syncStatus,
			Source:     "Deployment",
			TargetState: model.TargetState{
				Replicas: desiredReplicas,
			},
			LiveState: liveState,
			Resources: resources,
			Age:       translateTimestampSince(d.CreationTimestamp.Time),
		})
	}

	sort.Slice(apps, func(i, j int) bool {
		if apps[i].Namespace == apps[j].Namespace {
			return apps[i].Name < apps[j].Name
		}
		return apps[i].Namespace < apps[j].Namespace
	})

	return apps, nil
}

func computeDeployHealth(desired, available, unavailable int32) model.HealthStatus {
	if desired == 0 {
		return model.HealthSuspended
	}
	if unavailable > 0 {
		if available == 0 {
			return model.HealthDegraded
		}
		return model.HealthProgressing
	}
	if available >= desired {
		return model.HealthHealthy
	}
	return model.HealthProgressing
}

func (m *MultiClusterManager) GetApplicationsFromAllClusters(ctx context.Context, namespace string) ([]model.ApplicationInfo, error) {
	clusters := m.ListClusters()
	results := make([][]model.ApplicationInfo, len(clusters))
	errs := make([]error, len(clusters))
	var wg sync.WaitGroup

	for i, cluster := range clusters {
		wg.Add(1)
		go func(i int, cluster string) {
			defer wg.Done()
			results[i], errs[i] = m.GetApplicationsFromCluster(ctx, cluster, namespace)
		}(i, cluster)
	}
	wg.Wait()

	all := make([]model.ApplicationInfo, 0)
	for i := range clusters {
		if errs[i] != nil {
			return nil, errs[i]
		}
		all = append(all, results[i]...)
	}

	sort.Slice(all, func(i, j int) bool {
		if all[i].Cluster == all[j].Cluster {
			if all[i].Namespace == all[j].Namespace {
				return all[i].Name < all[j].Name
			}
			return all[i].Namespace < all[j].Namespace
		}
		return all[i].Cluster < all[j].Cluster
	})

	return all, nil
}

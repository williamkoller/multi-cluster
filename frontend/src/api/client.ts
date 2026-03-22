import type {
  ApplicationInfo,
  DeploymentInfo,
  EventInfo,
  IngressInfo,
  NodeInfo,
  PaginatedResponse,
  PodInfo,
  ServiceInfo,
  SummaryResponse,
} from '../types';

const BASE_URL = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function getClusters(): Promise<string[]> {
  const data = await fetchJSON<{ clusters: string[] }>(`${BASE_URL}/clusters`);
  return data.clusters;
}

export async function getPods(
  cluster?: string,
  namespace?: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<PodInfo>> {
  const params = new URLSearchParams();
  if (namespace) params.set('namespace', namespace);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = `?${params}`;

  if (cluster) {
    return fetchJSON<PaginatedResponse<PodInfo>>(
      `${BASE_URL}/pods/${encodeURIComponent(cluster)}${query}`,
    );
  }
  return fetchJSON<PaginatedResponse<PodInfo>>(`${BASE_URL}/pods${query}`);
}

export async function getServices(
  cluster?: string,
  namespace?: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<ServiceInfo>> {
  const params = new URLSearchParams();
  if (namespace) params.set('namespace', namespace);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = `?${params}`;

  if (cluster) {
    return fetchJSON<PaginatedResponse<ServiceInfo>>(
      `${BASE_URL}/services/${encodeURIComponent(cluster)}${query}`,
    );
  }
  return fetchJSON<PaginatedResponse<ServiceInfo>>(
    `${BASE_URL}/services${query}`,
  );
}

export async function restartPod(
  cluster: string,
  namespace: string,
  pod: string,
): Promise<{ message: string }> {
  return fetchJSON<{ message: string }>(
    `${BASE_URL}/pods/${encodeURIComponent(cluster)}/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}`,
    { method: 'DELETE' },
  );
}

export async function getDeployments(
  cluster?: string,
  namespace?: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<DeploymentInfo>> {
  const params = new URLSearchParams();
  if (namespace) params.set('namespace', namespace);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = `?${params}`;

  if (cluster) {
    return fetchJSON<PaginatedResponse<DeploymentInfo>>(
      `${BASE_URL}/deployments/${encodeURIComponent(cluster)}${query}`,
    );
  }
  return fetchJSON<PaginatedResponse<DeploymentInfo>>(
    `${BASE_URL}/deployments${query}`,
  );
}

export async function scaleDeployment(
  cluster: string,
  namespace: string,
  deployment: string,
  replicas: number,
): Promise<DeploymentInfo> {
  return fetchJSON<DeploymentInfo>(
    `${BASE_URL}/deployments/${encodeURIComponent(cluster)}/${encodeURIComponent(namespace)}/${encodeURIComponent(deployment)}/scale`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replicas }),
    },
  );
}

export async function rolloutRestartDeployment(
  cluster: string,
  namespace: string,
  deployment: string,
): Promise<{ message: string }> {
  return fetchJSON<{ message: string }>(
    `${BASE_URL}/deployments/${encodeURIComponent(cluster)}/${encodeURIComponent(namespace)}/${encodeURIComponent(deployment)}/restart`,
    { method: 'POST' },
  );
}

export async function getPodLogs(
  cluster: string,
  namespace: string,
  pod: string,
  tail = 500,
): Promise<string> {
  const data = await fetchJSON<{ logs: string }>(
    `${BASE_URL}/pods/${encodeURIComponent(cluster)}/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/logs?tail=${tail}`,
  );
  return data.logs;
}

export async function getNamespaces(): Promise<Record<string, string[]>> {
  return fetchJSON<Record<string, string[]>>(`${BASE_URL}/namespaces`);
}

export async function getNodes(
  cluster?: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<NodeInfo>> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = `?${params}`;

  if (cluster) {
    return fetchJSON<PaginatedResponse<NodeInfo>>(
      `${BASE_URL}/nodes/${encodeURIComponent(cluster)}${query}`,
    );
  }
  return fetchJSON<PaginatedResponse<NodeInfo>>(`${BASE_URL}/nodes${query}`);
}

export async function getEvents(
  cluster?: string,
  namespace?: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<EventInfo>> {
  const params = new URLSearchParams();
  if (namespace) params.set('namespace', namespace);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = `?${params}`;

  if (cluster) {
    return fetchJSON<PaginatedResponse<EventInfo>>(
      `${BASE_URL}/events/${encodeURIComponent(cluster)}${query}`,
    );
  }
  return fetchJSON<PaginatedResponse<EventInfo>>(`${BASE_URL}/events${query}`);
}

export async function getIngresses(
  cluster?: string,
  namespace?: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<IngressInfo>> {
  const params = new URLSearchParams();
  if (namespace) params.set('namespace', namespace);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = `?${params}`;

  if (cluster) {
    return fetchJSON<PaginatedResponse<IngressInfo>>(
      `${BASE_URL}/ingresses/${encodeURIComponent(cluster)}${query}`,
    );
  }
  return fetchJSON<PaginatedResponse<IngressInfo>>(
    `${BASE_URL}/ingresses${query}`,
  );
}

export function streamPodLogsURL(
  cluster: string,
  namespace: string,
  pod: string,
  tail = 100,
): string {
  return `${BASE_URL}/pods/${encodeURIComponent(cluster)}/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/logs/stream?tail=${tail}`;
}

export async function getSummary(): Promise<SummaryResponse> {
  return fetchJSON<SummaryResponse>(`${BASE_URL}/summary`);
}

export async function getApplications(
  cluster?: string,
  namespace?: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<ApplicationInfo>> {
  const params = new URLSearchParams();
  if (namespace) params.set('namespace', namespace);
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = `?${params}`;

  if (cluster) {
    return fetchJSON<PaginatedResponse<ApplicationInfo>>(
      `${BASE_URL}/applications/${encodeURIComponent(cluster)}${query}`,
    );
  }
  return fetchJSON<PaginatedResponse<ApplicationInfo>>(
    `${BASE_URL}/applications${query}`,
  );
}

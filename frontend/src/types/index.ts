export interface PodInfo {
  cluster: string;
  namespace: string;
  name: string;
  ready: string;
  status: string;
  age: string;
}

export interface ServiceInfo {
  cluster: string;
  namespace: string;
  name: string;
  type: string;
  clusterIp: string;
  ports: string;
  age: string;
  pods: PodInfo[];
}

export interface DeploymentInfo {
  cluster: string;
  namespace: string;
  name: string;
  replicas: number;
  available: number;
  age: string;
}

export interface NodeInfo {
  cluster: string;
  name: string;
  status: string;
  roles: string;
  version: string;
  os: string;
  arch: string;
  cpuCapacity: string;
  memoryCapacity: string;
  cpuAllocatable: string;
  memoryAllocatable: string;
  age: string;
}

export interface EventInfo {
  cluster: string;
  namespace: string;
  type: string;
  reason: string;
  object: string;
  message: string;
  count: number;
  lastSeen: string;
}

export interface IngressInfo {
  cluster: string;
  namespace: string;
  name: string;
  hosts: string[];
  paths: string;
  age: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClusterSummary {
  name: string;
  status: string;
  pods: number;
  podsRunning: number;
  podsPending: number;
  podsFailed: number;
  deployments: number;
  deploymentsAvailable: number;
  deploymentsUnavailable: number;
  services: number;
  nodes: number;
  nodesReady: number;
  ingresses: number;
  namespaces: number;
}

export interface SummaryResponse {
  clusters: ClusterSummary[];
}

export type HealthStatus =
  | 'Healthy'
  | 'Progressing'
  | 'Degraded'
  | 'Suspended'
  | 'Missing'
  | 'Unknown';

export type SyncStatus = 'Synced' | 'OutOfSync' | 'Unknown';

export interface AppResource {
  kind: string;
  name: string;
  namespace: string;
  status: string;
  health: HealthStatus;
}

export interface TargetState {
  replicas: number;
}

export interface LiveState {
  availableReplicas: number;
  readyReplicas: number;
  unavailableReplicas: number;
  updatedReplicas: number;
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
}

export interface ApplicationInfo {
  name: string;
  namespace: string;
  cluster: string;
  health: HealthStatus;
  syncStatus: SyncStatus;
  source: string;
  targetState: TargetState;
  liveState: LiveState;
  resources: AppResource[];
  age: string;
}

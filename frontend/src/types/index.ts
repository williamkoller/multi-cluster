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

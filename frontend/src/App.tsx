import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import {
  getClusters,
  getApplications,
  getDeployments,
  getEvents,
  getIngresses,
  getNamespaces,
  getNodes,
  getPods,
  getServices,
  getSummary,
  restartPod,
  rolloutRestartDeployment,
  scaleDeployment,
} from './api/client';
import { ApplicationCards } from './components/ApplicationCard';
import { ClusterSelector } from './components/ClusterSelector';
import { DeploymentsTable } from './components/DeploymentsTable';
import { EventsTable } from './components/EventsTable';
import { IngressesTable } from './components/IngressesTable';
import { NodesTable } from './components/NodesTable';
import { OverviewCards } from './components/OverviewCards';
import { Pagination } from './components/Pagination';
import { PodLogsViewer } from './components/PodLogsViewer';
import { PodsTable } from './components/PodsTable';
import { SearchBar } from './components/SearchBar';
import { ServicesTable } from './components/ServicesTable';
import { ToastContainer } from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import type {
  ApplicationInfo,
  ClusterSummary,
  DeploymentInfo,
  EventInfo,
  IngressInfo,
  NodeInfo,
  PaginatedResponse,
  PodInfo,
  ServiceInfo,
} from './types';

type Tab =
  | 'overview'
  | 'applications'
  | 'pods'
  | 'services'
  | 'deployments'
  | 'nodes'
  | 'events'
  | 'ingresses';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'pods', label: 'Pods' },
  { key: 'services', label: 'Services' },
  { key: 'deployments', label: 'Deployments' },
  { key: 'nodes', label: 'Nodes' },
  { key: 'events', label: 'Events' },
  { key: 'ingresses', label: 'Ingresses' },
];

function exportCSV(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [clusters, setClusters] = useState<string[]>([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [namespace, setNamespace] = useState('');
  const [allNamespaces, setAllNamespaces] = useState<string[]>([]);
  const [summary, setSummary] = useState<ClusterSummary[]>([]);
  const [applications, setApplications] = useState<
    PaginatedResponse<ApplicationInfo>
  >({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 1 });
  const [pods, setPods] = useState<PaginatedResponse<PodInfo>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [services, setServices] = useState<PaginatedResponse<ServiceInfo>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [deployments, setDeployments] = useState<
    PaginatedResponse<DeploymentInfo>
  >({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 1 });
  const [nodes, setNodes] = useState<PaginatedResponse<NodeInfo>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [events, setEvents] = useState<PaginatedResponse<EventInfo>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [ingresses, setIngresses] = useState<PaginatedResponse<IngressInfo>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('darkMode') === 'true',
  );
  const [autoRefresh, setAutoRefresh] = useState(0);
  const [logsTarget, setLogsTarget] = useState<{
    cluster: string;
    namespace: string;
    pod: string;
  } | null>(null);
  const { toasts, addToast, removeToast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    getClusters()
      .then(setClusters)
      .catch(() => {});
    getNamespaces()
      .then((data) => {
        const all = new Set<string>();
        Object.values(data).forEach((nsList) =>
          nsList.forEach((ns) => all.add(ns)),
        );
        setAllNamespaces(Array.from(all).sort());
      })
      .catch(() => {});
  }, []);

  // Reset page when tab/cluster/namespace changes
  useEffect(() => {
    setPage(1);
  }, [tab, selectedCluster, namespace]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cluster = selectedCluster || undefined;
      const ns = namespace || undefined;
      if (tab === 'overview') {
        const resp = await getSummary();
        setSummary(resp.clusters);
      } else if (tab === 'applications')
        setApplications(await getApplications(cluster, ns, page, pageSize));
      else if (tab === 'pods')
        setPods(await getPods(cluster, ns, page, pageSize));
      else if (tab === 'services')
        setServices(await getServices(cluster, ns, page, pageSize));
      else if (tab === 'deployments')
        setDeployments(await getDeployments(cluster, ns, page, pageSize));
      else if (tab === 'nodes')
        setNodes(await getNodes(cluster, page, pageSize));
      else if (tab === 'events')
        setEvents(await getEvents(cluster, ns, page, pageSize));
      else if (tab === 'ingresses')
        setIngresses(await getIngresses(cluster, ns, page, pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [tab, selectedCluster, namespace, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh > 0) {
      intervalRef.current = setInterval(fetchData, autoRefresh * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchData]);

  const handleRestart = async (cluster: string, ns: string, pod: string) => {
    try {
      await restartPod(cluster, ns, pod);
      addToast('success', `Pod ${pod} restarted`);
      await fetchData();
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Failed to restart pod',
      );
    }
  };

  const handleScale = async (
    cluster: string,
    ns: string,
    deployment: string,
    replicas: number,
  ) => {
    try {
      await scaleDeployment(cluster, ns, deployment, replicas);
      addToast('success', `${deployment} scaled to ${replicas} replicas`);
      await fetchData();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to scale');
    }
  };

  const handleRolloutRestart = async (
    cluster: string,
    ns: string,
    deployment: string,
  ) => {
    try {
      await rolloutRestartDeployment(cluster, ns, deployment);
      addToast('success', `${deployment} rollout restart triggered`);
      await fetchData();
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : 'Failed to rollout restart',
      );
    }
  };

  const handleViewLogs = (cluster: string, ns: string, pod: string) => {
    setLogsTarget({ cluster, namespace: ns, pod });
  };

  // Get current paginated response for active tab
  const currentPagination = () => {
    switch (tab) {
      case 'applications':
        return applications;
      case 'pods':
        return pods;
      case 'services':
        return services;
      case 'deployments':
        return deployments;
      case 'nodes':
        return nodes;
      case 'events':
        return events;
      case 'ingresses':
        return ingresses;
    }
  };

  // Search filtering (client-side on current page)
  const q = search.toLowerCase();
  const filteredApps = q
    ? applications.items.filter((a) =>
        `${a.cluster} ${a.namespace} ${a.name} ${a.health} ${a.syncStatus}`
          .toLowerCase()
          .includes(q),
      )
    : applications.items;
  const filteredPods = q
    ? pods.items.filter((p) =>
        `${p.cluster} ${p.namespace} ${p.name} ${p.status}`
          .toLowerCase()
          .includes(q),
      )
    : pods.items;
  const filteredServices = q
    ? services.items.filter((s) =>
        `${s.cluster} ${s.namespace} ${s.name} ${s.type}`
          .toLowerCase()
          .includes(q),
      )
    : services.items;
  const filteredDeployments = q
    ? deployments.items.filter((d) =>
        `${d.cluster} ${d.namespace} ${d.name}`.toLowerCase().includes(q),
      )
    : deployments.items;
  const filteredNodes = q
    ? nodes.items.filter((n) =>
        `${n.cluster} ${n.name} ${n.status} ${n.roles}`
          .toLowerCase()
          .includes(q),
      )
    : nodes.items;
  const filteredEvents = q
    ? events.items.filter((e) =>
        `${e.cluster} ${e.namespace} ${e.reason} ${e.message} ${e.object}`
          .toLowerCase()
          .includes(q),
      )
    : events.items;
  const filteredIngresses = q
    ? ingresses.items.filter((i) =>
        `${i.cluster} ${i.namespace} ${i.name} ${i.hosts.join(' ')}`
          .toLowerCase()
          .includes(q),
      )
    : ingresses.items;

  const handleExport = () => {
    if (tab === 'applications') {
      exportCSV(
        [
          'Cluster',
          'Namespace',
          'Name',
          'Health',
          'Sync',
          'Source',
          'Replicas',
          'Available',
          'Age',
        ],
        filteredApps.map((a) => [
          a.cluster,
          a.namespace,
          a.name,
          a.health,
          a.syncStatus,
          a.source,
          String(a.targetState.replicas),
          String(a.liveState.availableReplicas),
          a.age,
        ]),
        'applications.csv',
      );
    } else if (tab === 'pods') {
      exportCSV(
        ['Cluster', 'Namespace', 'Name', 'Ready', 'Status', 'Age'],
        filteredPods.map((p) => [
          p.cluster,
          p.namespace,
          p.name,
          p.ready,
          p.status,
          p.age,
        ]),
        'pods.csv',
      );
    } else if (tab === 'services') {
      exportCSV(
        ['Cluster', 'Namespace', 'Name', 'Type', 'ClusterIP', 'Ports', 'Age'],
        filteredServices.map((s) => [
          s.cluster,
          s.namespace,
          s.name,
          s.type,
          s.clusterIp,
          s.ports,
          s.age,
        ]),
        'services.csv',
      );
    } else if (tab === 'deployments') {
      exportCSV(
        ['Cluster', 'Namespace', 'Name', 'Replicas', 'Available', 'Age'],
        filteredDeployments.map((d) => [
          d.cluster,
          d.namespace,
          d.name,
          String(d.replicas),
          String(d.available),
          d.age,
        ]),
        'deployments.csv',
      );
    } else if (tab === 'nodes') {
      exportCSV(
        [
          'Cluster',
          'Name',
          'Status',
          'Roles',
          'Version',
          'OS',
          'Arch',
          'CPU',
          'Memory',
          'Age',
        ],
        filteredNodes.map((n) => [
          n.cluster,
          n.name,
          n.status,
          n.roles,
          n.version,
          n.os,
          n.arch,
          n.cpuCapacity,
          n.memoryCapacity,
          n.age,
        ]),
        'nodes.csv',
      );
    } else if (tab === 'events') {
      exportCSV(
        [
          'Cluster',
          'Namespace',
          'Type',
          'Reason',
          'Object',
          'Message',
          'Count',
          'LastSeen',
        ],
        filteredEvents.map((e) => [
          e.cluster,
          e.namespace,
          e.type,
          e.reason,
          e.object,
          e.message,
          String(e.count),
          e.lastSeen,
        ]),
        'events.csv',
      );
    } else if (tab === 'ingresses') {
      exportCSV(
        ['Cluster', 'Namespace', 'Name', 'Hosts', 'Paths', 'Age'],
        filteredIngresses.map((i) => [
          i.cluster,
          i.namespace,
          i.name,
          i.hosts.join('; '),
          i.paths,
          i.age,
        ]),
        'ingresses.csv',
      );
    }
    addToast('success', `Exported ${tab}.csv`);
  };

  const pag = currentPagination();

  return (
    <div className='min-h-screen bg-[var(--color-surface-sunken)] text-[var(--color-text-primary)] transition-colors'>
      {/* ArgoCD-style dark header */}
      <header className='bg-[var(--color-header-bg)] border-b border-[var(--color-header-border)] shadow-sm'>
        <div className='mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8'>
          <div className='flex h-12 items-center justify-between'>
            {/* Logo + Title */}
            <div className='flex items-center gap-3'>
              <svg
                className='h-7 w-7 text-[var(--color-accent)]'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth='1.5'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'
                />
              </svg>
              <span className='text-sm font-semibold tracking-wide text-[var(--color-header-text-bright)]'>
                Multi-Cluster Dashboard
              </span>
            </div>

            {/* Right controls */}
            <div className='flex items-center gap-2'>
              <ClusterSelector
                clusters={clusters}
                selected={selectedCluster}
                onChange={setSelectedCluster}
              />
              <select
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className='h-8 rounded border border-[var(--color-header-control-border)] bg-[var(--color-header-control-bg)] px-2.5 text-xs text-[var(--color-header-text)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none transition-colors'
              >
                <option value=''>All Namespaces</option>
                {allNamespaces.map((ns) => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))}
              </select>
              <select
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(Number(e.target.value))}
                className='h-8 rounded border border-[var(--color-header-control-border)] bg-[var(--color-header-control-bg)] px-2.5 text-xs text-[var(--color-header-text)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] focus:outline-none transition-colors'
              >
                <option value={0}>Manual</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
              <button
                onClick={() => setDarkMode((d) => !d)}
                className='flex h-8 w-8 items-center justify-center rounded text-[var(--color-header-text)] hover:text-[var(--color-header-text-bright)] hover:bg-[var(--color-header-control-hover)] transition-colors'
                title='Toggle dark mode'
              >
                {darkMode ? (
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='2'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
                    />
                  </svg>
                ) : (
                  <svg
                    className='h-4 w-4'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='2'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z'
                    />
                  </svg>
                )}
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className='inline-flex h-8 items-center gap-1.5 rounded bg-[var(--color-accent)] px-3 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors'
              >
                {loading ? (
                  <svg
                    className='h-3.5 w-3.5 animate-spin'
                    viewBox='0 0 24 24'
                    fill='none'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                    />
                  </svg>
                ) : (
                  <svg
                    className='h-3.5 w-3.5'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='2'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182'
                    />
                  </svg>
                )}
                Sync
              </button>
            </div>
          </div>
        </div>
      </header>

      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as Tab)}>
        {/* Navigation bar */}
        <nav className='border-b border-[var(--color-border)] bg-[var(--color-surface)]'>
          <div className='mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center justify-between'>
              <Tabs.List className='flex -mb-px'>
                {TABS.map((t) => (
                  <Tabs.Trigger
                    key={t.key}
                    value={t.key}
                    className='px-4 py-3 text-xs font-medium tracking-wide border-b-2 transition-colors text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)] data-[state=active]:text-[var(--color-accent)] data-[state=active]:border-[var(--color-accent)] outline-none'
                  >
                    {t.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {tab !== 'overview' && tab !== 'applications' && (
                <div className='flex items-center gap-2'>
                  <div className='w-52'>
                    <SearchBar
                      value={search}
                      onChange={setSearch}
                      placeholder={`Search ${tab}...`}
                    />
                  </div>
                  <button
                    onClick={handleExport}
                    className='inline-flex h-7 items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[10px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-secondary)] transition-colors'
                  >
                    <svg
                      className='h-3 w-3'
                      fill='none'
                      viewBox='0 0 24 24'
                      strokeWidth='2'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3'
                      />
                    </svg>
                    Export
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {error && (
          <div className='mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 mt-4'>
            <div className='rounded-lg border border-[var(--color-health-red)]/20 bg-[var(--color-health-red)]/5 p-3 text-xs text-[var(--color-health-red)] flex items-center gap-2'>
              <svg
                className='h-4 w-4 shrink-0'
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z'
                  clipRule='evenodd'
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        <main className='mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8'>
          <Tabs.Content
            value='overview'
            forceMount
            className={tab !== 'overview' ? 'hidden' : ''}
          >
            <OverviewCards clusters={summary} loading={loading} />
          </Tabs.Content>
          <Tabs.Content
            value='applications'
            forceMount
            className={tab !== 'applications' ? 'hidden' : ''}
          >
            <ApplicationCards
              apps={filteredApps}
              loading={loading}
              onSync={handleRolloutRestart}
              onScale={handleScale}
              onRefresh={fetchData}
              onDeletePod={handleRestart}
              onViewLogs={handleViewLogs}
            />
          </Tabs.Content>
          <Tabs.Content
            value='pods'
            forceMount
            className={tab !== 'pods' ? 'hidden' : ''}
          >
            <PodsTable
              pods={filteredPods}
              loading={loading}
              onRestart={handleRestart}
              onViewLogs={handleViewLogs}
            />
          </Tabs.Content>
          <Tabs.Content
            value='services'
            forceMount
            className={tab !== 'services' ? 'hidden' : ''}
          >
            <ServicesTable services={filteredServices} loading={loading} />
          </Tabs.Content>
          <Tabs.Content
            value='deployments'
            forceMount
            className={tab !== 'deployments' ? 'hidden' : ''}
          >
            <DeploymentsTable
              deployments={filteredDeployments}
              loading={loading}
              onScale={handleScale}
              onRolloutRestart={handleRolloutRestart}
            />
          </Tabs.Content>
          <Tabs.Content
            value='nodes'
            forceMount
            className={tab !== 'nodes' ? 'hidden' : ''}
          >
            <NodesTable nodes={filteredNodes} loading={loading} />
          </Tabs.Content>
          <Tabs.Content
            value='events'
            forceMount
            className={tab !== 'events' ? 'hidden' : ''}
          >
            <EventsTable events={filteredEvents} loading={loading} />
          </Tabs.Content>
          <Tabs.Content
            value='ingresses'
            forceMount
            className={tab !== 'ingresses' ? 'hidden' : ''}
          >
            <IngressesTable ingresses={filteredIngresses} loading={loading} />
          </Tabs.Content>
          {tab !== 'overview' && tab !== 'applications' && (
            <Pagination
              page={pag?.page || 1}
              totalPages={pag?.totalPages || 1}
              total={pag?.total || 0}
              pageSize={pag?.pageSize || 50}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </main>
      </Tabs.Root>

      {logsTarget && (
        <PodLogsViewer
          cluster={logsTarget.cluster}
          namespace={logsTarget.namespace}
          pod={logsTarget.pod}
          onClose={() => setLogsTarget(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default App;

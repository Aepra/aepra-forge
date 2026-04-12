export type StoredProjectNode = Record<string, unknown> & {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data?: unknown;
};

export type StoredProjectEdge = Record<string, unknown> & {
  id: string;
  source?: string;
  target?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: unknown;
  style?: unknown;
};

export type StoredProject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: StoredProjectNode[];
  edges: StoredProjectEdge[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tablesCount: number;
  relationsCount: number;
  isBlank: boolean;
};

const PROJECT_INDEX_KEY = "aepra.projects.index";
const CURRENT_PROJECT_KEY = "aepra.projects.current";
const PROJECT_PREFIX = "aepra.project.";

const hasWindow = () => typeof window !== "undefined";

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const readProjectIndex = (): ProjectSummary[] => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(PROJECT_INDEX_KEY);
  const parsed = safeParse<ProjectSummary[]>(raw, []);
  return Array.isArray(parsed) ? parsed : [];
};

const writeProjectIndex = (projects: ProjectSummary[]) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(projects));
};

const deriveProjectName = (project: Pick<StoredProject, "nodes">) => {
  const firstNode = project.nodes.find((node) => Boolean((node.data as { label?: string } | undefined)?.label));
  const label = String((firstNode?.data as { label?: string } | undefined)?.label || "").trim();
  return label || "Blank";
};

export const getCurrentProjectId = () => {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(CURRENT_PROJECT_KEY);
};

export const setCurrentProjectId = (projectId: string | null) => {
  if (!hasWindow()) return;

  if (!projectId) {
    window.localStorage.removeItem(CURRENT_PROJECT_KEY);
    return;
  }

  window.localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
};

export const loadProjectSummaries = () => {
  return readProjectIndex().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const loadProject = (projectId: string) => {
  if (!hasWindow()) return null;

  const raw = window.localStorage.getItem(`${PROJECT_PREFIX}${projectId}`);
  if (!raw) return null;

  const parsed = safeParse<StoredProject | null>(raw, null);
  return parsed && parsed.id === projectId ? parsed : null;
};

export const deleteProject = (projectId: string) => {
  if (!hasWindow()) return;

  window.localStorage.removeItem(`${PROJECT_PREFIX}${projectId}`);
  const nextProjects = readProjectIndex().filter((project) => project.id !== projectId);
  writeProjectIndex(nextProjects);

  if (getCurrentProjectId() === projectId) {
    setCurrentProjectId(nextProjects[0]?.id ?? null);
  }
};

export const saveProject = (project: {
  id?: string;
  name?: string;
  nodes: StoredProjectNode[];
  edges: StoredProjectEdge[];
}) => {
  if (!hasWindow()) return null;

  const now = new Date().toISOString();
  const existingId = project.id || getCurrentProjectId();
  const nextId = existingId || `project_${Date.now()}`;
  const currentProject = loadProject(nextId);
  const nextProject: StoredProject = {
    id: nextId,
    name: project.name?.trim() || currentProject?.name || deriveProjectName(project),
    createdAt: currentProject?.createdAt || now,
    updatedAt: now,
    nodes: project.nodes,
    edges: project.edges,
  };

  window.localStorage.setItem(`${PROJECT_PREFIX}${nextId}`, JSON.stringify(nextProject));

  const nextSummary: ProjectSummary = {
    id: nextProject.id,
    name: nextProject.name,
    createdAt: nextProject.createdAt,
    updatedAt: nextProject.updatedAt,
    tablesCount: nextProject.nodes.length,
    relationsCount: nextProject.edges.length,
    isBlank: nextProject.nodes.length === 0,
  };

  const existingProjects = readProjectIndex().filter((item) => item.id !== nextId);
  const nextProjects = [nextSummary, ...existingProjects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  writeProjectIndex(nextProjects);
  setCurrentProjectId(nextId);

  return nextProject;
};

export const createBlankProject = () => {
  return saveProject({
    name: "Blank",
    nodes: [],
    edges: [],
  });
};

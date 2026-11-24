import type {
  GitHubStatusResponse,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TeamMember,
  TeamUpdate,
  UpdateCategory,
  VercelStatusResponse,
} from '../shared/types';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Begäran misslyckades (${response.status})`;
    throw new Error(message);
  }
  return data as unknown as T;
}

export const api = {
  listMembers(): Promise<TeamMember[]> {
    return requestJson<TeamMember[]>('/api/members');
  },

  listProjects(): Promise<Project[]> {
    return requestJson<Project[]>('/api/projects');
  },

  createProject(input: {
    name: string;
    description: string;
    githubRepo: string;
    vercelProjectId: string;
    productionUrl: string;
  }): Promise<Project> {
    return requestJson<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateProject(
    id: string,
    patch: Partial<{
      name: string;
      description: string;
      githubRepo: string;
      vercelProjectId: string;
      productionUrl: string;
    }>
  ): Promise<Project> {
    return requestJson<Project>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteProject(id: string): Promise<{ deleted: boolean; id: string }> {
    return requestJson<{ deleted: boolean; id: string }>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listTasks(projectId: string): Promise<Task[]> {
    return requestJson<Task[]>(`/api/tasks?projectId=${encodeURIComponent(projectId)}`);
  },

  createTask(input: {
    projectId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
  }): Promise<Task> {
    return requestJson<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateTask(
    id: string,
    patch: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeId: string;
    }>
  ): Promise<Task> {
    return requestJson<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteTask(id: string): Promise<{ deleted: boolean; id: string }> {
    return requestJson<{ deleted: boolean; id: string }>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listUpdates(projectId: string): Promise<TeamUpdate[]> {
    return requestJson<TeamUpdate[]>(`/api/updates?projectId=${encodeURIComponent(projectId)}`);
  },

  createUpdate(input: {
    projectId: string;
    authorId: string;
    category: UpdateCategory;
    message: string;
  }): Promise<TeamUpdate> {
    return requestJson<TeamUpdate>('/api/updates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  deleteUpdate(id: string): Promise<{ deleted: boolean; id: string }> {
    return requestJson<{ deleted: boolean; id: string }>(`/api/updates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  fetchGitHubStatus(repo: string): Promise<GitHubStatusResponse> {
    return requestJson<GitHubStatusResponse>(`/api/integrations/github?repo=${encodeURIComponent(repo)}`);
  },

  fetchVercelStatus(projectId: string): Promise<VercelStatusResponse> {
    return requestJson<VercelStatusResponse>(
      `/api/integrations/vercel?projectId=${encodeURIComponent(projectId)}`
    );
  },
};

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type UpdateCategory = 'release' | 'decision' | 'blocker' | 'note';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  initials: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  githubRepo: string;
  vercelProjectId: string;
  productionUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamUpdate {
  id: string;
  projectId: string;
  authorId: string;
  category: UpdateCategory;
  message: string;
  createdAt: string;
}

export interface GitHubCommitItem {
  sha: string;
  message: string;
  authorName: string;
  date: string;
  url: string;
}

export interface GitHubStatusResponse {
  configured: boolean;
  repo: string;
  fullName?: string;
  description?: string;
  defaultBranch?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  openPullRequests?: number;
  isPrivate?: boolean;
  pushedAt?: string;
  htmlUrl?: string;
  commits?: GitHubCommitItem[];
  hasServerToken: boolean;
  rateLimited?: boolean;
  error?: string;
  fetchedAt: string;
}

export interface VercelDeploymentItem {
  uid: string;
  name: string;
  url: string;
  state: 'READY' | 'BUILDING' | 'ERROR' | 'QUEUED' | 'CANCELED' | string;
  target: 'production' | 'preview' | string;
  createdAt: string;
  commitMessage?: string;
  commitBranch?: string;
}

export interface VercelStatusResponse {
  configured: boolean;
  hasServerToken: boolean;
  projectId: string;
  projectName?: string;
  framework?: string;
  deployments: VercelDeploymentItem[];
  error?: string;
  fetchedAt: string;
}

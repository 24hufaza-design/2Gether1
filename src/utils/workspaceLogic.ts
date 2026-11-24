import type {
  Task,
  TaskPriority,
  TaskStatus,
  TeamUpdate,
  UpdateCategory,
} from '../shared/types';

export interface TaskFilterOptions {
  search: string;
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  assigneeId: string | 'all';
}

export interface ProjectMetrics {
  totalTasks: number;
  todoCount: number;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;
  highPriorityOpenCount: number;
  completionRate: number;
  recentUpdatesCount: number;
}

const REPO_SLUG_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const VERCEL_ID_REGEX = /^[A-Za-z0-9_.-]+$/;

export function validateRepoSlug(raw: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  const withoutPrefix = trimmed
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

  if (!REPO_SLUG_REGEX.test(withoutPrefix) || withoutPrefix.includes('..')) {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Ange GitHub-repo i formatet agare/repo (t.ex. vercel/next.js).',
    };
  }
  return { valid: true, normalized: withoutPrefix };
}

export function validateVercelProjectId(raw: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  if (!VERCEL_ID_REGEX.test(trimmed) || trimmed.includes('..')) {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Ange ett giltigt Vercel-projekt-ID eller slug utan mellanslag.',
    };
  }
  return { valid: true, normalized: trimmed };
}

export function validateSafeHttpUrl(raw: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        normalized: trimmed,
        error: 'Endast adresser med https:// eller http:// är tillåtna.',
      };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Ange en giltig webbadress (t.ex. https://2gether.vercel.app).',
    };
  }
}

export function filterTasks(tasks: Task[], filters: TaskFilterOptions): Task[] {
  const query = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (filters.status !== 'all' && task.status !== filters.status) {
      return false;
    }
    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false;
    }
    if (filters.assigneeId !== 'all' && task.assigneeId !== filters.assigneeId) {
      return false;
    }
    if (query) {
      const matchesTitle = task.title.toLowerCase().includes(query);
      const matchesDesc = task.description.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc) {
        return false;
      }
    }
    return true;
  });
}

export function computeProjectMetrics(tasks: Task[], updates: TeamUpdate[]): ProjectMetrics {
  let todoCount = 0;
  let inProgressCount = 0;
  let reviewCount = 0;
  let doneCount = 0;
  let highPriorityOpenCount = 0;

  for (const task of tasks) {
    if (task.status === 'todo') todoCount += 1;
    else if (task.status === 'in_progress') inProgressCount += 1;
    else if (task.status === 'review') reviewCount += 1;
    else if (task.status === 'done') doneCount += 1;

    if (task.status !== 'done' && task.priority === 'high') {
      highPriorityOpenCount += 1;
    }
  }

  const totalTasks = tasks.length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((doneCount / totalTasks) * 100);

  return {
    totalTasks,
    todoCount,
    inProgressCount,
    reviewCount,
    doneCount,
    highPriorityOpenCount,
    completionRate,
    recentUpdatesCount: updates.length,
  };
}

export function formatRelativeTimeSv(isoDate: string, nowMs: number = Date.now()): string {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) {
    return 'nyss';
  }
  const diffSeconds = Math.max(0, Math.floor((nowMs - parsed) / 1000));
  if (diffSeconds < 60) return 'nyss';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min sedan`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} tim sedan`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} d sedan`;
  return new Date(parsed).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  });
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Att göra',
  in_progress: 'Pågående',
  review: 'Granskning',
  done: 'Klar',
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Låg',
  medium: 'Medel',
  high: 'Hög',
};

export const UPDATE_CATEGORY_LABEL: Record<UpdateCategory, string> = {
  release: 'Release',
  decision: 'Beslut',
  blocker: 'Blockerare',
  note: 'Notering',
};

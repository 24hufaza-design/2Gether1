import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProjectMetrics,
  filterTasks,
  formatRelativeTimeSv,
  validateRepoSlug,
  validateSafeHttpUrl,
  validateVercelProjectId,
} from './workspaceLogic';
import type { Task, TeamUpdate } from '../shared/types';

const sampleTasks: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Konfigurera Vercel-rewrites',
    description: 'Säkerställ att /api/* går till serverless handler',
    status: 'done',
    priority: 'high',
    assigneeId: 'm1',
    createdAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-24T10:00:00.000Z',
  },
  {
    id: 't2',
    projectId: 'p1',
    title: 'Implementera GitHub-statusproxy',
    description: 'Hämta commits och öppna PRs',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'm2',
    createdAt: '2026-11-24T11:00:00.000Z',
    updatedAt: '2026-11-24T11:00:00.000Z',
  },
  {
    id: 't3',
    projectId: 'p1',
    title: 'Finjustera mobilmeny',
    description: 'Drawer med minst 44px tryckytor',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'm3',
    createdAt: '2026-11-24T12:00:00.000Z',
    updatedAt: '2026-11-24T12:00:00.000Z',
  },
];

const sampleUpdates: TeamUpdate[] = [
  {
    id: 'u1',
    projectId: 'p1',
    authorId: 'm1',
    category: 'release',
    message: 'API v1 driftsatt',
    createdAt: '2026-11-24T12:30:00.000Z',
  },
];

test('validateRepoSlug normalizes full GitHub URLs and rejects invalid paths', () => {
  assert.deepEqual(validateRepoSlug('https://github.com/vercel/next.js/'), {
    valid: true,
    normalized: 'vercel/next.js',
  });
  assert.deepEqual(validateRepoSlug('vitejs/vite.git'), {
    valid: true,
    normalized: 'vitejs/vite',
  });
  assert.equal(validateRepoSlug('../etc/passwd').valid, false);
  assert.equal(validateRepoSlug('invalid-slug').valid, false);
  assert.deepEqual(validateRepoSlug('   '), { valid: true, normalized: '' });
});

test('validateVercelProjectId accepts valid project slugs and rejects path traversal', () => {
  assert.equal(validateVercelProjectId('2gether-web').valid, true);
  assert.equal(validateVercelProjectId('prj_abc123').valid, true);
  assert.equal(validateVercelProjectId('bad/project').valid, false);
  assert.equal(validateVercelProjectId('..').valid, false);
});

test('validateSafeHttpUrl allows http/https and blocks javascript/data schemes', () => {
  assert.equal(validateSafeHttpUrl('https://2gether.vercel.app').valid, true);
  assert.equal(validateSafeHttpUrl('javascript:alert(1)').valid, false);
  assert.equal(validateSafeHttpUrl('data:text/html,<h1>x</h1>').valid, false);
  assert.equal(validateSafeHttpUrl('not a url').valid, false);
});

test('filterTasks filters by status, priority, assignee, and search query', () => {
  assert.equal(
    filterTasks(sampleTasks, {
      search: 'vercel',
      status: 'all',
      priority: 'all',
      assigneeId: 'all',
    }).length,
    1
  );
  assert.equal(
    filterTasks(sampleTasks, {
      search: '',
      status: 'all',
      priority: 'high',
      assigneeId: 'm2',
    })[0]?.id,
    't2'
  );
  assert.equal(
    filterTasks(sampleTasks, {
      search: '',
      status: 'review',
      priority: 'all',
      assigneeId: 'all',
    }).length,
    0
  );
});

test('computeProjectMetrics calculates counts and completion rate accurately', () => {
  const metrics = computeProjectMetrics(sampleTasks, sampleUpdates);
  assert.equal(metrics.totalTasks, 3);
  assert.equal(metrics.doneCount, 1);
  assert.equal(metrics.inProgressCount, 1);
  assert.equal(metrics.todoCount, 1);
  assert.equal(metrics.highPriorityOpenCount, 1);
  assert.equal(metrics.completionRate, 33);
  assert.equal(metrics.recentUpdatesCount, 1);

  const emptyMetrics = computeProjectMetrics([], []);
  assert.equal(emptyMetrics.completionRate, 0);
});

test('formatRelativeTimeSv formats Swedish relative timestamps deterministically', () => {
  const now = Date.parse('2026-11-24T12:00:00.000Z');
  assert.equal(formatRelativeTimeSv('2026-11-24T11:59:40.000Z', now), 'nyss');
  assert.equal(formatRelativeTimeSv('2026-11-24T11:45:00.000Z', now), '15 min sedan');
  assert.equal(formatRelativeTimeSv('2026-11-24T09:00:00.000Z', now), '3 tim sedan');
  assert.equal(formatRelativeTimeSv('2026-11-21T12:00:00.000Z', now), '3 d sedan');
});

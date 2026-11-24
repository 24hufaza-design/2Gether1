import express from 'express';
import {
  createProject,
  createTask,
  createUpdate,
  deleteProject,
  deleteTask,
  deleteUpdate,
  getProjectById,
  getTaskById,
  listMembers,
  listProjects,
  listTasks,
  listUpdates,
  updateProject,
  updateTask,
} from './db.ts';
import { fetchGitHubRepoStatus, fetchVercelProjectStatus } from './integrations.ts';
import type { TaskPriority, TaskStatus, UpdateCategory } from '../shared/types.ts';

const VALID_STATUSES = new Set<TaskStatus>(['todo', 'in_progress', 'review', 'done']);
const VALID_PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high']);
const VALID_CATEGORIES = new Set<UpdateCategory>(['release', 'decision', 'blocker', 'note']);
const REPO_SLUG_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const VERCEL_ID_REGEX = /^[A-Za-z0-9_.-]+$/;

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function isSafeHttpUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: '2gether-api',
      hasGitHubToken: Boolean(process.env.GITHUB_TOKEN?.trim()),
      hasVercelToken: Boolean(process.env.VERCEL_TOKEN?.trim()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/members', (_req, res) => {
    res.json(listMembers());
  });

  // Projects
  app.get('/api/projects', (_req, res) => {
    res.json(listProjects());
  });

  app.post('/api/projects', (req, res) => {
    const name = sanitizeText(req.body?.name, 80);
    const description = sanitizeText(req.body?.description, 400);
    const githubRepoRaw = sanitizeText(req.body?.githubRepo, 140)
      .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/+$/, '');
    const vercelProjectId = sanitizeText(req.body?.vercelProjectId, 100);
    const productionUrl = sanitizeText(req.body?.productionUrl, 240);

    if (!name) {
      res.status(400).json({ error: 'Projektnamn krävs.' });
      return;
    }
    if (githubRepoRaw && (!REPO_SLUG_REGEX.test(githubRepoRaw) || githubRepoRaw.includes('..'))) {
      res.status(400).json({ error: 'GitHub-repo måste följa formatet ägare/repo.' });
      return;
    }
    if (vercelProjectId && (!VERCEL_ID_REGEX.test(vercelProjectId) || vercelProjectId.includes('..'))) {
      res.status(400).json({ error: 'Ogiltigt Vercel-projekt-ID.' });
      return;
    }
    if (!isSafeHttpUrl(productionUrl)) {
      res.status(400).json({ error: 'Produktions-URL måste börja med https:// eller http://.' });
      return;
    }

    const project = createProject({
      name,
      description,
      githubRepo: githubRepoRaw,
      vercelProjectId,
      productionUrl,
    });
    res.status(201).json(project);
  });

  app.patch('/api/projects/:id', (req, res) => {
    const id = sanitizeText(req.params.id, 64);
    const existing = getProjectById(id);
    if (!existing) {
      res.status(404).json({ error: 'Projektet hittades inte.' });
      return;
    }

    const patch: Record<string, string> = {};
    if (req.body?.name !== undefined) {
      const name = sanitizeText(req.body.name, 80);
      if (!name) {
        res.status(400).json({ error: 'Projektnamn kan inte vara tomt.' });
        return;
      }
      patch.name = name;
    }
    if (req.body?.description !== undefined) {
      patch.description = sanitizeText(req.body.description, 400);
    }
    if (req.body?.githubRepo !== undefined) {
      const cleanedRepo = sanitizeText(req.body.githubRepo, 140)
        .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/\/+$/, '');
      if (cleanedRepo && (!REPO_SLUG_REGEX.test(cleanedRepo) || cleanedRepo.includes('..'))) {
        res.status(400).json({ error: 'GitHub-repo måste följa formatet ägare/repo.' });
        return;
      }
      patch.githubRepo = cleanedRepo;
    }
    if (req.body?.vercelProjectId !== undefined) {
      const vercelId = sanitizeText(req.body.vercelProjectId, 100);
      if (vercelId && (!VERCEL_ID_REGEX.test(vercelId) || vercelId.includes('..'))) {
        res.status(400).json({ error: 'Ogiltigt Vercel-projekt-ID.' });
        return;
      }
      patch.vercelProjectId = vercelId;
    }
    if (req.body?.productionUrl !== undefined) {
      const url = sanitizeText(req.body.productionUrl, 240);
      if (!isSafeHttpUrl(url)) {
        res.status(400).json({ error: 'Produktions-URL måste börja med https:// eller http://.' });
        return;
      }
      patch.productionUrl = url;
    }

    const updated = updateProject(id, patch);
    res.json(updated);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const id = sanitizeText(req.params.id, 64);
    const projects = listProjects();
    if (projects.length <= 1) {
      res.status(400).json({ error: 'Minst ett projekt måste finnas kvar i arbetsytan.' });
      return;
    }
    const deleted = deleteProject(id);
    if (!deleted) {
      res.status(404).json({ error: 'Projektet hittades inte.' });
      return;
    }
    res.json({ deleted: true, id });
  });

  // Tasks
  app.get('/api/tasks', (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : undefined;
    res.json(listTasks(projectId || undefined));
  });

  app.post('/api/tasks', (req, res) => {
    const projectId = sanitizeText(req.body?.projectId, 64);
    const title = sanitizeText(req.body?.title, 140);
    const description = sanitizeText(req.body?.description, 600);
    const statusRaw = sanitizeText(req.body?.status, 32) as TaskStatus;
    const priorityRaw = sanitizeText(req.body?.priority, 32) as TaskPriority;
    const assigneeId = sanitizeText(req.body?.assigneeId, 64) || 'm-linnea';

    if (!projectId || !getProjectById(projectId)) {
      res.status(400).json({ error: 'Giltigt projekt-ID krävs.' });
      return;
    }
    if (!title) {
      res.status(400).json({ error: 'Uppgiftstitel krävs.' });
      return;
    }

    const status: TaskStatus = VALID_STATUSES.has(statusRaw) ? statusRaw : 'todo';
    const priority: TaskPriority = VALID_PRIORITIES.has(priorityRaw) ? priorityRaw : 'medium';

    const task = createTask({
      projectId,
      title,
      description,
      status,
      priority,
      assigneeId,
    });
    res.status(201).json(task);
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const id = sanitizeText(req.params.id, 64);
    const existing = getTaskById(id);
    if (!existing) {
      res.status(404).json({ error: 'Uppgiften hittades inte.' });
      return;
    }

    const patch: Partial<{
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeId: string;
    }> = {};

    if (req.body?.title !== undefined) {
      const title = sanitizeText(req.body.title, 140);
      if (!title) {
        res.status(400).json({ error: 'Uppgiftstitel kan inte vara tom.' });
        return;
      }
      patch.title = title;
    }
    if (req.body?.description !== undefined) {
      patch.description = sanitizeText(req.body.description, 600);
    }
    if (req.body?.status !== undefined) {
      const status = sanitizeText(req.body.status, 32) as TaskStatus;
      if (!VALID_STATUSES.has(status)) {
        res.status(400).json({ error: 'Ogiltig uppgiftsstatus.' });
        return;
      }
      patch.status = status;
    }
    if (req.body?.priority !== undefined) {
      const priority = sanitizeText(req.body.priority, 32) as TaskPriority;
      if (!VALID_PRIORITIES.has(priority)) {
        res.status(400).json({ error: 'Ogiltig prioritet.' });
        return;
      }
      patch.priority = priority;
    }
    if (req.body?.assigneeId !== undefined) {
      const assigneeId = sanitizeText(req.body.assigneeId, 64);
      if (assigneeId) {
        patch.assigneeId = assigneeId;
      }
    }

    const updated = updateTask(id, patch);
    res.json(updated);
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const id = sanitizeText(req.params.id, 64);
    const deleted = deleteTask(id);
    if (!deleted) {
      res.status(404).json({ error: 'Uppgiften hittades inte.' });
      return;
    }
    res.json({ deleted: true, id });
  });

  // Team Updates
  app.get('/api/updates', (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : undefined;
    res.json(listUpdates(projectId || undefined));
  });

  app.post('/api/updates', (req, res) => {
    const projectId = sanitizeText(req.body?.projectId, 64);
    const authorId = sanitizeText(req.body?.authorId, 64) || 'm-linnea';
    const categoryRaw = sanitizeText(req.body?.category, 32) as UpdateCategory;
    const message = sanitizeText(req.body?.message, 600);

    if (!projectId || !getProjectById(projectId)) {
      res.status(400).json({ error: 'Giltigt projekt-ID krävs.' });
      return;
    }
    if (!message) {
      res.status(400).json({ error: 'Meddelandet kan inte vara tomt.' });
      return;
    }

    const category: UpdateCategory = VALID_CATEGORIES.has(categoryRaw) ? categoryRaw : 'note';
    const created = createUpdate({
      projectId,
      authorId,
      category,
      message,
    });
    res.status(201).json(created);
  });

  app.delete('/api/updates/:id', (req, res) => {
    const id = sanitizeText(req.params.id, 64);
    const deleted = deleteUpdate(id);
    if (!deleted) {
      res.status(404).json({ error: 'Uppdateringen hittades inte.' });
      return;
    }
    res.json({ deleted: true, id });
  });

  // Live GitHub & Vercel Integrations
  app.get('/api/integrations/github', async (req, res) => {
    const repo = typeof req.query.repo === 'string' ? req.query.repo : '';
    const status = await fetchGitHubRepoStatus(repo);
    res.json(status);
  });

  app.get('/api/integrations/vercel', async (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const status = await fetchVercelProjectStatus(projectId);
    res.json(status);
  });

  return app;
}

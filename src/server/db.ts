import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TeamMember,
  TeamUpdate,
  UpdateCategory,
} from '../shared/types.ts';

function resolveDbPath(): string {
  if (process.env.SQLITE_DB_PATH && process.env.SQLITE_DB_PATH.trim().length > 0) {
    return path.resolve(process.env.SQLITE_DB_PATH.trim());
  }
  if (process.env.VERCEL === '1') {
    return path.join('/tmp', '2gether.db');
  }
  return path.resolve(process.cwd(), 'data', '2gether.db');
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    initials TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    github_repo TEXT NOT NULL DEFAULT '',
    vercel_project_id TEXT NOT NULL DEFAULT '',
    production_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    assignee_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS updates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'note',
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

function seedIfEmpty(): void {
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number };
  if (memberCount.count === 0) {
    const insertMember = db.prepare(
      'INSERT INTO members (id, name, role, avatar_url, initials) VALUES (?, ?, ?, ?, ?)'
    );
    insertMember.run(
      'm-linnea',
      'Linnea Holm',
      'Tech Lead',
      '/src/assets/images/avatar_linnea_1795528613453.jpg',
      'LH'
    );
    insertMember.run(
      'm-oskar',
      'Oskar Lindqvist',
      'Systems & DevOps',
      '/src/assets/images/avatar_oskar_1795528613207.jpg',
      'OL'
    );
    insertMember.run(
      'm-maya',
      'Maya Bergström',
      'Produktdesigner',
      '/src/assets/images/avatar_maya_1795528612485.jpg',
      'MB'
    );
  }

  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  if (projectCount.count === 0) {
    const now = new Date();
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

    const insertProject = db.prepare(
      `INSERT INTO projects (id, name, description, github_repo, vercel_project_id, production_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertProject.run(
      'proj-2gether-core',
      '2gether Core',
      'Huvudplattformen för 2gether med responsivt samarbetsflöde, REST-API och automatisk deploy från GitHub till Vercel.',
      'vitejs/vite',
      '2gether-core',
      'https://vite.dev',
      hoursAgo(72),
      hoursAgo(2)
    );

    insertProject.run(
      'proj-2gether-design',
      '2gether UI System',
      'Responsivt komponentbibliotek och tillgängliga gränssnittsmönster byggda med Tailwind CSS v4.',
      'tailwindlabs/tailwindcss',
      '2gether-ui',
      'https://tailwindcss.com',
      hoursAgo(48),
      hoursAgo(6)
    );

    const insertTask = db.prepare(
      `INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertTask.run(
      'task-1',
      'proj-2gether-core',
      'Koppla GitHub-repo till Vercel-pipeline',
      'Verifiera att main-branchen bygger automatiskt och att preview-länkar genereras för varje pull request.',
      'done',
      'high',
      'm-oskar',
      hoursAgo(30),
      hoursAgo(4)
    );
    insertTask.run(
      'task-2',
      'proj-2gether-core',
      'Säkra server-side API-proxy för live-status',
      'Håll GITHUB_TOKEN och VERCEL_TOKEN strikt på serversidan och exponera endast normaliserad status till klienten.',
      'in_progress',
      'high',
      'm-linnea',
      hoursAgo(20),
      hoursAgo(2)
    );
    insertTask.run(
      'task-3',
      'proj-2gether-core',
      'Finjustera responsiv mobilnavigering',
      'Säkerställ smidig sidomeny-drawer på 390px-skärmar med minst 44px tryckytor och tangentbordsstöd.',
      'review',
      'medium',
      'm-maya',
      hoursAgo(14),
      hoursAgo(1)
    );
    insertTask.run(
      'task-4',
      'proj-2gether-core',
      'Lägg till miljövariabler i Vercel Dashboard',
      'Dokumentera VERCEL_TOKEN och GITHUB_TOKEN i projektets inställningar inför nästa produktionsrelease.',
      'todo',
      'medium',
      'm-oskar',
      hoursAgo(8),
      hoursAgo(8)
    );
    insertTask.run(
      'task-5',
      'proj-2gether-design',
      'Granska kontrast i mörkt och ljust tema',
      'Kontrollera WCAG AA-kontrast på alla tabellrader, knappar och statusetiketter.',
      'in_progress',
      'high',
      'm-maya',
      hoursAgo(12),
      hoursAgo(3)
    );

    const insertUpdate = db.prepare(
      `INSERT INTO updates (id, project_id, author_id, category, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    insertUpdate.run(
      'upd-1',
      'proj-2gether-core',
      'm-oskar',
      'release',
      'vercel.json och GitHub Actions CI-flödet är konfigurerade för automatisk typkontroll och bygge vid varje push till main.',
      hoursAgo(5)
    );
    insertUpdate.run(
      'upd-2',
      'proj-2gether-core',
      'm-linnea',
      'decision',
      'Alla anrop till GitHub och Vercel routas nu via Express /api/integrations/* så inga tokens behöver exponeras i webbläsaren.',
      hoursAgo(3)
    );
    insertUpdate.run(
      'upd-3',
      'proj-2gether-core',
      'm-maya',
      'note',
      'Uppdaterade översikten och uppgiftstabellen med tabulära siffror och responsiva kort för mobila enheter.',
      hoursAgo(1)
    );
    insertUpdate.run(
      'upd-4',
      'proj-2gether-design',
      'm-maya',
      'decision',
      'Enats om Plus Jakarta Sans för rubriker och JetBrains Mono för commit-hashar och deployment-ID.',
      hoursAgo(6)
    );
  }
}

seedIfEmpty();

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    githubRepo: String(row.github_repo),
    vercelProjectId: String(row.vercel_project_id),
    productionUrl: String(row.production_url),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title),
    description: String(row.description),
    status: String(row.status) as TaskStatus,
    priority: String(row.priority) as TaskPriority,
    assigneeId: String(row.assignee_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapUpdate(row: Record<string, unknown>): TeamUpdate {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    authorId: String(row.author_id),
    category: String(row.category) as UpdateCategory,
    message: String(row.message),
    createdAt: String(row.created_at),
  };
}

function mapMember(row: Record<string, unknown>): TeamMember {
  return {
    id: String(row.id),
    name: String(row.name),
    role: String(row.role),
    avatarUrl: String(row.avatar_url),
    initials: String(row.initials),
  };
}

export function listMembers(): TeamMember[] {
  const rows = db.prepare('SELECT * FROM members ORDER BY name ASC').all() as Record<string, unknown>[];
  return rows.map(mapMember);
}

export function listProjects(): Project[] {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at ASC').all() as Record<string, unknown>[];
  return rows.map(mapProject);
}

export function getProjectById(id: string): Project | null {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapProject(row) : null;
}

export function createProject(input: {
  name: string;
  description: string;
  githubRepo: string;
  vercelProjectId: string;
  productionUrl: string;
}): Project {
  const id = `proj-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO projects (id, name, description, github_repo, vercel_project_id, production_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.description,
    input.githubRepo,
    input.vercelProjectId,
    input.productionUrl,
    now,
    now
  );
  return getProjectById(id)!;
}

export function updateProject(
  id: string,
  patch: Partial<{
    name: string;
    description: string;
    githubRepo: string;
    vercelProjectId: string;
    productionUrl: string;
  }>
): Project | null {
  const existing = getProjectById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE projects
     SET name = ?, description = ?, github_repo = ?, vercel_project_id = ?, production_url = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    patch.name ?? existing.name,
    patch.description ?? existing.description,
    patch.githubRepo ?? existing.githubRepo,
    patch.vercelProjectId ?? existing.vercelProjectId,
    patch.productionUrl ?? existing.productionUrl,
    now,
    id
  );
  return getProjectById(id);
}

export function deleteProject(id: string): boolean {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listTasks(projectId?: string): Task[] {
  if (projectId) {
    const rows = db
      .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY updated_at DESC')
      .all(projectId) as Record<string, unknown>[];
    return rows.map(mapTask);
  }
  const rows = db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC').all() as Record<string, unknown>[];
  return rows.map(mapTask);
}

export function getTaskById(id: string): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapTask(row) : null;
}

export function createTask(input: {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
}): Task {
  const id = `task-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.projectId,
    input.title,
    input.description,
    input.status,
    input.priority,
    input.assigneeId,
    now,
    now
  );
  return getTaskById(id)!;
}

export function updateTask(
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
  }>
): Task | null {
  const existing = getTaskById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    patch.title ?? existing.title,
    patch.description ?? existing.description,
    patch.status ?? existing.status,
    patch.priority ?? existing.priority,
    patch.assigneeId ?? existing.assigneeId,
    now,
    id
  );
  return getTaskById(id);
}

export function deleteTask(id: string): boolean {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listUpdates(projectId?: string): TeamUpdate[] {
  if (projectId) {
    const rows = db
      .prepare('SELECT * FROM updates WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as Record<string, unknown>[];
    return rows.map(mapUpdate);
  }
  const rows = db.prepare('SELECT * FROM updates ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(mapUpdate);
}

export function createUpdate(input: {
  projectId: string;
  authorId: string;
  category: UpdateCategory;
  message: string;
}): TeamUpdate {
  const id = `upd-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO updates (id, project_id, author_id, category, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.projectId, input.authorId, input.category, input.message, now);

  const row = db.prepare('SELECT * FROM updates WHERE id = ?').get(id) as Record<string, unknown>;
  return mapUpdate(row);
}

export function deleteUpdate(id: string): boolean {
  const result = db.prepare('DELETE FROM updates WHERE id = ?').run(id);
  return result.changes > 0;
}

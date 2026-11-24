import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitBranch,
  GitCommit,
  RefreshCw,
  Settings2,
} from 'lucide-react';
import type {
  GitHubStatusResponse,
  Project,
  Task,
  TeamMember,
  TeamUpdate,
  VercelStatusResponse,
} from '../shared/types';
import {
  computeProjectMetrics,
  formatRelativeTimeSv,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  UPDATE_CATEGORY_LABEL,
  validateSafeHttpUrl,
} from '../utils/workspaceLogic';
import { MemberAvatar } from './MemberAvatar';
import type { WorkspaceView } from './Sidebar';

interface OverviewViewProps {
  project: Project;
  tasks: Task[];
  updates: TeamUpdate[];
  members: TeamMember[];
  githubStatus: GitHubStatusResponse | null;
  vercelStatus: VercelStatusResponse | null;
  syncingIntegrations: boolean;
  onSyncIntegrations: () => void;
  onNavigate: (view: WorkspaceView) => void;
  onEditProject: () => void;
  onCycleTaskStatus: (task: Task) => void;
}

export function OverviewView({
  project,
  tasks,
  updates,
  members,
  githubStatus,
  vercelStatus,
  syncingIntegrations,
  onSyncIntegrations,
  onNavigate,
  onEditProject,
  onCycleTaskStatus,
}: OverviewViewProps) {
  const metrics = computeProjectMetrics(tasks, updates);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const openTasks = tasks.filter((t) => t.status !== 'done').slice(0, 5);
  const latestUpdates = updates.slice(0, 4);
  const safeProdUrl = validateSafeHttpUrl(project.productionUrl);
  const latestCommit = githubStatus?.commits?.[0];
  const latestDeployment = vercelStatus?.deployments?.[0];

  return (
    <div className="space-y-8">
      {/* Project summary banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Projektöversikt</span>
              {project.githubRepo && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{project.githubRepo}</span>
                </>
              )}
              {project.vercelProjectId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Vercel: {project.vercelProjectId}</span>
                </>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {project.name}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {project.description || 'Ingen projektbeskrivning angiven ännu.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {project.productionUrl && safeProdUrl.valid && (
              <a
                href={safeProdUrl.normalized}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Öppna app</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onEditProject}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings2 className="h-4 w-4" />
              <span>Redigera projekt</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-column KPI strip */}
      <section aria-label="Projektmått" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Öppna uppgifter</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {metrics.todoCount + metrics.inProgressCount + metrics.reviewCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {metrics.highPriorityOpenCount} med hög prioritet
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pågående arbete</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {metrics.inProgressCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {metrics.reviewCount} väntar på granskning
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Genomförandegrad</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {metrics.completionRate}%
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {metrics.doneCount} av {metrics.totalTasks} uppgifter klara
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Teamuppdateringar</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-slate-950 dark:text-white">
            {metrics.recentUpdatesCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sparade beslut & releaser
          </p>
        </div>
      </section>

      {/* 2-column balanced grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left: Priority task queue */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                Aktiva uppgifter
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="inline-flex min-h-[36px] items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-1 dark:text-blue-400"
              >
                <span>Alla uppgifter</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {openTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-800">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                  Alla uppgifter är klara
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Skapa en ny uppgift via knappen uppe till höger när nästa sprint börjar.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {openTasks.map((task) => {
                  const assignee = memberById.get(task.assigneeId);
                  return (
                    <li
                      key={task.id}
                      className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{TASK_STATUS_LABEL[task.status]}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'high'
                                ? 'font-medium text-red-600 dark:text-red-400'
                                : undefined
                            }
                          >
                            Prioritet: {TASK_PRIORITY_LABEL[task.priority]}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{assignee?.name ?? 'Ej tilldelad'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onCycleTaskStatus(task)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                        <span>Nästa steg</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Right: Live GitHub & Vercel snapshot */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                GitHub & Vercel-status
              </h3>
              <button
                type="button"
                onClick={onSyncIntegrations}
                disabled={syncingIntegrations}
                aria-label="Synka GitHub och Vercel-status"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingIntegrations ? 'animate-spin' : ''}`} />
                <span>{syncingIntegrations ? 'Synkar...' : 'Synka'}</span>
              </button>
            </div>

            <div className="space-y-4 divide-y divide-slate-200 dark:divide-slate-800">
              {/* GitHub summary */}
              <div className="space-y-2 pb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                    <GitBranch className="h-3.5 w-3.5" />
                    GitHub
                  </span>
                  {githubStatus?.defaultBranch && (
                    <span className="font-mono">branch: {githubStatus.defaultBranch}</span>
                  )}
                </div>

                {githubStatus?.error ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">{githubStatus.error}</p>
                ) : latestCommit ? (
                  <div className="space-y-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {latestCommit.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                        <GitCommit className="h-3 w-3" />
                        {latestCommit.sha}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{latestCommit.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{githubStatus?.openPullRequests ?? 0} öppna PRs</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Klicka på Synka för att hämta senaste commits från {project.githubRepo || 'GitHub'}.
                  </p>
                )}
              </div>

              {/* Vercel summary */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Vercel Deploy</span>
                  <span className="font-mono">{project.vercelProjectId || 'Ej länkat'}</span>
                </div>

                {latestDeployment ? (
                  <div className="space-y-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {latestDeployment.state === 'READY'
                        ? 'Live i produktion'
                        : `Status: ${latestDeployment.state}`}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {latestDeployment.target} · {formatRelativeTimeSv(latestDeployment.createdAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {vercelStatus?.hasServerToken
                      ? 'Inga driftsättningar hämtade ännu.'
                      : 'vercel.json är redo. Lägg till VERCEL_TOKEN på servern för live-historik.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate('integrations')}
              className="inline-flex min-h-[36px] items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-1 dark:text-blue-400"
            >
              <span>Hantera GitHub & Vercel</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>

      {/* Recent team updates */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
            Senaste från teamloggen
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('updates')}
            className="inline-flex min-h-[36px] items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-1 dark:text-blue-400"
          >
            <span>Öppna teamlogg</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {latestUpdates.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Inga uppdateringar publicerade i detta projekt ännu.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {latestUpdates.map((upd) => {
              const author = memberById.get(upd.authorId);
              return (
                <li key={upd.id} className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
                  <MemberAvatar member={author} size="sm" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {author?.name ?? 'Teammedlem'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{UPDATE_CATEGORY_LABEL[upd.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatRelativeTimeSv(upd.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{upd.message}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

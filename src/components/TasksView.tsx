import { useState } from 'react';
import {
  ArrowRight,
  Edit3,
  LayoutGrid,
  Plus,
  Search,
  TableProperties,
  Trash2,
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, TeamMember } from '../shared/types';
import {
  filterTasks,
  formatRelativeTimeSv,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../utils/workspaceLogic';
import { MemberAvatar } from './MemberAvatar';

interface TasksViewProps {
  tasks: Task[];
  members: TeamMember[];
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onChangeStatus: (task: Task, nextStatus: TaskStatus) => void;
}

const COLUMNS: Array<{ status: TaskStatus; title: string }> = [
  { status: 'todo', title: 'Att göra' },
  { status: 'in_progress', title: 'Pågående' },
  { status: 'review', title: 'Granskning' },
  { status: 'done', title: 'Klar' },
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'review',
  review: 'done',
  done: 'todo',
};

export function TasksView({
  tasks,
  members,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onChangeStatus,
}: TasksViewProps) {
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  const memberById = new Map(members.map((m) => [m.id, m]));

  const filtered = filterTasks(tasks, {
    search,
    status: statusFilter,
    priority: priorityFilter,
    assigneeId: 'all',
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök uppgift..."
              aria-label="Sök uppgift"
              className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrera på status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">Alla statusar</option>
              <option value="todo">Att göra</option>
              <option value="in_progress">Pågående</option>
              <option value="review">Granskning</option>
              <option value="done">Klar</option>
            </select>

            <select
              aria-label="Filtrera på prioritet"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
              className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">Alla prioriteter</option>
              <option value="high">Hög prioritet</option>
              <option value="medium">Medel prioritet</option>
              <option value="low">Låg prioritet</option>
            </select>
          </div>
        </div>

        {/* Segmented view switch */}
        <div
          role="group"
          aria-label="Visningsläge för uppgifter"
          className="inline-flex self-start rounded-lg bg-slate-100 p-1 lg:self-auto dark:bg-slate-800"
        >
          <button
            type="button"
            onClick={() => setViewMode('board')}
            aria-pressed={viewMode === 'board'}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'board'
                ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kortvy</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'table'
                ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <TableProperties className="h-3.5 w-3.5" />
            <span>Tabellvy</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="font-display text-base font-semibold text-slate-900 dark:text-white">
            {tasks.length === 0
              ? 'Inga uppgifter i detta projekt ännu'
              : 'Inga uppgifter matchar filtret'}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {tasks.length === 0
              ? 'Lägg till projektets första uppgift för att börja samarbeta.'
              : 'Prova att rensa sökningen eller välj en annan status.'}
          </p>
          {tasks.length === 0 && (
            <button
              type="button"
              onClick={onCreateTask}
              className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Skapa första uppgiften</span>
            </button>
          )}
        </div>
      ) : viewMode === 'board' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.status);
            return (
              <section
                key={col.status}
                aria-label={col.title}
                className="flex flex-col rounded-xl bg-slate-100/80 p-3.5 dark:bg-slate-900/50"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                    {col.title}
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                      Tom kolumn
                    </p>
                  ) : (
                    colTasks.map((task) => {
                      const assignee = memberById.get(task.assigneeId);
                      const next = NEXT_STATUS[task.status];
                      return (
                        <article
                          key={task.id}
                          className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold leading-snug text-slate-950 dark:text-white">
                              {task.title}
                            </h4>
                          </div>

                          {task.description && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span
                              className={
                                task.priority === 'high'
                                  ? 'font-medium text-red-600 dark:text-red-400'
                                  : task.priority === 'medium'
                                  ? 'font-medium text-amber-700 dark:text-amber-400'
                                  : undefined
                              }
                            >
                              {TASK_PRIORITY_LABEL[task.priority]}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{formatRelativeTimeSv(task.updatedAt)}</span>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                            <div className="flex min-w-0 items-center gap-2">
                              <MemberAvatar member={assignee} size="sm" />
                              <span className="truncate text-xs text-slate-600 dark:text-slate-300">
                                {assignee?.name.split(' ')[0] ?? 'Team'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => onChangeStatus(task, next)}
                                aria-label={`Flytta '${task.title}' till ${TASK_STATUS_LABEL[next]}`}
                                title={`Flytta till ${TASK_STATUS_LABEL[next]}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                aria-label={`Redigera '${task.title}'`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task)}
                                aria-label={`Ta bort '${task.title}'`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-4 py-3">Uppgift</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioritet</th>
                <th className="px-4 py-3">Ansvarig</th>
                <th className="px-4 py-3 text-right">Uppdaterad</th>
                <th className="px-4 py-3 text-right">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.map((task) => {
                const assignee = memberById.get(task.assigneeId);
                return (
                  <tr
                    key={task.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">
                      {task.title}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Ändra status för '${task.title}'`}
                        value={task.status}
                        onChange={(e) => onChangeStatus(task, e.target.value as TaskStatus)}
                        className="min-h-[34px] rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="todo">Att göra</option>
                        <option value="in_progress">Pågående</option>
                        <option value="review">Granskning</option>
                        <option value="done">Klar</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          task.priority === 'high'
                            ? 'font-medium text-red-600 dark:text-red-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }
                      >
                        {TASK_PRIORITY_LABEL[task.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MemberAvatar member={assignee} size="sm" />
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {assignee?.name ?? 'Team'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {formatRelativeTimeSv(task.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          aria-label={`Redigera '${task.title}'`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task)}
                          aria-label={`Ta bort '${task.title}'`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

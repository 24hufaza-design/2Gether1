import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus, TeamMember } from '../shared/types';

interface TaskModalProps {
  open: boolean;
  editingTask: Task | null;
  members: TeamMember[];
  defaultAssigneeId: string;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
  }) => Promise<void>;
}

export function TaskModal({
  open,
  editingTask,
  members,
  defaultAssigneeId,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setAssigneeId(editingTask.assigneeId);
    } else {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setAssigneeId(defaultAssigneeId);
    }
    setError(null);
  }, [open, editingTask, defaultAssigneeId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Ange en titel för uppgiften.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        title: trimmed,
        description: description.trim(),
        status,
        priority,
        assigneeId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara uppgiften.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-slate-950/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <h2 id="task-modal-title" className="font-display text-lg font-semibold text-slate-950 dark:text-white">
            {editingTask ? 'Redigera uppgift' : 'Ny uppgift'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng dialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="task-title-input" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Titel
            </label>
            <input
              id="task-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Konfigurera Vercel Preview-miljö"
              className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="task-desc-input" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Beskrivning
            </label>
            <textarea
              id="task-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaljer, acceptanskriterier eller länkar..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="task-status-select" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                id="task-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="todo">Att göra</option>
                <option value="in_progress">Pågående</option>
                <option value="review">Granskning</option>
                <option value="done">Klar</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-priority-select" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Prioritet
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="low">Låg</option>
                <option value="medium">Medel</option>
                <option value="high">Hög</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-assignee-select" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Ansvarig
              </label>
              <select
                id="task-assignee-select"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[40px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Sparar...' : editingTask ? 'Spara ändringar' : 'Skapa uppgift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

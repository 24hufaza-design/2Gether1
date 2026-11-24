import { useEffect, useState, type FormEvent } from 'react';
import { Trash2, X } from 'lucide-react';
import type { Project } from '../shared/types';
import {
  validateRepoSlug,
  validateSafeHttpUrl,
  validateVercelProjectId,
} from '../utils/workspaceLogic';

interface ProjectModalProps {
  open: boolean;
  editingProject: Project | null;
  canDelete: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    githubRepo: string;
    vercelProjectId: string;
    productionUrl: string;
  }) => Promise<void>;
  onDelete?: (projectId: string) => Promise<void>;
}

export function ProjectModal({
  open,
  editingProject,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: ProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [vercelProjectId, setVercelProjectId] = useState('');
  const [productionUrl, setProductionUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingProject) {
      setName(editingProject.name);
      setDescription(editingProject.description);
      setGithubRepo(editingProject.githubRepo);
      setVercelProjectId(editingProject.vercelProjectId);
      setProductionUrl(editingProject.productionUrl);
    } else {
      setName('');
      setDescription('');
      setGithubRepo('');
      setVercelProjectId('');
      setProductionUrl('');
    }
    setError(null);
  }, [open, editingProject]);

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Ange ett projektnamn.');
      return;
    }

    const repoCheck = validateRepoSlug(githubRepo);
    if (!repoCheck.valid) {
      setError(repoCheck.error ?? 'Ogiltigt GitHub-repo.');
      return;
    }
    const vercelCheck = validateVercelProjectId(vercelProjectId);
    if (!vercelCheck.valid) {
      setError(vercelCheck.error ?? 'Ogiltigt Vercel-projekt-ID.');
      return;
    }
    const urlCheck = validateSafeHttpUrl(productionUrl);
    if (!urlCheck.valid) {
      setError(urlCheck.error ?? 'Ogiltig produktionsadress.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        name: trimmedName,
        description: description.trim(),
        githubRepo: repoCheck.normalized,
        vercelProjectId: vercelCheck.normalized,
        productionUrl: urlCheck.normalized,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara projektet.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingProject || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(editingProject.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort projektet.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-slate-950/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <h2 id="project-modal-title" className="font-display text-lg font-semibold text-slate-950 dark:text-white">
            {editingProject ? 'Redigera projekt' : 'Nytt projekt i 2gether'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng projektdialog"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="project-name-input" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Projektnamn
            </label>
            <input
              id="project-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="t.ex. 2gether Webb"
              className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="project-desc-input" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Beskrivning
            </label>
            <textarea
              id="project-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort syfte och mål för projektet..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="project-repo-input" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                GitHub-repo (valfritt)
              </label>
              <input
                id="project-repo-input"
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="ägare/repo"
                className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="project-vercel-input" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Vercel-projekt (valfritt)
              </label>
              <input
                id="project-vercel-input"
                type="text"
                value={vercelProjectId}
                onChange={(e) => setVercelProjectId(e.target.value)}
                placeholder="2gether-web"
                className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="project-url-input" className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Produktionsadress (valfritt)
            </label>
            <input
              id="project-url-input"
              type="url"
              value={productionUrl}
              onChange={(e) => setProductionUrl(e.target.value)}
              placeholder="https://2gether.vercel.app"
              className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-2">
            {editingProject && canDelete && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Ta bort projekt</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
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
                {saving ? 'Sparar...' : editingProject ? 'Spara projekt' : 'Skapa projekt'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

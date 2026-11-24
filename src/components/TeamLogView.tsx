import { useState, type FormEvent } from 'react';
import { Send, Trash2 } from 'lucide-react';
import type { TeamMember, TeamUpdate, UpdateCategory } from '../shared/types';
import { formatRelativeTimeSv, UPDATE_CATEGORY_LABEL } from '../utils/workspaceLogic';
import { MemberAvatar } from './MemberAvatar';

interface TeamLogViewProps {
  updates: TeamUpdate[];
  members: TeamMember[];
  activeMemberId: string;
  onCreateUpdate: (input: {
    authorId: string;
    category: UpdateCategory;
    message: string;
  }) => Promise<void>;
  onDeleteUpdate: (id: string) => void;
}

const CATEGORIES: UpdateCategory[] = ['note', 'decision', 'release', 'blocker'];

export function TeamLogView({
  updates,
  members,
  activeMemberId,
  onCreateUpdate,
  onDeleteUpdate,
}: TeamLogViewProps) {
  const [category, setCategory] = useState<UpdateCategory>('note');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<UpdateCategory | 'all'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberById = new Map(members.map((m) => [m.id, m]));

  const filtered = filter === 'all' ? updates : updates.filter((u) => u.category === filter);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Skriv en kort uppdatering innan du publicerar.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onCreateUpdate({
        authorId: activeMemberId,
        category,
        message: trimmed,
      });
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara uppdateringen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-slate-950 dark:text-white">
            Publicera uppdatering i teamloggen
          </h2>

          <div role="group" aria-label="Kategori för uppdatering" className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={category === cat}
                className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  category === cat
                    ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {UPDATE_CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
        </div>

        <label htmlFor="teamlog-message" className="sr-only">
          Meddelande till teamloggen
        </label>
        <textarea
          id="teamlog-message"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Dela en release-notering, ett arkitekturbeslut eller en blockerare med teamet..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
        />

        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Publicerar...' : 'Publicera'}</span>
          </button>
        </div>
      </form>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrera teamlogg" className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              filter === 'all'
                ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Alla ({updates.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              aria-pressed={filter === cat}
              className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === cat
                  ? 'bg-white text-slate-950 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {UPDATE_CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Inga inlägg att visa i denna kategori
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Använd formuläret ovan för att dokumentera nästa steg eller beslut.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((upd) => {
              const author = memberById.get(upd.authorId);
              return (
                <li key={upd.id} className="flex items-start justify-between gap-4 p-5">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <MemberAvatar member={author} size="md" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {author?.name ?? 'Teammedlem'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{author?.role ?? 'Medarbetare'}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            upd.category === 'blocker'
                              ? 'font-medium text-red-600 dark:text-red-400'
                              : upd.category === 'release'
                              ? 'font-medium text-emerald-700 dark:text-emerald-400'
                              : 'font-medium text-slate-700 dark:text-slate-300'
                          }
                        >
                          {UPDATE_CATEGORY_LABEL[upd.category]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatRelativeTimeSv(upd.createdAt)}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {upd.message}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteUpdate(upd.id)}
                    aria-label={`Ta bort uppdatering av ${author?.name ?? 'teammedlem'}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

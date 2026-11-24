import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Globe,
  RefreshCw,
  Save,
  Star,
} from 'lucide-react';
import type {
  GitHubStatusResponse,
  Project,
  VercelStatusResponse,
} from '../shared/types';
import {
  formatRelativeTimeSv,
  validateRepoSlug,
  validateSafeHttpUrl,
  validateVercelProjectId,
} from '../utils/workspaceLogic';

interface IntegrationsViewProps {
  project: Project;
  githubStatus: GitHubStatusResponse | null;
  vercelStatus: VercelStatusResponse | null;
  syncing: boolean;
  onSync: () => void;
  onSaveProjectLinks: (patch: {
    githubRepo: string;
    vercelProjectId: string;
    productionUrl: string;
  }) => Promise<void>;
}

export function IntegrationsView({
  project,
  githubStatus,
  vercelStatus,
  syncing,
  onSync,
  onSaveProjectLinks,
}: IntegrationsViewProps) {
  const [githubRepo, setGithubRepo] = useState(project.githubRepo);
  const [vercelProjectId, setVercelProjectId] = useState(project.vercelProjectId);
  const [productionUrl, setProductionUrl] = useState(project.productionUrl);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGithubRepo(project.githubRepo);
    setVercelProjectId(project.vercelProjectId);
    setProductionUrl(project.productionUrl);
    setFormError(null);
  }, [project.id, project.githubRepo, project.vercelProjectId, project.productionUrl]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const repoCheck = validateRepoSlug(githubRepo);
    if (!repoCheck.valid) {
      setFormError(repoCheck.error ?? 'Ogiltigt GitHub-repo.');
      return;
    }
    const vercelCheck = validateVercelProjectId(vercelProjectId);
    if (!vercelCheck.valid) {
      setFormError(vercelCheck.error ?? 'Ogiltigt Vercel-projekt-ID.');
      return;
    }
    const urlCheck = validateSafeHttpUrl(productionUrl);
    if (!urlCheck.valid) {
      setFormError(urlCheck.error ?? 'Ogiltig produktionsadress.');
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      await onSaveProjectLinks({
        githubRepo: repoCheck.normalized,
        vercelProjectId: vercelCheck.normalized,
        productionUrl: urlCheck.normalized,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kunde inte spara kopplingar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection configuration form */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
              Koppla GitHub & Vercel för {project.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Alla API-anrop körs säkert via servern. Ändringar sparas direkt i databasen och synkar live-status.
            </p>
          </div>
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="inline-flex min-h-[40px] items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0 sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synkar status...' : 'Synka status'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="integration-github-repo"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              GitHub-repository (ägare/repo)
            </label>
            <input
              id="integration-github-repo"
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="t.ex. vitejs/vite"
              className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="integration-vercel-id"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Vercel-projekt (slug eller ID)
            </label>
            <input
              id="integration-vercel-id"
              type="text"
              value={vercelProjectId}
              onChange={(e) => setVercelProjectId(e.target.value)}
              placeholder="t.ex. 2gether-core"
              className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="integration-prod-url"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Produktionsadress (https://)
            </label>
            <input
              id="integration-prod-url"
              type="url"
              value={productionUrl}
              onChange={(e) => setProductionUrl(e.target.value)}
              placeholder="https://2gether.vercel.app"
              className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {formError && (
            <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Sparar...' : 'Spara & synka'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Two-column live API telemetry */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-stretch">
        {/* Live GitHub Panel */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                  GitHub Live-status
                </h3>
                <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {githubStatus?.fullName || project.githubRepo || 'Ej konfigurerad'}
                </p>
              </div>
              {githubStatus?.htmlUrl && validateSafeHttpUrl(githubStatus.htmlUrl).valid && (
                <a
                  href={githubStatus.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span>Öppna på GitHub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {syncing && !githubStatus ? (
              <div className="space-y-3 py-4">
                <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : githubStatus?.error ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{githubStatus.error}</p>
              </div>
            ) : githubStatus?.configured ? (
              <>
                <div className="grid grid-cols-3 gap-3 border-y border-slate-200 py-4 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Huvudgren</p>
                    <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                      {githubStatus.defaultBranch}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Öppna PRs</p>
                    <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      <GitPullRequest className="h-3.5 w-3.5 text-slate-400" />
                      {githubStatus.openPullRequests ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Stjärnor</p>
                    <p className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      <Star className="h-3.5 w-3.5 text-slate-400" />
                      {githubStatus.stars?.toLocaleString('sv-SE') ?? 0}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                    Senaste commits
                  </h4>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(githubStatus.commits ?? []).map((commit) => (
                      <li key={commit.sha} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {commit.message}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {commit.authorName} · {formatRelativeTimeSv(commit.date)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 shrink-0 dark:text-slate-300">
                          <GitCommit className="h-3.5 w-3.5 text-slate-400" />
                          {commit.sha}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ange ett GitHub-repository ovan och spara för att läsa live-commits.
              </p>
            )}
          </div>

          <p className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {githubStatus?.hasServerToken
              ? 'Autentiserad via GITHUB_TOKEN på servern.'
              : 'Publikt GitHub-läge aktivt. Lägg till GITHUB_TOKEN i Secrets för privata repos.'}
          </p>
        </section>

        {/* Live Vercel Panel */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-950 dark:text-white">
                  Vercel Driftsättningar
                </h3>
                <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {vercelStatus?.projectName || project.vercelProjectId || 'Ej konfigurerad'}
                </p>
              </div>
              {project.productionUrl && validateSafeHttpUrl(project.productionUrl).valid && (
                <a
                  href={validateSafeHttpUrl(project.productionUrl).normalized}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Produktion</span>
                </a>
              )}
            </div>

            {vercelStatus?.error ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{vercelStatus.error}</p>
              </div>
            ) : vercelStatus?.hasServerToken && vercelStatus.deployments.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {vercelStatus.deployments.map((dep) => (
                  <li key={dep.uid} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {dep.state === 'READY' ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : dep.state === 'ERROR' ? (
                          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock3 className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        )}
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {dep.commitMessage || dep.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {dep.state} · {dep.target}
                        {dep.commitBranch ? ` · ${dep.commitBranch}` : ''} ·{' '}
                        <span className="tabular-nums">{formatRelativeTimeSv(dep.createdAt)}</span>
                      </p>
                    </div>
                    {dep.url && validateSafeHttpUrl(dep.url).valid && (
                      <a
                        href={validateSafeHttpUrl(dep.url).normalized}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-blue-600 hover:underline whitespace-nowrap shrink-0 dark:text-blue-400"
                      >
                        <span>Öppna</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Vercel-deploy är förberedd i kodbasen
                </p>
                <ol className="list-inside list-decimal space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  <li>Pusha detta repository till GitHub (<span className="font-mono">.github/workflows/ci.yml</span> kör typkontroll, test och bygge).</li>
                  <li>Importera repot i Vercel — <span className="font-mono">vercel.json</span> routar både React-klienten och <span className="font-mono">/api/*</span> automatiskt.</li>
                  <li>Lägg till <span className="font-mono">VERCEL_TOKEN</span> i serverns miljövariabler för att se live-deployments direkt här.</li>
                </ol>
              </div>
            )}
          </div>

          <p className="mt-5 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {vercelStatus?.hasServerToken
              ? 'Ansluten till Vercel REST API via VERCEL_TOKEN.'
              : 'Väntar på VERCEL_TOKEN i serverns miljövariabler.'}
          </p>
        </section>
      </div>
    </div>
  );
}

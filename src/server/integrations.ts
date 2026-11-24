import type {
  GitHubCommitItem,
  GitHubStatusResponse,
  VercelDeploymentItem,
  VercelStatusResponse,
} from '../shared/types.ts';

const REPO_SLUG_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const VERCEL_PROJECT_REGEX = /^[A-Za-z0-9_.-]+$/;
const REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchGitHubRepoStatus(rawRepo: string): Promise<GitHubStatusResponse> {
  const fetchedAt = new Date().toISOString();
  const hasServerToken = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim());
  const cleaned = rawRepo
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

  if (!cleaned) {
    return {
      configured: false,
      repo: '',
      hasServerToken,
      fetchedAt,
      error: 'Inget GitHub-repository är länkat till projektet ännu.',
    };
  }

  if (!REPO_SLUG_REGEX.test(cleaned) || cleaned.includes('..')) {
    return {
      configured: false,
      repo: cleaned,
      hasServerToken,
      fetchedAt,
      error: 'Ogiltigt GitHub-repoformat. Använd ägare/repo.',
    };
  }

  const [owner, repo] = cleaned.split('/');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': '2gether-workspace-platform',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (hasServerToken) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN!.trim()}`;
  }

  try {
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const commitsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=5`;
    const pullsUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=open&per_page=30`;

    const [repoRes, commitsRes, pullsRes] = await Promise.all([
      fetchWithTimeout(repoUrl, headers),
      fetchWithTimeout(commitsUrl, headers),
      fetchWithTimeout(pullsUrl, headers),
    ]);

    if (repoRes.status === 403 || repoRes.status === 429) {
      return {
        configured: true,
        repo: cleaned,
        hasServerToken,
        rateLimited: true,
        fetchedAt,
        error: 'GitHub API-gränsen är nådd tillfälligt. Lägg till GITHUB_TOKEN i serverns miljövariabler för högre kvot.',
      };
    }

    if (repoRes.status === 404) {
      return {
        configured: true,
        repo: cleaned,
        hasServerToken,
        fetchedAt,
        error: `Kunde inte hitta repositoryt "${cleaned}". Kontrollera stavningen eller lägg till GITHUB_TOKEN om det är privat.`,
      };
    }

    if (!repoRes.ok) {
      return {
        configured: true,
        repo: cleaned,
        hasServerToken,
        fetchedAt,
        error: `GitHub svarade med status ${repoRes.status}.`,
      };
    }

    const repoData = (await repoRes.json()) as Record<string, unknown>;
    const commitsRaw = commitsRes.ok ? ((await commitsRes.json()) as Record<string, unknown>[]) : [];
    const pullsRaw = pullsRes.ok ? ((await pullsRes.json()) as Record<string, unknown>[]) : [];

    const commits: GitHubCommitItem[] = commitsRaw.slice(0, 5).map((item) => {
      const commitObj = (item.commit ?? {}) as Record<string, unknown>;
      const authorObj = (commitObj.author ?? {}) as Record<string, unknown>;
      const fullMessage = String(commitObj.message ?? '');
      const firstLine = fullMessage.split('\n')[0] || 'Uppdatering';
      return {
        sha: String(item.sha ?? '').slice(0, 7),
        message: firstLine,
        authorName: String(authorObj.name ?? 'Okänd'),
        date: String(authorObj.date ?? fetchedAt),
        url: String(item.html_url ?? ''),
      };
    });

    return {
      configured: true,
      repo: cleaned,
      fullName: String(repoData.full_name ?? cleaned),
      description: String(repoData.description ?? ''),
      defaultBranch: String(repoData.default_branch ?? 'main'),
      stars: Number(repoData.stargazers_count ?? 0),
      forks: Number(repoData.forks_count ?? 0),
      openIssues: Number(repoData.open_issues_count ?? 0),
      openPullRequests: Array.isArray(pullsRaw) ? pullsRaw.length : 0,
      isPrivate: Boolean(repoData.private),
      pushedAt: String(repoData.pushed_at ?? ''),
      htmlUrl: String(repoData.html_url ?? `https://github.com/${cleaned}`),
      commits,
      hasServerToken,
      fetchedAt,
    };
  } catch (err) {
    return {
      configured: true,
      repo: cleaned,
      hasServerToken,
      fetchedAt,
      error:
        err instanceof Error && err.name === 'AbortError'
          ? 'Tidsgränsen för GitHub API överskreds. Försök igen.'
          : 'Kunde inte nå GitHub API just nu.',
    };
  }
}

export async function fetchVercelProjectStatus(rawProjectId: string): Promise<VercelStatusResponse> {
  const fetchedAt = new Date().toISOString();
  const projectId = rawProjectId.trim();
  const token = process.env.VERCEL_TOKEN?.trim() ?? '';
  const teamId = process.env.VERCEL_TEAM_ID?.trim() ?? '';
  const hasServerToken = Boolean(token);

  if (!projectId) {
    return {
      configured: false,
      hasServerToken,
      projectId: '',
      deployments: [],
      fetchedAt,
      error: 'Inget Vercel-projekt-ID eller slug är angivet för projektet.',
    };
  }

  if (!VERCEL_PROJECT_REGEX.test(projectId) || projectId.includes('..')) {
    return {
      configured: false,
      hasServerToken,
      projectId,
      deployments: [],
      fetchedAt,
      error: 'Ogiltigt Vercel-projekt-ID.',
    };
  }

  if (!hasServerToken) {
    return {
      configured: false,
      hasServerToken: false,
      projectId,
      deployments: [],
      fetchedAt,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  try {
    const teamQuery = teamId ? `&teamId=${encodeURIComponent(teamId)}` : '';
    const deploymentsUrl = `https://api.vercel.com/v6/deployments?app=${encodeURIComponent(projectId)}&limit=6${teamQuery}`;
    const projectUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''}`;

    const [deploymentsRes, projectRes] = await Promise.all([
      fetchWithTimeout(deploymentsUrl, headers),
      fetchWithTimeout(projectUrl, headers),
    ]);

    if (!deploymentsRes.ok) {
      return {
        configured: true,
        hasServerToken: true,
        projectId,
        deployments: [],
        fetchedAt,
        error:
          deploymentsRes.status === 401 || deploymentsRes.status === 403
            ? 'VERCEL_TOKEN saknar behörighet eller är ogiltig.'
            : `Vercel API svarade med status ${deploymentsRes.status}.`,
      };
    }

    const deploymentsJson = (await deploymentsRes.json()) as {
      deployments?: Array<Record<string, unknown>>;
    };
    const projectJson = projectRes.ok
      ? ((await projectRes.json()) as Record<string, unknown>)
      : null;

    const deployments: VercelDeploymentItem[] = (deploymentsJson.deployments ?? []).map((dep) => {
      const meta = (dep.meta ?? {}) as Record<string, unknown>;
      const rawUrl = String(dep.url ?? '');
      const normalizedUrl = rawUrl.startsWith('http') ? rawUrl : rawUrl ? `https://${rawUrl}` : '';
      const createdMs = Number(dep.created ?? dep.createdAt ?? Date.now());
      return {
        uid: String(dep.uid ?? ''),
        name: String(dep.name ?? projectId),
        url: normalizedUrl,
        state: String(dep.state ?? dep.readyState ?? 'UNKNOWN'),
        target: String(dep.target ?? 'preview'),
        createdAt: new Date(createdMs).toISOString(),
        commitMessage: meta.githubCommitMessage ? String(meta.githubCommitMessage).split('\n')[0] : undefined,
        commitBranch: meta.githubCommitRef ? String(meta.githubCommitRef) : undefined,
      };
    });

    return {
      configured: true,
      hasServerToken: true,
      projectId,
      projectName: projectJson?.name ? String(projectJson.name) : projectId,
      framework: projectJson?.framework ? String(projectJson.framework) : undefined,
      deployments,
      fetchedAt,
    };
  } catch (err) {
    return {
      configured: true,
      hasServerToken: true,
      projectId,
      deployments: [],
      fetchedAt,
      error:
        err instanceof Error && err.name === 'AbortError'
          ? 'Tidsgränsen för Vercel API överskreds.'
          : 'Kunde inte nå Vercel API just nu.',
    };
  }
}

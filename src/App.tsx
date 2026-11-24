import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { IntegrationsView } from './components/IntegrationsView';
import { OverviewView } from './components/OverviewView';
import { ProjectModal } from './components/ProjectModal';
import { Sidebar, type WorkspaceView } from './components/Sidebar';
import { TaskModal } from './components/TaskModal';
import { TasksView } from './components/TasksView';
import { TeamLogView } from './components/TeamLogView';
import { TopBar } from './components/TopBar';
import { api } from './services/api';
import type {
  GitHubStatusResponse,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TeamMember,
  TeamUpdate,
  UpdateCategory,
  VercelStatusResponse,
} from './shared/types';

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'review',
  review: 'done',
  done: 'todo',
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('2gether-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeMemberId, setActiveMemberId] = useState<string>('m-linnea');
  const [activeView, setActiveView] = useState<WorkspaceView>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<TeamUpdate[]>([]);
  const [githubStatus, setGithubStatus] = useState<GitHubStatusResponse | null>(null);
  const [vercelStatus, setVercelStatus] = useState<VercelStatusResponse | null>(null);

  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [syncingIntegrations, setSyncingIntegrations] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('2gether-theme', theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const loadProjectData = useCallback(async (project: Project) => {
    const [taskList, updateList] = await Promise.all([
      api.listTasks(project.id),
      api.listUpdates(project.id),
    ]);
    setTasks(taskList);
    setUpdates(updateList);
  }, []);

  const syncIntegrations = useCallback(async (project: Project) => {
    setSyncingIntegrations(true);
    try {
      const [gh, vc] = await Promise.all([
        project.githubRepo ? api.fetchGitHubStatus(project.githubRepo) : Promise.resolve(null),
        project.vercelProjectId ? api.fetchVercelStatus(project.vercelProjectId) : Promise.resolve(null),
      ]);
      setGithubStatus(gh);
      setVercelStatus(vc);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Kunde inte synka live-status.');
    } finally {
      setSyncingIntegrations(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoadingWorkspace(true);
      try {
        const [memberList, projectList] = await Promise.all([
          api.listMembers(),
          api.listProjects(),
        ]);
        if (!active) return;
        setMembers(memberList);
        if (memberList.length > 0) {
          setActiveMemberId(memberList[0].id);
        }
        setProjects(projectList);
        if (projectList.length > 0) {
          const initial = projectList[0];
          setActiveProjectId(initial.id);
          await loadProjectData(initial);
          void syncIntegrations(initial);
        }
      } catch (err) {
        if (!active) return;
        setErrorBanner(
          err instanceof Error ? err.message : 'Kunde inte ladda arbetsytan från servern.'
        );
      } finally {
        if (active) setLoadingWorkspace(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [loadProjectData, syncIntegrations]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  async function handleSelectProject(projectId: string) {
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    setActiveProjectId(target.id);
    setErrorBanner(null);
    setGithubStatus(null);
    setVercelStatus(null);
    try {
      await loadProjectData(target);
      void syncIntegrations(target);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Kunde inte byta projekt.');
    }
  }

  async function handleSaveTask(payload: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
  }) {
    if (!activeProject) return;
    if (editingTask) {
      const updated = await api.updateTask(editingTask.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showToast('Uppgiften uppdaterades.');
    } else {
      const created = await api.createTask({
        projectId: activeProject.id,
        ...payload,
      });
      setTasks((prev) => [created, ...prev]);
      showToast('Ny uppgift skapad.');
    }
  }

  async function handleChangeTaskStatus(task: Task, nextStatus: TaskStatus) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    try {
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setTasks(previous);
      setErrorBanner(err instanceof Error ? err.message : 'Kunde inte uppdatera status.');
    }
  }

  async function handleDeleteTask(task: Task) {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await api.deleteTask(task.id);
      showToast(`"${task.title}" togs bort.`);
    } catch (err) {
      setTasks(previous);
      setErrorBanner(err instanceof Error ? err.message : 'Kunde inte ta bort uppgiften.');
    }
  }

  async function handleSaveProject(payload: {
    name: string;
    description: string;
    githubRepo: string;
    vercelProjectId: string;
    productionUrl: string;
  }) {
    if (editingProject) {
      const updated = await api.updateProject(editingProject.id, payload);
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (activeProject?.id === updated.id) {
        void syncIntegrations(updated);
      }
      showToast('Projektet uppdaterades.');
    } else {
      const created = await api.createProject(payload);
      setProjects((prev) => [...prev, created]);
      setActiveProjectId(created.id);
      setTasks([]);
      setUpdates([]);
      setGithubStatus(null);
      setVercelStatus(null);
      void syncIntegrations(created);
      showToast(`Projektet "${created.name}" skapades.`);
    }
  }

  async function handleDeleteProject(projectId: string) {
    await api.deleteProject(projectId);
    const remaining = projects.filter((p) => p.id !== projectId);
    setProjects(remaining);
    if (remaining[0]) {
      setActiveProjectId(remaining[0].id);
      await loadProjectData(remaining[0]);
      void syncIntegrations(remaining[0]);
    }
    showToast('Projektet togs bort.');
  }

  async function handleSaveIntegrationLinks(patch: {
    githubRepo: string;
    vercelProjectId: string;
    productionUrl: string;
  }) {
    if (!activeProject) return;
    const updated = await api.updateProject(activeProject.id, patch);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    await syncIntegrations(updated);
    showToast('GitHub- och Vercel-kopplingar sparade.');
  }

  async function handleCreateUpdate(input: {
    authorId: string;
    category: UpdateCategory;
    message: string;
  }) {
    if (!activeProject) return;
    const created = await api.createUpdate({
      projectId: activeProject.id,
      ...input,
    });
    setUpdates((prev) => [created, ...prev]);
    showToast('Uppdatering publicerad.');
  }

  async function handleDeleteUpdate(updateId: string) {
    const previous = updates;
    setUpdates((prev) => prev.filter((u) => u.id !== updateId));
    try {
      await api.deleteUpdate(updateId);
      showToast('Uppdateringen togs bort.');
    } catch (err) {
      setUpdates(previous);
      setErrorBanner(err instanceof Error ? err.message : 'Kunde inte ta bort uppdateringen.');
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        projects={projects}
        activeProjectId={activeProject?.id ?? ''}
        onSelectProject={handleSelectProject}
        onOpenNewProject={() => {
          setEditingProject(null);
          setProjectModalOpen(true);
        }}
        activeView={activeView}
        onSelectView={setActiveView}
        members={members}
        activeMemberId={activeMemberId}
        onSelectMember={setActiveMemberId}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          projectName={activeProject?.name ?? '2gether'}
          activeView={activeView}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNewTask={() => {
            setEditingTask(null);
            setTaskModalOpen(true);
          }}
        />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {errorBanner && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                aria-label="Stäng felmeddelande"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-100 dark:hover:bg-red-900/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loadingWorkspace || !activeProject ? (
            <div className="space-y-6" aria-busy="true" aria-label="Laddar arbetsyta">
              <div className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                ))}
              </div>
            </div>
          ) : activeView === 'overview' ? (
            <OverviewView
              project={activeProject}
              tasks={tasks}
              updates={updates}
              members={members}
              githubStatus={githubStatus}
              vercelStatus={vercelStatus}
              syncingIntegrations={syncingIntegrations}
              onSyncIntegrations={() => void syncIntegrations(activeProject)}
              onNavigate={setActiveView}
              onEditProject={() => {
                setEditingProject(activeProject);
                setProjectModalOpen(true);
              }}
              onCycleTaskStatus={(task) => void handleChangeTaskStatus(task, NEXT_STATUS[task.status])}
            />
          ) : activeView === 'tasks' ? (
            <TasksView
              tasks={tasks}
              members={members}
              onCreateTask={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              onEditTask={(task) => {
                setEditingTask(task);
                setTaskModalOpen(true);
              }}
              onDeleteTask={(task) => void handleDeleteTask(task)}
              onChangeStatus={(task, next) => void handleChangeTaskStatus(task, next)}
            />
          ) : activeView === 'integrations' ? (
            <IntegrationsView
              project={activeProject}
              githubStatus={githubStatus}
              vercelStatus={vercelStatus}
              syncing={syncingIntegrations}
              onSync={() => void syncIntegrations(activeProject)}
              onSaveProjectLinks={handleSaveIntegrationLinks}
            />
          ) : (
            <TeamLogView
              updates={updates}
              members={members}
              activeMemberId={activeMemberId}
              onCreateUpdate={handleCreateUpdate}
              onDeleteUpdate={(id) => void handleDeleteUpdate(id)}
            />
          )}
        </main>
      </div>

      <TaskModal
        open={taskModalOpen}
        editingTask={editingTask}
        members={members}
        defaultAssigneeId={activeMemberId}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />

      <ProjectModal
        open={projectModalOpen}
        editingProject={editingProject}
        canDelete={projects.length > 1}
        onClose={() => {
          setProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

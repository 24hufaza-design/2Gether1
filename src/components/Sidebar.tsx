import { useEffect } from 'react';
import {
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  MessageSquareText,
  Moon,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import type { Project, TeamMember } from '../shared/types';
import { MemberAvatar } from './MemberAvatar';

export type WorkspaceView = 'overview' | 'tasks' | 'integrations' | 'updates';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  members: TeamMember[];
  activeMemberId: string;
  onSelectMember: (memberId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceView; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Översikt', icon: LayoutDashboard },
  { id: 'tasks', label: 'Uppgifter', icon: ListTodo },
  { id: 'integrations', label: 'GitHub & Vercel', icon: GitBranch },
  { id: 'updates', label: 'Teamlogg', icon: MessageSquareText },
];

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenNewProject,
  activeView,
  onSelectView,
  members,
  activeMemberId,
  onSelectMember,
  theme,
  onToggleTheme,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const activeMember = members.find((m) => m.id === activeMemberId) ?? members[0];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-5 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => {
              onSelectView('overview');
              onCloseMobile();
            }}
            className="font-display text-xl font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md dark:text-white"
          >
            2gether
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Stäng sidomeny"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Huvudnavigering" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
              Projekt
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenNewProject();
                onCloseMobile();
              }}
              aria-label="Skapa nytt projekt"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-400 dark:hover:bg-blue-950/50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nytt</span>
            </button>
          </div>

          <div className="space-y-1">
            {projects.map((project) => {
              const selected = project.id === activeProjectId;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    onSelectProject(project.id);
                    onCloseMobile();
                  }}
                  aria-current={selected ? 'true' : undefined}
                  className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    selected
                      ? 'bg-slate-100 font-semibold text-slate-950 dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                  }`}
                >
                  <FolderKanban className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="truncate">{project.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div>
          <label
            htmlFor="active-member-select"
            className="mb-1.5 block px-1 text-xs font-medium text-slate-500 dark:text-slate-400"
          >
            Aktiv profil
          </label>
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-950">
            <MemberAvatar member={activeMember} size="sm" />
            <select
              id="active-member-select"
              value={activeMemberId}
              onChange={(e) => onSelectMember(e.target.value)}
              className="min-h-[32px] w-full bg-transparent text-xs font-medium text-slate-900 focus:outline-none dark:text-slate-100"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Byt till ljust tema' : 'Byt till mörkt tema'}
          className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span>{theme === 'dark' ? 'Mörkt tema aktivt' : 'Ljust tema aktivt'}</span>
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-500" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto dark:border-slate-800">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigeringsmeny">
          <div
            className="fixed inset-0 bg-slate-950/50 transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[280px] max-w-[85vw] border-r border-slate-200 shadow-xl dark:border-slate-800">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

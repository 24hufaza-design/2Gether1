import { Menu, Plus } from 'lucide-react';
import type { WorkspaceView } from './Sidebar';

interface TopBarProps {
  projectName: string;
  activeView: WorkspaceView;
  onOpenMobileMenu: () => void;
  onOpenNewTask: () => void;
}

const VIEW_TITLES: Record<WorkspaceView, string> = {
  overview: 'Översikt',
  tasks: 'Uppgifter',
  integrations: 'GitHub & Vercel',
  updates: 'Teamlogg',
};

export function TopBar({
  projectName,
  activeView,
  onOpenMobileMenu,
  onOpenNewTask,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Öppna meny"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden font-medium text-slate-500 sm:inline whitespace-nowrap shrink-0 dark:text-slate-400">
            {projectName}
          </span>
          <span className="hidden text-slate-300 sm:inline dark:text-slate-700" aria-hidden="true">
            /
          </span>
          <h1 className="font-display truncate text-base font-semibold text-slate-950 sm:text-lg dark:text-white">
            {VIEW_TITLES[activeView]}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onOpenNewTask}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Ny uppgift</span>
        </button>
      </div>
    </header>
  );
}

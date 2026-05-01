import { useState } from 'react';
import type { ElementType } from 'react';
import { LayoutDashboard, Database, BrainCircuit } from 'lucide-react';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetPage }   from './pages/DatasetPage';
import { ModelPage }     from './pages/ModelPage';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'datasets' | 'models';

const TABS: { id: Tab; label: string; icon: ElementType }[] = [
  { id: 'dashboard', label: 'Огляд',     icon: LayoutDashboard },
  { id: 'datasets',  label: 'Датасети',  icon: Database },
  { id: 'models',    label: 'Моделі',    icon: BrainCircuit },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ── */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex items-center gap-3 px-6 h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5 mr-4">
            <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center shrink-0">
              <BrainCircuit className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground">InferKit</span>
              <span className="text-xs text-muted-foreground ml-1.5">ML Аналітика</span>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-end gap-1 self-stretch">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-full text-sm font-medium border-b-2 transition-colors',
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>

          {/* Status */}
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-muted-foreground">Система онлайн</span>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'datasets'  && <DatasetPage />}
        {tab === 'models'    && <ModelPage />}
      </main>

    </div>
  );
}

import React from 'react';
import { RefreshCw, Activity } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  lastUpdated,
}) => {
  const tabs = [
    { id: 'fixtures', label: 'Próximos' },
    { id: 'results', label: 'Backtest' },
    { id: 'screener', label: 'Screener Global' },
    { id: 'optimizer', label: 'Optimizar' },
    { id: 'standings', label: 'Tabla & Stats' },
    { id: 'export', label: 'GitHub' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <a href="#" className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
              FishyFootball <span className="text-emerald-400 font-normal">Predictor</span>
            </a>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-5">
            {tabs.map((tab) => {
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`text-xs xl:text-sm font-medium transition-colors whitespace-nowrap py-1 ${
                    active
                      ? 'text-white border-b-2 border-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            {lastUpdated && (
              <span className="hidden xl:inline-block text-xs text-slate-400 tabular-nums font-mono">
                Actualizado: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              title="Actualizar datos en tiempo real desde TheFishy"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Consultando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Scrollbar */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-800/60 gap-4 no-scrollbar">
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`text-xs whitespace-nowrap px-2.5 py-1 rounded-md transition-colors ${
                  active ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

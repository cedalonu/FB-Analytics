import React, { useState, useMemo } from 'react';
import { LeagueOption } from '../types/football';
import { Search, ChevronDown, Trophy, Globe } from 'lucide-react';

interface LeagueSelectorProps {
  leagues: LeagueOption[];
  selectedLeagueId: string;
  onSelectLeague: (leagueId: string) => void;
  onSelectTab?: (tab: string) => void;
  currentTab: string;
  isLoading: boolean;
}

const POPULAR_LEAGUES = [
  { id: '1', name: 'Premier League', short: 'EPL' },
  { id: '31', name: 'La Liga', short: 'ESP' },
  { id: '33', name: 'Serie A', short: 'ITA' },
  { id: '32', name: 'Bundesliga', short: 'GER' },
  { id: '34', name: 'Ligue 1', short: 'FRA' },
  { id: '2', name: 'Championship', short: 'EFL' },
  { id: '17', name: 'Champions L.', short: 'UCL' },
];

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({
  leagues,
  selectedLeagueId,
  onSelectLeague,
  onSelectTab,
  currentTab,
  isLoading,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const currentLeague = useMemo(() => {
    return leagues.find((l) => l.id === selectedLeagueId) || {
      id: selectedLeagueId,
      name: 'Premier League',
      group: 'England',
    };
  }, [leagues, selectedLeagueId]);

  const filteredLeagues = useMemo(() => {
    if (!search.trim()) return leagues;
    const term = search.toLowerCase();
    return leagues.filter(
      (l) => l.name.toLowerCase().includes(term) || l.group.toLowerCase().includes(term)
    );
  }, [leagues, search]);

  const isScreenerActive = currentTab === 'screener';

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Quick Popular Leagues Badges + "Todas" button (Single row horizontal scroll, no wrapping) */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap no-scrollbar py-1 min-w-0 mr-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1 shrink-0 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Ligas:
            </span>

            {/* "Todas (Global)" button */}
            <button
              onClick={() => onSelectTab?.('screener')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 shadow-sm ${
                isScreenerActive
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
              title="Ver todas las ligas en el Screener Global"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Todas (Global)</span>
            </button>

            {POPULAR_LEAGUES.map((pop) => {
              const active = !isScreenerActive && pop.id === selectedLeagueId;
              return (
                <button
                  key={pop.id}
                  onClick={() => {
                    onSelectLeague(pop.id);
                    onSelectTab?.('fixtures');
                  }}
                  disabled={isLoading}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  {pop.name}
                </button>
              );
            })}
          </div>

          {/* League Dropdown Selector with search */}
          <div className="relative w-64 md:w-72 shrink-0">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
            >
              <div className="truncate text-left">
                <span className="text-slate-400 mr-1.5">{currentLeague.group} /</span>
                <span className="font-semibold text-white">{currentLeague.name}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-80 max-h-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-slate-800">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar entre 200+ ligas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 text-slate-100 placeholder-slate-500 border border-slate-800 rounded focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto p-1 max-h-72 divide-y divide-slate-800/40">
                    {filteredLeagues.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No se encontraron ligas con ese nombre.
                      </div>
                    ) : (
                      filteredLeagues.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => {
                            onSelectLeague(l.id);
                            onSelectTab?.('fixtures');
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 rounded transition-colors ${
                            !isScreenerActive && l.id === selectedLeagueId
                              ? 'bg-emerald-950/40 text-emerald-300 font-semibold'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="truncate">{l.name}</span>
                          <span className="text-[10px] text-slate-500 shrink-0 ml-2 font-mono">
                            {l.group}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

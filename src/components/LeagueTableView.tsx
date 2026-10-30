import React, { useState, useMemo } from 'react';
import { TeamStats } from '../types/football';
import { ArrowUpDown, Table, Activity } from 'lucide-react';

interface LeagueTableViewProps {
  teams: Record<string, TeamStats>;
  leagueName: string;
}

type SortField = 'pos' | 'pts' | 'p' | 'gd' | 'gf' | 'ga' | 'ppg' | 'psF' | 'stF';

export const LeagueTableView: React.FC<LeagueTableViewProps> = ({
  teams,
  leagueName,
}) => {
  const [sortField, setSortField] = useState<SortField>('pos');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const teamList = useMemo(() => {
    const list = Object.values(teams);
    return list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      switch (sortField) {
        case 'pos':
          valA = a.pos;
          valB = b.pos;
          break;
        case 'pts':
          valA = a.pts;
          valB = b.pts;
          break;
        case 'p':
          valA = a.p;
          valB = b.p;
          break;
        case 'gd':
          valA = a.gd;
          valB = b.gd;
          break;
        case 'gf':
          valA = a.hf + a.af;
          valB = b.hf + b.af;
          break;
        case 'ga':
          valA = a.ha + a.aa;
          valB = b.ha + b.aa;
          break;
        case 'ppg':
          valA = a.ppg;
          valB = b.ppg;
          break;
        case 'psF':
          valA = a.psF ?? 50;
          valB = b.psF ?? 50;
          break;
        case 'stF':
          valA = a.stF ?? 0;
          valB = b.stF ?? 0;
          break;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [teams, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'pos'); // pos default asc, stats default desc
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
            <span>THEFISHY.NET DATA</span>
            <span aria-hidden="true">·</span>
            <span>TABLA DE POSICIONES & ESTADÍSTICAS EXTENDIDAS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Clasificación & Métricas: {leagueName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Estadísticas oficiales consolidadas desde <code className="text-slate-300">leaguetable.php</code> y <code className="text-slate-300">leaguetableext.php</code>, utilizadas por el modelo predictivo de Poisson y Dixon-Coles.
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-3 w-10 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('pos')}>
                  #
                </th>
                <th className="py-3 px-4 font-semibold text-slate-200">
                  Equipo
                </th>
                <th className="py-3 px-2 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('p')}>
                  PJ
                </th>
                <th className="py-3 px-2 text-center text-slate-500">Local (G-E-P)</th>
                <th className="py-3 px-2 text-center text-slate-500">Visita (G-E-P)</th>
                <th className="py-3 px-2 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('gf')}>
                  GF
                </th>
                <th className="py-3 px-2 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('ga')}>
                  GC
                </th>
                <th className="py-3 px-2 text-center cursor-pointer hover:text-white font-bold" onClick={() => toggleSort('gd')}>
                  DG
                </th>
                <th className="py-3 px-3 text-center cursor-pointer hover:text-white font-bold text-emerald-400" onClick={() => toggleSort('pts')}>
                  Pts
                </th>
                <th className="py-3 px-2 text-center cursor-pointer hover:text-white" onClick={() => toggleSort('ppg')}>
                  PPG
                </th>
                <th className="py-3 px-3 text-center cursor-pointer hover:text-white text-cyan-400" onClick={() => toggleSort('psF')}>
                  Posesión
                </th>
                <th className="py-3 px-3 text-center cursor-pointer hover:text-white text-indigo-400" onClick={() => toggleSort('stF')}>
                  Tiros Arco
                </th>
                <th className="py-3 px-3 text-center">Racha (Últ. 6)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {teamList.map((t) => {
                const totalGF = t.hf + t.af;
                const totalGA = t.ha + t.aa;
                const formChars = t.form.split('');

                return (
                  <tr key={t.team} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400 tabular-nums">
                      {t.pos}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-white whitespace-nowrap">
                      {t.team}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-300">
                      {t.p}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-400 text-[11px]">
                      {t.hw}-{t.hd}-{t.hl} ({t.hf}:{t.ha})
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-400 text-[11px]">
                      {t.aw}-{t.ad}-{t.al} ({t.af}:{t.aa})
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-emerald-400 font-medium">
                      {totalGF}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-rose-400 font-medium">
                      {totalGA}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums font-bold text-slate-200">
                      {t.gd > 0 ? `+${t.gd}` : t.gd}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums font-bold text-emerald-400 text-sm">
                      {t.pts}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-300">
                      {t.ppg.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-cyan-300 font-medium">
                      {t.psF ? `${t.psF}%` : '50%'}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-indigo-300 font-medium">
                      {t.stF ? `${t.stF} / ${t.stA}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {formChars.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {formChars.map((ch, idx) => (
                            <span
                              key={idx}
                              className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                                ch === 'W'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : ch === 'D'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

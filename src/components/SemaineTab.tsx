import React, { useState } from 'react';
import type { AppData } from '../hooks/useAppData';
import { offsetToDate, todayOffset, weekStart, getEquipe, affectClass, DISPO_LABELS, MAX_OFFSET } from '../lib/dateUtils';
import { WeekNav, EquipeBadge } from './UI';

interface Props { data: AppData; }

function affectPriority(affect: string): number {
  const a = affect.trim().toUpperCase();
  if (a.startsWith('GRR'))                         return 0;
  if (a.startsWith('AST')) return 1;
  if (a.startsWith('GFF')|| a.startsWith('GIFF'))                         return 2;
  if (a.includes('COND') || a.includes('CDG'))     return 3;
  return 4;
}

function agentWeekPriority(agentIdx: number, days: { offset: number }[], cells: AppData['cells']): number {
  let best = 5;
  for (const { offset } of days) {
    const cell = cells[offset]?.[agentIdx];
    if (!cell) continue;
    if (cell.affect) best = Math.min(best, affectPriority(cell.affect));
    else if (cell.dispo && best > 5) best = 5;
  }
  return best;
}

const DISPO_SHORT: Record<string, string> = { J: 'J', M: 'M', AM: 'AM' };
const DISPO_CLS: Record<string, string>   = { J: 'cell-j', M: 'cell-m', AM: 'cell-am' };

export function SemaineTab({ data }: Props) {
  const [wStart, setWStart] = useState(() => weekStart(todayOffset()));
  const { agents, cells, gardes } = data;

  const days: { offset: number; date: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const o = wStart + i;
    if (o > MAX_OFFSET) break;
    days.push({ offset: o, date: offsetToDate(o) });
  }

  const activeAgents = agents
    .filter(a => days.some(({ offset }) => {
      const c = cells[offset]?.[a.idx];
      return c && (c.dispo || c.affect);
    }))
    .sort((a, b) => {
      const pa = agentWeekPriority(a.idx, days, cells);
      const pb = agentWeekPriority(b.idx, days, cells);
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, 'fr');
    });

  const empty = (
    <div className="card"><div className="empty-state">Aucune disponibilité saisie cette semaine</div></div>
  );

  return (
    <div className="tab-content">
      <WeekNav wStart={wStart} maxOffset={MAX_OFFSET} onShift={delta =>
        setWStart(Math.max(0, Math.min(MAX_OFFSET, wStart + delta)))
      } />

      {activeAgents.length === 0 ? empty : (
        <div className="card card-flush">

          {/* ── Desktop: table ─────────────────────────────────── */}
          <div className="week-scroll">
            <table className="week-table">
              <thead>
                <tr>
                  <th className="wt-agent-col">Agent</th>
                  {days.map(({ offset, date }) => {
                    const eq = getEquipe(offset, gardes);
                    return (
                      <th key={offset}>
                        <span className="wt-day-name">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                        <span className="wt-day-num">{date.getDate()}</span>
                        <EquipeBadge label={eq} />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {activeAgents.map(a => (
                  <tr key={a.idx}>
                    <td className="wt-agent-cell">
                      <span>{a.name}</span>
                      <div className="wt-badges">
                        {a.soff && <span className="badge-sm badge-soff">CA FDF</span>}
                        {a.cond && <span className="badge-sm badge-cond">Cod 2</span>}
                      </div>
                    </td>
                    {days.map(({ offset }) => {
                      const cell = cells[offset]?.[a.idx];
                      if (!cell?.dispo) return <td key={offset} className="wt-empty">—</td>;
                      if (cell.affect) return (
                        <td key={offset}>
                          <span className={`cell-chip ${affectClass(cell.affect)}`}>{cell.affect}</span>
                        </td>
                      );
                      return (
                        <td key={offset}>
                          <span className={`cell-chip ${DISPO_CLS[cell.dispo] ?? ''}`}>
                            {DISPO_LABELS[cell.dispo] ?? cell.dispo}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile: stacked cards ──────────────────────────── */}
          <div className="week-cards">
            {activeAgents.map(a => (
              <div key={a.idx} className="wc-agent-row">
                <div className="wc-agent-header">
                  <span className="wc-agent-name">{a.name}</span>
                  <div className="wc-badges">
                    {a.soff && <span className="badge-sm badge-soff">CA FDF</span>}
                    {a.cond && <span className="badge-sm badge-cond">Cod 2</span>}
                  </div>
                </div>

                <div className="wc-days">
                  {days.map(({ offset, date }) => {
                    const cell = cells[offset]?.[a.idx];
                    const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2).toUpperCase();
                    const dayNum   = date.getDate();

                    return (
                      <div key={offset} className="wc-day">
                        <span className="wc-day-label">{dayLabel}</span>
                        <span className="wc-day-num">{dayNum}</span>
                        {!cell?.dispo ? (
                          <span className="wc-empty">—</span>
                        ) : cell.affect ? (
                          <span className={`wc-chip ${affectClass(cell.affect)}`}>
                            {/* Abbreviate long affect names for mobile */}
                            {cell.affect.length > 6 ? cell.affect.slice(0, 6) : cell.affect}
                          </span>
                        ) : (
                          <span className={`wc-chip ${DISPO_CLS[cell.dispo] ?? ''}`}>
                            {DISPO_SHORT[cell.dispo] ?? cell.dispo}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}
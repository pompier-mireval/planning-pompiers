import React, { useState } from 'react';
import type { AppData } from '../hooks/useAppData';
import {
  offsetToDate, todayOffset, weekStart, getEquipe,
  affectClass, DISPO_LABELS, capitalize, MAX_OFFSET,
} from '../lib/dateUtils';
import { WeekNav, EquipeBadge, QualifBadges } from './UI';

interface Props { data: AppData; }

function affectPriority(affect: string): number {
  const a = affect.trim().toUpperCase();
  if (a.startsWith('GRR'))                     return 0;
  if (a.startsWith('AST'))                     return 1;
  if (a.startsWith('GFF') || a.startsWith('GIFF')) return 2;
  if (a.includes('COND') || a.includes('CDG')) return 3;
  return 4;
}

const DISPO_CLS: Record<string, string> = { J: 'cell-j', M: 'cell-m', AM: 'cell-am' };

export function SemaineTab({ data }: Props) {
  const [wStart, setWStart]   = useState(() => weekStart(todayOffset()));
  const [dayOffset, setDay]   = useState(() => todayOffset());
  const { agents, cells, gardes } = data;

  const today = todayOffset();

  const weekDays: { offset: number; date: Date }[] = [];
  for (let i = 0; i < 7; i++) {
    const o = wStart + i;
    if (o > MAX_OFFSET) break;
    weekDays.push({ offset: o, date: offsetToDate(o) });
  }

  // Agents dispos ce jour, triés par affectation puis nom
  const dayAgents = agents
    .filter(a => {
      const c = cells[dayOffset]?.[a.idx];
      return c && c.dispo;
    })
    .sort((a, b) => {
      const ca = cells[dayOffset]?.[a.idx];
      const cb = cells[dayOffset]?.[b.idx];
      const pa = ca?.affect ? affectPriority(ca.affect) : 5;
      const pb = cb?.affect ? affectPriority(cb.affect) : 5;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, 'fr');
    });

  const d        = offsetToDate(dayOffset);
  const eq       = getEquipe(dayOffset, gardes);
  const dayLabel = capitalize(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

  return (
    <div className="tab-content">
      <WeekNav wStart={wStart} maxOffset={MAX_OFFSET} onShift={delta => {
        const next = weekStart(Math.max(0, Math.min(MAX_OFFSET, wStart + delta)));
        setWStart(next);
        setDay(next);
      }} />

      {/* Mini calendrier semaine */}
      <div className="mini-cal">
        {weekDays.map(({ offset, date }) => {
          const hasDispo = Object.values(cells[offset] || {}).some(c => c.dispo);
          return (
            <button
              key={offset}
              className={`mini-cal-day ${offset === dayOffset ? 'selected' : ''} ${offset === today ? 'today' : ''}`}
              onClick={() => setDay(offset)}
            >
              <span className="mcd-wday">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <span className="mcd-num">{date.getDate()}</span>
              <span className={`mcd-dot ${hasDispo ? 'has-dot' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* En-tête du jour */}
      <div className="day-header">
        <span className="day-header-label">{dayLabel}</span>
        <EquipeBadge label={eq} />
      </div>

      {/* Liste agents du jour */}
      <div className="card">
        <div className="card-title">
          {dayAgents.length} agent{dayAgents.length !== 1 ? 's' : ''} disponible{dayAgents.length !== 1 ? 's' : ''}
        </div>

        {dayAgents.length === 0 ? (
          <div className="empty-state">Aucune disponibilité ce jour</div>
        ) : dayAgents.map(a => {
          const cell = cells[dayOffset]?.[a.idx];
          return (
            <div key={a.idx} className="semaine-agent-row">
              <div className="agent-info">
                <span className="agent-name">{a.name}</span>
                <div className="agent-badges">
                  <QualifBadges soff={a.soff} cond={a.cond} condVpf={a.condVpf} />
                  <span className="dispo-label">{DISPO_LABELS[cell?.dispo ?? ''] ?? cell?.dispo}</span>
                </div>
              </div>
              {cell?.affect ? (
                <span className={`cell-chip ${affectClass(cell.affect)}`}>{cell.affect}</span>
              ) : (
                <span className={`cell-chip ${DISPO_CLS[cell?.dispo ?? ''] ?? ''}`}>
                  {DISPO_LABELS[cell?.dispo ?? ''] ?? cell?.dispo}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
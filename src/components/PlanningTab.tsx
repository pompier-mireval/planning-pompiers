import React, { useState } from 'react';
import type { AppData } from '../hooks/useAppData';
import {
  offsetToDate, todayOffset, weekStart, weekRangeLabel,
  getEquipe, affectClass, DISPO_LABELS, capitalize, MAX_OFFSET,
} from '../lib/dateUtils';
import { EquipeBadge, EquityBar, EquityBarAst, QualifBadges, WeekNav, AffectBadge } from './UI';
import { AffectModal } from './AffectModal';

interface Props {
  data: AppData;
  onAffect: (offset: number, agentIdx: number, value: string) => Promise<void>;
}

interface ModalState {
  open: boolean;
  agentIdx: number;
  agentName: string;
  dispo: string;
  dayOffset: number;
  currentAffect?: string;
}

export function PlanningTab({ data, onAffect }: Props) {
  const [dayOffset, setDayOffset]   = useState(() => todayOffset());
  const [wStart, setWStart]         = useState(() => weekStart(todayOffset()));
  const [modal, setModal]           = useState<ModalState>({ open: false, agentIdx: 0, agentName: '', dispo: '', dayOffset: 0 });

  const { agents, cells, gardes, stats, gestion } = data;

  const weekDays: number[] = [];
  for (let i = 0; i < 7; i++) {
    const o = wStart + i;
    if (o <= MAX_OFFSET) weekDays.push(o);
  }

  const dayCells = cells[dayOffset] || {};
  const today    = todayOffset();

  // Moyennes et max depuis Gestion 2026
  const allGestion = agents.map(a => gestion[a.name.toLowerCase()] ?? null);
  const gestionValid = allGestion.filter(Boolean);
  const avgGarde     = gestionValid.length
    ? gestionValid.reduce((s, g) => s + (g?.pctGarde ?? 0), 0) / gestionValid.length
    : 0;
  const avgAstreinte = gestionValid.length
    ? gestionValid.reduce((s, g) => s + (g?.pctAstreinte ?? 0), 0) / gestionValid.length
    : 0;
  const maxGarde     = Math.max(...gestionValid.map(g => g?.pctGarde ?? 0), 0.01);
  const maxAstreinte = Math.max(...gestionValid.map(g => g?.pctAstreinte ?? 0), 0.01);

  const available = agents
    .map(a => ({
      ...a,
      cell: dayCells[a.idx] ?? null,
      stat: stats[a.idx] ?? { gardes: 0, dispos: 0, rate: 0 },
      g:    gestion[a.name.toLowerCase()] ?? null,
    }))
    .filter(a => a.cell?.dispo)
    .sort((a, b) => {
      // Trier par % garde Gestion si dispo, sinon par rate local
      const pA = a.g?.pctGarde ?? a.stat.rate;
      const pB = b.g?.pctGarde ?? b.stat.rate;
      return pA - pB;
    });

  function openModal(agentIdx: number, agentName: string, dispo: string, offset: number, currentAffect?: string) {
    setModal({ open: true, agentIdx, agentName, dispo, dayOffset: offset, currentAffect });
  }

  async function handleConfirm(type: string) {
    await onAffect(modal.dayOffset, modal.agentIdx, type);
    setModal(m => ({ ...m, open: false }));
  }

  async function handleDelete() {
    await onAffect(modal.dayOffset, modal.agentIdx, '');
    setModal(m => ({ ...m, open: false }));
  }

  const d        = offsetToDate(dayOffset);
  const eq       = getEquipe(dayOffset, gardes);
  const dayLabel = capitalize(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

  return (
    <div className="tab-content">
      {/* Week navigator */}
      <WeekNav wStart={wStart} maxOffset={MAX_OFFSET} onShift={delta => {
        const next = weekStart(Math.max(0, Math.min(MAX_OFFSET, wStart + delta * 7)));
        setWStart(next);
        setDayOffset(next);
      }} />

      {/* Mini week calendar */}
      <div className="mini-cal">
        {weekDays.map(o => {
          const dd = offsetToDate(o);
          const hasDispo = Object.values(cells[o] || {}).some(c => c.dispo);
          return (
            <button
              key={o}
              className={`mini-cal-day ${o === dayOffset ? 'selected' : ''} ${o === today ? 'today' : ''}`}
              onClick={() => setDayOffset(o)}
            >
              <span className="mcd-wday">{dd.toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <span className="mcd-num">{dd.getDate()}</span>
              <span className={`mcd-dot ${hasDispo ? 'has-dot' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Day header */}
      <div className="day-header">
        <span className="day-header-label">{dayLabel}</span>
        <EquipeBadge label={eq} />
      </div>

      {/* Agent list */}
      <div className="card">
        <div className="card-title">Agents disponibles · du moins chargé au plus chargé</div>
        {available.length > 0 && (
          <div className="agent-row agent-row-dual agent-row-header">
            <span />
            <div className="gauge-col-label">
              <span>Garde</span>
              <span className="gauge-col-avg">moy. {Math.round(avgGarde * 100)}%</span>
            </div>
            <div className="gauge-col-label gauge-col-label-ast">
              <span>Astreinte</span>
              <span className="gauge-col-avg">{Math.round(avgAstreinte * 100)}%</span>
            </div>
            <span />
          </div>
        )}
        {available.length === 0 ? (
          <div className="empty-state">Aucun agent disponible ce jour</div>
        ) : available.map(a => (
          <div key={a.idx} className="agent-row agent-row-dual">
            <div className="agent-info">
              <span className="agent-name">{a.name}</span>
              <div className="agent-badges">
                <QualifBadges soff={a.soff} cond={a.cond} condVpf={a.condVpf} />
                <span className="dispo-label">{DISPO_LABELS[a.cell!.dispo] ?? a.cell!.dispo}</span>
              </div>
            </div>
            {/* Jauges garde + astreinte groupées sur mobile */}
            <div className="equity-bar-duo">
              <div className="equity-bar-labeled">
                <span className="equity-bar-side-label">Garde</span>
                {a.g ? (
                  <EquityBar pctGarde={a.g.pctGarde} avgGarde={avgGarde} maxGarde={maxGarde} />
                ) : (
                  <EquityBar
                    rate={a.stat.rate}
                    maxRate={Math.max(...agents.map(ag => stats[ag.idx]?.rate ?? 0), 0.01)}
                  />
                )}
              </div>
              <div className="equity-bar-labeled">
                <span className="equity-bar-side-label">Astreinte</span>
                {a.g ? (
                  <EquityBarAst pctAstreinte={a.g.pctAstreinte} avgAstreinte={avgAstreinte} maxAstreinte={maxAstreinte} />
                ) : (
                  <span className="equity-bar-wrap" />
                )}
              </div>
            </div>
            {a.cell?.affect ? (
              <AffectBadge
                affect={a.cell.affect}
                onClick={() => openModal(a.idx, a.name, a.cell!.dispo, dayOffset, a.cell!.affect)}
              />
            ) : (
              <button
                className="btn-assign"
                onClick={() => openModal(a.idx, a.name, a.cell!.dispo, dayOffset)}
              >
                Affecter
              </button>
            )}
          </div>
        ))}
      </div>

      <AffectModal
        open={modal.open}
        agentName={modal.agentName}
        dispo={modal.dispo}
        rate={gestion[agents[modal.agentIdx]?.name?.toLowerCase()]?.pctGarde
              ?? stats[modal.agentIdx]?.rate ?? 0}
        currentAffect={modal.currentAffect}
        onConfirm={handleConfirm}
        onDelete={handleDelete}
        onClose={() => setModal(m => ({ ...m, open: false }))}
      />
    </div>
  );
}
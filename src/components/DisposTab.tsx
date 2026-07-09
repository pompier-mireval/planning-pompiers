import React, { useState } from 'react';
import type { AppData } from '../hooks/useAppData';
import type { CurrentUser } from '../lib/types';
import {
  offsetToDate, todayOffset, weekStart, weekLength, getEquipe, capitalize, MAX_OFFSET,
} from '../lib/dateUtils';
import { EquipeBadge, WeekNav, QualifBadges } from './UI';

interface Props {
  data: AppData;
  user: CurrentUser;
  onUpdateDispo: (offset: number, agentIdx: number, value: string) => Promise<void>;
}

interface PendingChange {
  offset: number;
  value: string;
  affect: string;
  label: string;
}

export function DisposTab({ data, user, onUpdateDispo }: Props) {
  const [wStart, setWStart] = useState(() => weekStart(todayOffset()));
  const [pending, setPending] = useState<PendingChange | null>(null);
  const { agents, cells, gardes } = data;
  const agent = agents.find(a => a.email === user.email.toLowerCase());

  if (!agent) return (
    <div className="tab-content">
      <div className="error-banner">Agent introuvable. Vérifie que ton Gmail est bien enregistré dans l'onglet Agents.</div>
    </div>
  );

  const today = todayOffset();
  const days: { offset: number; date: Date }[] = [];
  for (let i = 0; i < weekLength(wStart); i++) {
    const o = wStart + i;
    if (o > MAX_OFFSET) break;
    days.push({ offset: o, date: offsetToDate(o) });
  }
  const initials = agent.name.slice(0, 2).toUpperCase();

  const applyChange = (offset: number, value: string) => {
    console.log("[dispo] applyChange offset:", offset, "agentIdx:", agent.idx, "value:", value);
    onUpdateDispo(offset, agent.idx, value);
  };

  const handleChange = (offset: number, value: string, affect: string, dispo: string, label: string) => {
    // Si l'agent est affecté à quelque chose et qu'il modifie sa dispo (peu importe la nouvelle valeur)
    if (affect && value !== dispo) {
      setPending({ offset, value, affect, label });
      return;
    }
    applyChange(offset, value);
  };

  const confirmPending = () => {
    if (pending) {
      applyChange(pending.offset, pending.value);
      setPending(null);
    }
  };

  const cancelPending = () => setPending(null);

  return (
    <div className="tab-content">
      {/* Agent card */}
      <div className="card agent-profile-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <div className="agent-name">{agent.name}</div>
          <div className="agent-badges">
            <QualifBadges soff={agent.soff} cond={agent.cond} condVpf={agent.condVpf} />
          </div>
        </div>
      </div>

      <WeekNav wStart={wStart} maxOffset={MAX_OFFSET} onShift={delta =>
        setWStart(weekStart(Math.max(0, Math.min(MAX_OFFSET, wStart + delta))))
      } />

      <div className="card">
        <div className="card-title">Disponibilités</div>
        {days.map(({ offset, date }) => {
          const eq      = getEquipe(offset, gardes);
          const cell    = cells[offset]?.[agent.idx] ?? {};
          const dispo   = (cell as any).dispo  ?? '';
          const affect  = (cell as any).affect ?? '';
          const label   = capitalize(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
          const isToday = offset === today;
          const isPast  = offset < today;

          return (
            <div key={offset} className={`dispo-row ${isToday ? 'dispo-today' : ''} ${isPast ? 'dispo-past' : ''}`}>
              <div className="dispo-day-info">
                <span className="dispo-day-label">{label}</span>
                <EquipeBadge label={eq} />
              </div>
              <select
                className="dispo-select"
                value={dispo}
                disabled={isPast}
                title={isPast ? 'Jour passé — non modifiable' : undefined}
                onChange={e => {
                  if (isPast) return;
                  handleChange(offset, e.target.value, affect, dispo, label);
                }}
              >
                <option value="">Indispo</option>
                <option value="J">Journée</option>
                <option value="M">Matin</option>
                <option value="AM">Après-midi</option>
              </select>
              {affect && <span className="dispo-affect-label">{affect}</span>}
            </div>
          );
        })}
      </div>

      {pending && (
        <div className="modal-overlay" onClick={cancelPending}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚠️ Attention</div>
            <div className="modal-body">
              Tu es affecté en tant que <strong>{pending.affect}</strong> le {pending.label}.
              <br />
              Si tu modifies ta disponibilité, pense à prévenir le chef de garde de la semaine.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={cancelPending}>Annuler</button>
              <button className="btn btn-danger" onClick={confirmPending}>Confirmer quand même</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
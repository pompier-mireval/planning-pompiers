import React from 'react';
import type { AppData } from '../hooks/useAppData';
import { QualifBadges } from './UI';

interface Props { data: AppData; }

export function EquiteTab({ data }: Props) {
  const { agents, gestion } = data;

  // Construire la liste enrichie depuis Gestion 2026
  const enriched = agents.map(a => {
    const g = gestion[a.name.toLowerCase()] ?? {
      joursDispos: 0, nbGardes: 0, pctGarde: 0,
      nbAstreintes: 0, pctAstreinte: 0, moyEquipe: 0, ecart: 0,
    };
    return { ...a, g };
  });

  // Trier par % garde croissant
  const sorted = [...enriched].sort((a, b) => a.g.pctGarde - b.g.pctGarde);

  const totalGardes    = sorted.reduce((s, a) => s + a.g.nbGardes, 0);
  const totalAstreintes = sorted.reduce((s, a) => s + a.g.nbAstreintes, 0);
  const avgGarde       = sorted.length ? sorted.reduce((s, a) => s + a.g.pctGarde, 0) / sorted.length : 0;
  const avgAstreinte   = sorted.length ? sorted.reduce((s, a) => s + a.g.pctAstreinte, 0) / sorted.length : 0;

  const maxGarde     = Math.max(...sorted.map(a => a.g.pctGarde), 0.01);
  const maxAstreinte = Math.max(...sorted.map(a => a.g.pctAstreinte), 0.01);

  function gardeColorCls(pct: number) {
    if (pct < avgGarde * 0.8)   return 'fill-low';
    if (pct < avgGarde * 1.2)   return 'fill-mid';
    return 'fill-high';
  }

  function astrColorCls(pct: number) {
    if (pct < avgAstreinte * 0.8)   return 'fill-low';
    if (pct < avgAstreinte * 1.2)   return 'fill-mid';
    return 'fill-high';
  }

  function pctColorCls(pct: number, avg: number) {
    if (pct < avg * 0.8)   return 'pct-low';
    if (pct < avg * 1.2)   return 'pct-mid';
    return 'pct-high';
  }

  return (
    <div className="tab-content">
      {/* Summary stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{agents.length}</div>
          <div className="stat-label">Agents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalGardes}</div>
          <div className="stat-label">Gardes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(avgGarde * 100)}%</div>
          <div className="stat-label">Taux garde moy.</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalAstreintes}</div>
          <div className="stat-label">Astreintes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(avgAstreinte * 100)}%</div>
          <div className="stat-label">Taux astreinte moy.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Équité gardes &amp; astreintes (source : Gestion 2026)</div>

        {/* Légende colonnes */}
        <div className="equite-header-row">
          <span className="eq-rank" />
          <div className="agent-info" />
          <span className="eq-count-label">Gardes</span>
          <div className="equity-col-label">% garde</div>
          <span className="eq-count-label">Astreintes</span>
          <div className="equity-col-label">% astreinte</div>
        </div>

        {sorted.map((a, rank) => {
          const gPct   = Math.round(a.g.pctGarde * 100);
          const gFillW = Math.round((a.g.pctGarde / maxGarde) * 100);
          const aPct   = Math.round(a.g.pctAstreinte * 100);
          const aFillW = Math.round((a.g.pctAstreinte / maxAstreinte) * 100);

          return (
            <div key={a.idx} className="equite-row equite-row-double">
              <span className="eq-rank">#{rank + 1}</span>

              <div className="agent-info">
                <span className="agent-name">{a.name}</span>
                <div className="agent-badges">
                  <QualifBadges soff={a.soff} cond={a.cond} />
                </div>
              </div>

              {/* Colonne Gardes */}
              <span className="eq-count">{a.g.nbGardes}G / {a.g.joursDispos}D</span>
              <div className="equity-double-col">
                <div className="equity-bar">
                  <div className={`equity-fill ${gardeColorCls(a.g.pctGarde)}`} style={{ width: gFillW + '%' }} />
                </div>
                <span className={`eq-pct-val ${pctColorCls(a.g.pctGarde, avgGarde)}`}>{gPct}%</span>
              </div>

              {/* Colonne Astreintes */}
              <span className="eq-count">{a.g.nbAstreintes}A</span>
              <div className="equity-double-col">
                <div className="equity-bar equity-bar-ast">
                  <div className={`equity-fill ${astrColorCls(a.g.pctAstreinte)}`} style={{ width: aFillW + '%' }} />
                </div>
                <span className={`eq-pct-val ${pctColorCls(a.g.pctAstreinte, avgAstreinte)}`}>{aPct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
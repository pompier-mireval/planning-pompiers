import React from 'react';
import { equipeColor, affectClass, DISPO_LABELS, weekRangeLabel } from '../lib/dateUtils';

// ── Equipe badge ─────────────────────────────────────────────

export function EquipeBadge({ label }: { label: string }) {
  return <span className={`eq-badge ${equipeColor(label)}`}>{label}</span>;
}

// ── Dispo tag ─────────────────────────────────────────────────

export function DispoTag({ code }: { code: string }) {
  const cls = { J: 'dispo-j', M: 'dispo-m', AM: 'dispo-am' }[code] || '';
  return <span className={`dispo-tag ${cls}`}>{DISPO_LABELS[code] ?? code}</span>;
}

// ── Affect badge ──────────────────────────────────────────────

export function AffectBadge({ affect, onClick }: { affect: string; onClick?: () => void }) {
  return (
    <button
      className={`affect-badge ${affectClass(affect)}`}
      onClick={onClick}
      type="button"
    >
      {affect}
    </button>
  );
}

// ── Equity bar (garde) ─────────────────────────────────────────

interface EquityBarProps {
  // Source locale (fallback)
  rate?: number;
  maxRate?: number;
  // Source Gestion 2026
  pctGarde?: number;
  avgGarde?: number;
  maxGarde?: number;
}

export function EquityBar({ rate = 0, maxRate = 1, pctGarde, avgGarde, maxGarde }: EquityBarProps) {
  const usedPct = pctGarde !== undefined ? pctGarde : rate;
  const usedMax = pctGarde !== undefined ? Math.max(maxGarde ?? usedPct, 0.01) : maxRate;
  const usedAvg = pctGarde !== undefined ? (avgGarde ?? 0) : (maxRate * 0.5);

  const fillW = usedMax > 0 ? Math.min(100, Math.round((usedPct / usedMax) * 100)) : 0;
  const cls = usedPct < usedAvg * 0.8 ? 'fill-low' : usedPct < usedAvg * 1.2 ? 'fill-mid' : 'fill-high';

  return (
    <div className="equity-bar-wrap">
      <div className="equity-bar">
        <div className={`equity-fill ${cls}`} style={{ width: fillW + '%' }} />
      </div>
      <span className="equity-pct">{Math.round(usedPct * 100)}%</span>
    </div>
  );
}

// ── Equity bar (astreinte) ────────────────────────────────────

interface EquityBarAstProps {
  pctAstreinte: number;
  avgAstreinte: number;
  maxAstreinte: number;
}

export function EquityBarAst({ pctAstreinte, avgAstreinte, maxAstreinte }: EquityBarAstProps) {
  const usedMax = Math.max(maxAstreinte, 0.01);
  const fillW   = Math.min(100, Math.round((pctAstreinte / usedMax) * 100));
  const cls     = pctAstreinte < avgAstreinte * 0.8 ? 'fill-low'
                : pctAstreinte < avgAstreinte * 1.2 ? 'fill-mid'
                : 'fill-high';
  return (
    <div className="equity-bar-wrap">
      <div className="equity-bar equity-bar-ast">
        <div className={`equity-fill ${cls}`} style={{ width: fillW + '%' }} />
      </div>
      <span className="equity-pct equity-pct-ast">{Math.round(pctAstreinte * 100)}%</span>
    </div>
  );
}

export function QualifBadges({ soff, cond }: { soff: boolean; cond: boolean }) {
  return (
    <>
      {soff && <span className="badge-sm badge-soff">S/off</span>}
      {cond && <span className="badge-sm badge-cond">Cond.</span>}
    </>
  );
}

// ── Week nav ──────────────────────────────────────────────────

interface WeekNavProps {
  wStart: number;
  maxOffset: number;
  onShift: (delta: number) => void;
}

export function WeekNav({ wStart, maxOffset, onShift }: WeekNavProps) {
  return (
    <div className="week-nav">
      <button
        className="week-nav-btn"
        disabled={wStart <= 0}
        onClick={() => onShift(-7)}
        aria-label="Semaine précédente"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span className="week-nav-label">{weekRangeLabel(wStart)}</span>
      <button
        className="week-nav-btn"
        disabled={wStart + 7 > maxOffset}
        onClick={() => onShift(7)}
        aria-label="Semaine suivante"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}

// ── Saving indicator ──────────────────────────────────────────

export function SavingIndicator({ visible }: { visible: boolean }) {
  return (
    <div className={`saving-toast ${visible ? 'visible' : ''}`}>
      <span className="saving-dot" />
      Enregistrement…
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner">{message}</div>;
}
/**
 * quotas.ts — Gestion des quotas de postes par jour
 *
 * Les quotas sont stockés dans la feuille Google Sheets SAISON 2026,
 * ligne "Quotas" (row 3, index 2), format : "GRR:4 AST:2 VPF:1 COND:1 GFF:1"
 * Une valeur absente ou 0 signifie "pas de limite pour ce poste ce jour-là".
 */

import type { CellMap } from './types';

export interface DayQuotas {
  grr:  number;
  ast:  number;
  vpf:  number;
  cond: number;
  gff:  number;
}

export const EMPTY_QUOTAS: DayQuotas = { grr: 0, ast: 0, vpf: 0, cond: 0, gff: 0 };

/** Parse une cellule quota : "GRR:4 AST:2 VPF:1 COND:1 GFF:1" → DayQuotas */
export function parseQuotaCell(raw: string | undefined): DayQuotas {
  const q: DayQuotas = { ...EMPTY_QUOTAS };
  if (!raw) return q;
  const s = raw.trim().toUpperCase();
  const match = (key: string) => {
    const m = s.match(new RegExp(`${key}:(\\d+(?:\\.\\d+)?)`));
    return m ? parseFloat(m[1]) : 0;
  };
  q.grr  = match('GRR');
  q.ast  = match('AST');
  q.vpf  = match('VPF');
  q.cond = match('COND');
  q.gff  = match('GFF');
  return q;
}

/** Sérialise un DayQuotas en chaîne pour le sheet */
export function serializeQuotas(q: DayQuotas): string {
  const parts: string[] = [];
  if (q.grr  > 0) parts.push(`GRR:${q.grr}`);
  if (q.ast  > 0) parts.push(`AST:${q.ast}`);
  if (q.vpf  > 0) parts.push(`VPF:${q.vpf}`);
  if (q.cond > 0) parts.push(`COND:${q.cond}`);
  if (q.gff  > 0) parts.push(`GFF:${q.gff}`);
  return parts.join(' ');
}

/** Vérifie si un DayQuotas est vide (tout à 0) */
export function isEmptyQuotas(q: DayQuotas): boolean {
  return q.grr === 0 && q.ast === 0 && q.vpf === 0 && q.cond === 0 && q.gff === 0;
}

// ── Fill (remplissage réel) ───────────────────────────────────

export interface DayFill {
  grr:  number;
  ast:  number;
  vpf:  number;
  cond: number;
  gff:  number;
}

export function computeDayFill(cells: CellMap, offset: number): DayFill {
  const fill: DayFill = { grr: 0, ast: 0, vpf: 0, cond: 0, gff: 0 };
  const dayCells = cells[offset] || {};

  for (const cell of Object.values(dayCells)) {
    const a = (cell.affect || '').trim().toUpperCase();
    if (!a) continue;

    if (a === 'GRR JOURNÉE' || a === 'GRR JOURNEE') {
      fill.grr += 1;
    } else if (a === 'GRR MATIN' || a === 'GRR APRÈS-MIDI' || a === 'GRR APRES-MIDI') {
      fill.grr += 0.5;
    } else if (a.startsWith('AST') || a.startsWith('GIFF')) {
      fill.ast += 1;
    } else if (a.startsWith('VPF')) {
      fill.vpf += 1;
    } else if (a.includes('COND')) {
      fill.cond += 1;
    } else if (a.startsWith('GFF')) {
      fill.gff += 1;
    }
  }

  return fill;
}

/** Catégorie de quota pour un type d'affectation */
export function affectCategory(affect: string): keyof DayFill | null {
  const a = affect.trim().toUpperCase();
  if (a.startsWith('GRR'))                         return 'grr';
  if (a.startsWith('AST') || a.startsWith('GIFF')) return 'ast';
  if (a.startsWith('VPF'))                         return 'vpf';
  if (a.includes('COND'))     return 'cond';
  if (a.startsWith('GFF'))                         return 'gff';
  return null; // Sollicitable → pas de quota
}

/** Coût en quota d'un type (GRR Matin/AM = 0.5, reste = 1) */
export function affectCost(affect: string): number {
  const a = affect.trim().toUpperCase();
  if (a === 'GRR MATIN' || a === 'GRR APRÈS-MIDI' || a === 'GRR APRES-MIDI') return 0.5;
  return 1;
}

/**
 * Vérifie si un type d'affectation est disponible.
 * Si quota = 0 → pas de limite → toujours dispo.
 * currentAffect : affectation actuelle de l'agent (déduite du fill pour éviter double-comptage).
 */
export function isAffectAvailable(
  affect: string,
  fill: DayFill,
  quotas: DayQuotas,
  currentAffect?: string,
): boolean {
  const cat = affectCategory(affect);
  if (!cat) return true; // Sollicitable toujours dispo

  const quota = quotas[cat];
  if (quota === 0) return true; // pas de limite définie

  const cost = affectCost(affect);
  let currentFill = fill[cat];

  if (currentAffect) {
    const curCat = affectCategory(currentAffect);
    if (curCat === cat) currentFill -= affectCost(currentAffect);
  }

  return currentFill + cost <= quota;
}

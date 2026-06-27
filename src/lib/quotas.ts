/**
 * quotas.ts — Gestion des quotas de postes par jour
 *
 * Les quotas sont stockés en localStorage pour permettre
 * à l'admin de les modifier sans toucher au code.
 *
 * Structure : { grr: number, ast: number, vpf: number, cond: number, gff: number }
 * Par défaut : valeurs configurables dans DEFAULT_QUOTAS
 */

import type { CellMap } from './types';

export interface DayQuotas {
  grr:  number;  // GRR (Journée = 1, Matin ou AM = 0.5)
  ast:  number;  // Astreinte
  vpf:  number;  // VPF
  cond: number;  // Cond. CDG
  gff:  number;  // GFF
}

export const DEFAULT_QUOTAS: DayQuotas = {
  grr:  4,
  ast:  2,
  vpf:  1,
  cond: 1,
  gff:  1,
};

const STORAGE_KEY = 'pp_quotas';

export function loadQuotas(): DayQuotas {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_QUOTAS };
    const parsed = JSON.parse(raw);
    // Fusionner avec les défauts pour gérer les nouvelles clés
    return { ...DEFAULT_QUOTAS, ...parsed };
  } catch {
    return { ...DEFAULT_QUOTAS };
  }
}

export function saveQuotas(q: DayQuotas): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

/**
 * Calcule le remplissage actuel des postes pour un jour donné.
 * GRR Journée = 1 point, GRR Matin ou GRR Après-midi = 0.5 point.
 * Les autres types = 1 point (présence/absence).
 */
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
    } else if (a.includes('COND') || a.includes('CDG')) {
      fill.cond += 1;
    } else if (a.startsWith('GFF')) {
      fill.gff += 1;
    }
  }

  return fill;
}

/** Retourne la catégorie de quota pour un type d'affectation */
export function affectCategory(affect: string): keyof DayFill | null {
  const a = affect.trim().toUpperCase();
  if (a.startsWith('GRR'))                        return 'grr';
  if (a.startsWith('AST') || a.startsWith('GIFF')) return 'ast';
  if (a.startsWith('VPF'))                        return 'vpf';
  if (a.includes('COND') || a.includes('CDG'))    return 'cond';
  if (a.startsWith('GFF'))                        return 'gff';
  return null; // Sollicitable et autres → pas de quota
}

/** Pour un type d'affectation, retourne le coût en quota (0.5 ou 1) */
export function affectCost(affect: string): number {
  const a = affect.trim().toUpperCase();
  if (a === 'GRR MATIN' || a === 'GRR APRÈS-MIDI' || a === 'GRR APRES-MIDI') return 0.5;
  return 1;
}

/** Vérifie si un type d'affectation est disponible (quota non atteint) */
export function isAffectAvailable(
  affect: string,
  fill: DayFill,
  quotas: DayQuotas,
  currentAffect?: string  // affectation actuelle de cet agent (à déduire du fill)
): boolean {
  const cat = affectCategory(affect);
  if (!cat) return true; // Sollicitable toujours dispo

  const cost = affectCost(affect);
  const quota = quotas[cat];

  // Si l'agent a déjà cette catégorie, on déduit son ancienne valeur
  let currentFill = fill[cat];
  if (currentAffect) {
    const curCat = affectCategory(currentAffect);
    if (curCat === cat) {
      currentFill -= affectCost(currentAffect);
    }
  }

  return currentFill + cost <= quota;
}

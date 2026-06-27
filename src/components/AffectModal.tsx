import React, { useState, useEffect } from 'react';
import { TYPES_GARDE } from '../lib/dateUtils';
import type { DayFill, DayQuotas } from '../lib/quotas';
import { affectCategory, affectCost } from '../lib/quotas';

interface Props {
  open: boolean;
  agentName: string;
  dispo: string;
  rate: number;
  currentAffect?: string;
  fill: DayFill;
  quotas: DayQuotas;
  onConfirm: (type: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

const DISPO_LABELS: Record<string, string> = { J: 'Journée', M: 'Matin', AM: 'Après-midi' };

// Groupes pour l'affichage dans la modale
const TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: 'GRR',         types: ['GRR Journée', 'GRR Matin', 'GRR Après-midi'] },
  { label: 'Astreinte',   types: ['AST Journée', 'AST Matin', 'AST Après-midi'] },
  { label: 'Autres',      types: ['VPF', 'GFF', 'Cond. CDG'] },
  { label: '',            types: ['Sollicitable'] },
];

function QuotaChip({ fill, quota, cat }: { fill: number; quota: number; cat: string }) {
  const full = fill >= quota;
  return (
    <span className={`quota-chip ${full ? 'quota-full' : fill > 0 ? 'quota-partial' : 'quota-empty'}`}>
      {cat} {fill}/{quota}
    </span>
  );
}

export function AffectModal({ open, agentName, dispo, rate, currentAffect, fill, quotas, onConfirm, onDelete, onClose }: Props) {
  const [selected, setSelected] = useState(currentAffect || '');

  useEffect(() => {
    setSelected(currentAffect || '');
  }, [currentAffect, open]);

  if (!open) return null;

  // Pour chaque type, calcule si disponible (quota non atteint)
  function isAvailable(type: string): boolean {
    const cat = affectCategory(type);
    if (!cat) return true; // Sollicitable

    const cost = affectCost(type);
    const quota = quotas[cat];

    // Déduire l'affectation actuelle de l'agent si elle est dans la même catégorie
    let currentFill = fill[cat];
    if (currentAffect) {
      const curCat = affectCategory(currentAffect);
      if (curCat === cat) {
        currentFill -= affectCost(currentAffect);
      }
    }

    return currentFill + cost <= quota;
  }

  // Labels courts pour les chips de quota
  const quotaRows: { cat: keyof DayFill; label: string }[] = [
    { cat: 'grr',  label: 'GRR' },
    { cat: 'ast',  label: 'AST' },
    { cat: 'vpf',  label: 'VPF' },
    { cat: 'cond', label: 'COND' },
    { cat: 'gff',  label: 'GFF' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-drag-handle" />
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {currentAffect ? 'Modifier affectation' : `Affecter ${agentName}`}
            </h2>
            <p className="modal-sub">
              Dispo : {DISPO_LABELS[dispo] ?? dispo} · Taux : {Math.round(rate * 100)}%
            </p>
          </div>
          {currentAffect && (
            <button className="modal-delete-btn" onClick={onDelete} title="Supprimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          )}
        </div>

        {/* Récap quotas du jour */}
        <div className="quota-recap">
          {quotaRows.map(({ cat, label }) => (
            <QuotaChip key={cat} fill={fill[cat]} quota={quotas[cat]} cat={label} />
          ))}
        </div>

        {/* Boutons par groupe */}
        <div className="type-groups">
          {TYPE_GROUPS.map(group => {
            // Filtrer : on cache les types dont le quota est atteint (sauf Sollicitable)
            const visibleTypes = group.types.filter(t => isAvailable(t));
            if (visibleTypes.length === 0) return null;
            return (
              <div key={group.label} className="type-group">
                {group.label && <div className="type-group-label">{group.label}</div>}
                <div className="type-grid">
                  {visibleTypes.map(t => (
                    <button
                      key={t}
                      className={`type-btn ${selected === t ? 'selected' : ''}`}
                      onClick={() => setSelected(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <button
            className="btn-confirm"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            Confirmer
          </button>
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

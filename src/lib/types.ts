export interface Agent {
  idx:      number;
  name:     string;
  email:    string;
  soff:     boolean;
  cond:     boolean;
  condVpf:  boolean;   // ← nouveau
  admin:    boolean;
}

export interface CurrentUser {
  email: string;
  name: string;
  picture: string;
  agentIdx: number;
  agentName: string;
  isSoff: boolean;
  isCond: boolean;
  isAdmin: boolean;
}

export interface CellData {
  dispo: string;      // '', 'J', 'M', 'AM'
  affect: string;
  sheetRow: number;
  dispoCol: number;
  affectCol: number;
}

// cells[dayOffset][agentIdx]
export type CellMap = Record<number, Record<number, CellData>>;
export type GardeMap = Record<number, string>;

export interface AgentStats {
  gardes: number;
  dispos: number;
  rate: number;
}

// Stats issues de la feuille "Gestion 2026"
export interface AgentGestionStats {
  joursDispos: number;
  nbGardes: number;
  pctGarde: number;      // 0..1
  nbAstreintes: number;
  pctAstreinte: number;  // 0..1
  moyEquipe: number;     // moyenne équipe (référence)
  ecart: number;         // écart individuel par rapport à la moyenne
}

// agentName (lowercase) → AgentGestionStats
export type GestionMap = Record<string, AgentGestionStats>;

export type Tab = 'planning' | 'semaine' | 'equite' | 'dispos';
// Quotas par jour : offset → DayQuotas
// Importé depuis quotas.ts, ici juste le type de la map
export type QuotaMap = Record<number, import('./quotas').DayQuotas>;

// Référence colonne quota dans le sheet (colonne Dispo de la ligne Quotas)
export interface QuotaCell {
  sheetRow: number;  // numéro de ligne 1-indexé dans le sheet (row 3 = index 2)
  dispoCol: number;  // colonne où écrire la valeur quota du jour
}
export type QuotaCellMap = Record<number, QuotaCell>; // offset → QuotaCell

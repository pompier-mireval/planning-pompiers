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
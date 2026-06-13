import { CONFIG } from './config';
import { colLetter, parseSheetDate, daysBetween, SAISON_START, MAX_OFFSET } from './dateUtils';
import type { Agent, CellMap, GardeMap, GestionMap, AgentGestionStats } from './types';

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

let _accessToken = '';
let _tokenExpiry  = 0;

export function setAccessToken(token: string, expiresIn = 3400) {
  _accessToken = token;
  _tokenExpiry  = Date.now() + expiresIn * 1000;
}
export function clearAccessToken() { _accessToken = ''; _tokenExpiry = 0; }
export function hasAccessToken()   { return !!_accessToken && Date.now() < _tokenExpiry; }

export async function ensureAccessToken(email?: string): Promise<void> {
  if (hasAccessToken()) return;

  // Restaure depuis localStorage si encore valide
  const token  = localStorage.getItem('pp_token');
  const expiry = parseInt(localStorage.getItem('pp_token_expiry') || '0', 10);
  if (token && Date.now() < expiry) {
    setAccessToken(token, Math.floor((expiry - Date.now()) / 1000));
    return;
  }

  // Demande le token OAuth via popup (pas de redirect page entière)
  const { ensureOAuthToken } = await import('../hooks/useAuth');
  const hint = email || JSON.parse(localStorage.getItem('pp_user') || '{}').email || '';
  await ensureOAuthToken(hint);
}

async function sheetsGet(range: string): Promise<string[][]> {
  const url = `${BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?key=${CONFIG.API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Sheets GET error: ' + r.status);
  const d = await r.json();
  return d.values || [];
}

export async function sheetsUpdate(range: string, values: string[][]): Promise<void> {
  await ensureAccessToken();
  const url = `${BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + _accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error('Sheets PUT error: ' + JSON.stringify(err));
  }
}

let _agentsCache: Agent[] | null = null;

export async function loadAgents(): Promise<Agent[]> {
  if (_agentsCache) return _agentsCache;
  const rows = await sheetsGet(CONFIG.SHEETS.AGENTS + '!A2:E100');
  _agentsCache = rows
    .filter(r => r[0] && r[1])
    .map((r, i) => ({
      idx:   i,
      name:  r[0].trim(),
      email: (r[1] || '').trim().toLowerCase(),
      soff:  (r[2] || '').toUpperCase() === 'OUI',
      cond:  (r[3] || '').toUpperCase() === 'OUI',
      admin: (r[4] || '').toUpperCase() === 'OUI',
    }));
  return _agentsCache;
}

export async function findAgent(email: string): Promise<Agent | null> {
  const agents = await loadAgents();
  return agents.find(a => a.email === email.toLowerCase()) ?? null;
}

export async function loadSaisonData(): Promise<string[][]> {
  return sheetsGet(CONFIG.SHEETS.SAISON + '!A1:ZZ200');
}

/**
 * Charge la feuille "Gestion 2026".
 * Format attendu (ligne 1 = en-têtes) :
 *   A=Agent, B=S/off, C=Cond., D=Jours dispos, E=Nb gardes, F=% garde,
 *   G=Nb astreintes, H=% astreinte, I=Moy. équipe, J=Écart
 */
export async function loadGestionData(): Promise<GestionMap> {
  const rows = await sheetsGet(CONFIG.SHEETS.GESTION + '!A1:J200');
  const gestion: GestionMap = {};

  // Ignorer la ligne d'en-tête (row 0)
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[0] || '').trim();
    if (!name) continue;

    const parseNum = (v: string | undefined) => {
      if (!v) return 0;
      // Supprimer le signe % si présent et convertir
      const cleaned = v.replace('%', '').replace(',', '.').trim();
      return parseFloat(cleaned) || 0;
    };

    const pctGardeRaw   = parseNum(r[5]);
    const pctAstRaw     = parseNum(r[7]);

    const stats: AgentGestionStats = {
      joursDispos:   parseNum(r[3]),
      nbGardes:      parseNum(r[4]),
      // Si la valeur est déjà en % (ex: 25 pour 25%), diviser par 100
      pctGarde:      pctGardeRaw > 1 ? pctGardeRaw / 100 : pctGardeRaw,
      nbAstreintes:  parseNum(r[6]),
      pctAstreinte:  pctAstRaw > 1 ? pctAstRaw / 100 : pctAstRaw,
      moyEquipe:     parseNum(r[8]),
      ecart:         parseNum(r[9]),
    };

    gestion[name.toLowerCase()] = stats;
  }

  return gestion;
}

export function parseSaisonData(
  rows: string[][],
  agents: Agent[]
): { cells: CellMap; gardes: GardeMap } {
  const cells: CellMap  = {};
  const gardes: GardeMap = {};
  if (!rows || rows.length < 3) return { cells, gardes };

  const headerRow = rows[0] || [];
  const gardeRow  = rows[1] || [];
  const dayColMap: Record<number, { dispoCol: number; affectCol: number }> = {};

  for (let c = 1; c < headerRow.length; c += 2) {
    const d = parseSheetDate(headerRow[c]);
    if (!d) continue;
    const offset = daysBetween(SAISON_START, d);
    if (offset >= 0 && offset <= MAX_OFFSET) {
      dayColMap[offset] = { dispoCol: c + 1, affectCol: c + 2 };
      const gardeVal = (gardeRow[c] || gardeRow[c + 1] || '').trim();
      if (gardeVal) gardes[offset] = gardeVal;
    }
  }

  const agentStartRow = 3;
  const agentRowMap: Record<number, number> = {};
  for (let r = agentStartRow; r < rows.length; r++) {
    const rowName = (rows[r][0] || '').trim().toLowerCase();
    if (!rowName) continue;
    const agent = agents.find(a => a.name.toLowerCase() === rowName);
    if (agent) agentRowMap[agent.idx] = r + 1;
  }

  for (const [offsetStr, cols] of Object.entries(dayColMap)) {
    const offset = Number(offsetStr);
    cells[offset] = {};
    for (const agent of agents) {
      const sheetRow = agentRowMap[agent.idx];
      if (!sheetRow) continue;
      const dataRow = rows[sheetRow - 1] || [];
      cells[offset][agent.idx] = {
        dispo:     (dataRow[cols.dispoCol  - 1] || '').trim(),
        affect:    (dataRow[cols.affectCol - 1] || '').trim(),
        sheetRow,
        dispoCol:  cols.dispoCol,
        affectCol: cols.affectCol,
      };
    }
  }

  return { cells, gardes };
}

export async function saveCellValue(sheetRow: number, sheetCol: number, value: string): Promise<void> {
  const range = `${CONFIG.SHEETS.SAISON}!${colLetter(sheetCol)}${sheetRow}`;
  await sheetsUpdate(range, [[value]]);
}
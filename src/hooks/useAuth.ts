import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../lib/config';
import { findAgent, setAccessToken, clearAccessToken, hasAccessToken } from '../lib/sheets';
import type { CurrentUser } from '../lib/types';

declare const google: any;

function parseJwt(token: string) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

const USER_KEY        = 'pp_user';
const TOKEN_KEY       = 'pp_token';
const TOKEN_EXPIRY_KEY = 'pp_token_expiry';

// Restaure le token OAuth depuis localStorage si encore valide
function loadTokenFromStorage(): boolean {
  const token  = localStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);
  if (token && Date.now() < expiry) {
    setAccessToken(token, Math.floor((expiry - Date.now()) / 1000));
    return true;
  }
  return false;
}

// Sauvegarde le token OAuth après réception
function storeToken(resp: any): void {
  const expiresIn = parseInt(resp.expires_in || '3400', 10);
  const expiry    = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_KEY, resp.access_token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  setAccessToken(resp.access_token, expiresIn);
}

// Client OAuth réutilisable (évite de le recréer à chaque fois)
let _tokenClient: any = null;

function getTokenClient(email: string, resolve: () => void, reject: (e: Error) => void) {
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope:     'https://www.googleapis.com/auth/spreadsheets',
    login_hint: email,
    callback:  (resp: any) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      storeToken(resp);
      resolve();
    },
  });
  return _tokenClient;
}

// Demande le token sans interaction (silencieux) — avec timeout pour Safari ITP
function requestTokenSilent(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('NEED_USER_GESTURE')), 5000);
    const client = getTokenClient(email, () => { clearTimeout(timer); resolve(); }, (e) => { clearTimeout(timer); reject(e); });
    client.requestAccessToken({ prompt: '' });
  });
}

// Demande le token avec popup de consentement (doit être appelé dans un handler utilisateur synchrone)
export function requestTokenWithConsent(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = getTokenClient(email, resolve, reject);
    client.requestAccessToken({ prompt: 'consent' });
  });
}

export async function ensureOAuthToken(email: string): Promise<void> {
  if (hasAccessToken()) return;
  if (loadTokenFromStorage()) return;
  // Tentative silencieuse d'abord
  try {
    await requestTokenSilent(email);
  } catch {
    // Sur Safari, la tentative silencieuse échoue souvent.
    // On lève une erreur spéciale pour que l'appelant puisse
    // demander à l'utilisateur d'autoriser manuellement.
    throw new Error('NEED_USER_GESTURE');
  }
}

export function useAuth() {
  const [user, setUser]           = useState<CurrentUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const signOut = useCallback(() => {
    try { google.accounts.id.disableAutoSelect(); } catch (_) {}
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    clearAccessToken();
    setUser(null);
  }, []);

  const handleCredential = useCallback(async (response: any) => {
    const payload   = parseJwt(response.credential);
    const agentData = await findAgent(payload.email);
    if (!agentData) {
      alert('Accès refusé : ' + payload.email + " n'est pas dans la liste des agents.");
      return;
    }
    const newUser: CurrentUser = {
      email:     payload.email,
      name:      payload.name,
      picture:   payload.picture,
      agentIdx:  agentData.idx,
      agentName: agentData.name,
      isSoff:    agentData.soff,
      isCond:    agentData.cond,
      isAdmin:   agentData.admin,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);

    // Demande le token OAuth immédiatement après connexion (popup silencieuse)
    try {
      await ensureOAuthToken(payload.email);
    } catch (e) {
      console.warn('[auth] token OAuth différé:', e);
    }
  }, []);

  useEffect(() => {
    // Restaure le token OAuth si dispo
    loadTokenFromStorage();

    const script    = document.createElement('script');
    script.src      = 'https://accounts.google.com/gsi/client';
    script.async    = true;
    script.onload   = () => {
      google.accounts.id.initialize({
        client_id:   CONFIG.GOOGLE_CLIENT_ID,
        callback:    handleCredential,
        auto_select: false,
      });

      // Restaure la session utilisateur et recalcule agentIdx depuis la liste live
      const saved = localStorage.getItem(USER_KEY);
      if (saved) {
        const savedUser = JSON.parse(saved) as CurrentUser;
        // Recalcule agentIdx depuis la liste agents actuelle (protège contre les décalages de lignes)
        import('../lib/sheets').then(({ findAgent }) => {
          findAgent(savedUser.email).then(agentData => {
            const freshUser = agentData
              ? { ...savedUser, agentIdx: agentData.idx, agentName: agentData.name }
              : savedUser;
            setUser(freshUser);
            localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          }).catch(() => setUser(savedUser));
        });
        if (!hasAccessToken()) {
          ensureOAuthToken(savedUser.email).catch(() => {});
        }
      }

      setAuthReady(true);
      setLoading(false);

      setTimeout(() => {
        const btnEl = document.getElementById('google-signin-btn');
        if (btnEl) {
          google.accounts.id.renderButton(btnEl, {
            type: 'standard', theme: 'outline', size: 'large',
            text: 'signin_with', locale: 'fr', width: 280,
          });
        }
      }, 50);

      google.accounts.id.prompt();
    };
    document.head.appendChild(script);
  }, [handleCredential]);

  return { user, loading, authReady, signOut };
}
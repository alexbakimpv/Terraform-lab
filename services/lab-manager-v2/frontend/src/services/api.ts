import { User, LabInfo } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const TOKEN_KEY = 'access_token';
const DEBUG_LOG_ENDPOINT = 'http://127.0.0.1:7242/ingest/a9bcae53-107f-4811-adb3-fc2976060c09';

function debugLog(location: string, message: string, data: any, hypothesisId: string) {
  fetch(DEBUG_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'pre-fix',
    }),
  }).catch(() => {});
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as any),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // #region agent log
  debugLog('api.ts:apiFetch:request', 'API request', {
    path,
    method: opts.method || 'GET',
    hasToken: Boolean(token),
    apiBase: API_BASE,
  }, 'H1,H4');
  // #endregion

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 204) return {} as T;

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (e) {
    // #region agent log
    debugLog('api.ts:apiFetch:parseError', 'Failed to parse JSON response', {
      path,
      status: res.status,
      ok: res.ok,
      textSnippet: text?.slice(0, 200),
    }, 'H2');
    // #endregion
    throw e;
  }

  // #region agent log
  debugLog('api.ts:apiFetch:response', 'API response', {
    path,
    status: res.status,
    ok: res.ok,
  }, 'H1,H4');
  // #endregion

  if (!res.ok) {
    const msg = body?.detail || body?.message || `HTTP ${res.status}`;
    // #region agent log
    debugLog('api.ts:apiFetch:error', 'API error response', {
      path,
      status: res.status,
      message: msg,
    }, 'H1,H4');
    // #endregion
    throw new Error(msg);
  }

  return body as T;
}

function mapMeToUser(me: any): User {
  let role = me.role;
  if (role !== 'admin' && role !== 'student') {
    role = 'student';
  }
  const labId = me.lab_id ?? me.labId ?? '';
  const scenario = me.scenario_id ?? me.scenarioId ?? me.scenario ?? '';
  const sessionExpiry = me.session_expires_at ?? me.sessionExpiry ?? new Date().toISOString();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a9bcae53-107f-4811-adb3-fc2976060c09',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:mapMeToUser',message:'Mapping /me response to User',data:{raw_me: me, labId, sessionExpiry, session_expires_at: me.session_expires_at},hypothesisId:'H3A,H3B',timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion
  return { role: role as 'admin' | 'student', labId, scenario, sessionExpiry };
}

function mapLabToLabInfo(lab: any): LabInfo {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a9bcae53-107f-4811-adb3-fc2976060c09',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:mapLabToLabInfo',message:'Mapping lab response to LabInfo',data:{raw_lab: lab, victim_url: lab.victim_url, client_url: lab.client_url, status: lab.status},hypothesisId:'H1B,H2A,H4A',timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
  // #endregion
  return {
    victimUrl: lab.victim_url ?? lab.victimUrl,
    clientUrl: lab.client_url ?? lab.clientUrl,
    scenarioId: lab.scenario_id ?? lab.scenarioId,
    scenarioName: lab.scenario_name ?? lab.scenarioName,
    runbookUrl: lab.runbook_url ?? lab.runbookUrl,
    status: lab.status,
    imperva: {
      waf: lab.imperva?.waf,
      cert: lab.imperva?.cert,
      dns: lab.imperva?.dns,
    },
  };
}

export const ApiService = {
  login: async (email: string, password: string): Promise<User> => {
    const data = await apiFetch<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    return mapMeToUser(data.user);
  },

  logout: async (): Promise<void> => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) {}
    setToken(null);
  },

  getUserMe: async (): Promise<User> => {
    const me = await apiFetch<any>('/me');
    return mapMeToUser(me);
  },

  getLabInfo: async (): Promise<LabInfo> => {
    const lab = await apiFetch<any>('/labs/current');
    return mapLabToLabInfo(lab);
  },

  onboardImperva: async (cname: string, txt: string): Promise<{ success: boolean; message: string }> => {
    await apiFetch('/labs/current/imperva/onboard', {
      method: 'POST',
      body: JSON.stringify({ protected_cname: cname, txt_validation: txt || undefined }),
    });
    return { success: true, message: 'accepted' };
  },

  resetLab: async (): Promise<{ status: string }> => {
    await apiFetch('/labs/current/reset', { method: 'POST' });
    return { status: 'reset_initiated' };
  },

  extendSession: async (): Promise<{ newExpiry: string }> => {
    const resp = await apiFetch<any>('/labs/current/extend', {
      method: 'POST',
      body: JSON.stringify({ extend_minutes: 240 }),
    });
    return { newExpiry: resp.new_expiry ?? resp.session_expires_at ?? new Date().toISOString() };
  },

  inviteUser: async (email: string): Promise<{ success: boolean }> => {
    await apiFetch('/admin/participants/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { success: true };
  },

  inviteUsersBulk: async (participants: any[]): Promise<{ success: boolean; count: number; errors?: string[]; error_count?: number; emails_sent?: number }> => {
    const resp = await apiFetch<any>('/admin/participants/invite-bulk', {
      method: 'POST',
      body: JSON.stringify({ participants }),
    });
    return { 
      success: resp?.success ?? true, 
      count: resp?.count ?? participants.length,
      errors: resp?.errors,
      error_count: resp?.error_count,
      emails_sent: resp?.emails_sent
    };
  },

  getAllUsers: async (): Promise<any[]> => {
    const resp = await apiFetch<any>('/admin/participants');
    return resp.participants ?? [];
  },

  getAdmins: async (): Promise<any[]> => {
    const resp = await apiFetch<any>('/admin/admins');
    return resp.admins ?? [];
  },

  inviteAdmin: async (email: string): Promise<{ success: boolean }> => {
    await apiFetch('/admin/admins/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { success: true };
  },

  getAdminProfile: async (): Promise<any> => {
    return apiFetch('/admin/profile');
  },

  updateAdminProfile: async (data: any): Promise<void> => {
    await apiFetch('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getSystemAuditLogs: async (roleFilter?: string, search?: string): Promise<any[]> => {
    let url = '/admin/audit-logs?limit=50';
    if (roleFilter && roleFilter !== 'ALL') {
      url += `&role_filter=${encodeURIComponent(roleFilter)}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const resp = await apiFetch<any>(url);
    return resp.logs ?? [];
  },
};

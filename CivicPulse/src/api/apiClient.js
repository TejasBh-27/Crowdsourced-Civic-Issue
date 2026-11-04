/**
 * Real API Client — calls the Express backend at /api/v1
 * Auth: Dev-headers mode (x-user-id, x-user-role, x-user-name, x-user-phone)
 * Falls back gracefully if backend is not running.
 */

let currentUser = null;

export function setApiUser(user) {
  currentUser = user;
}

export function getApiHeaders(user = currentUser) {
  if (!user) return {};
  return {
    'x-user-id': user.id || 'CIT-4481',
    'x-user-role': user.role || 'citizen',
    'x-user-name': user.name || 'Ananya Sharma',
    'x-user-phone': user.phone || '9876543210',
  };
}

export async function apiGet(path, user = currentUser) {
  const res = await fetch(`/api/v1${path}`, {
    headers: getApiHeaders(user),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost(path, body, user = currentUser) {
  const res = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getApiHeaders(user) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPostForm(path, formData, user = currentUser) {
  const res = await fetch(`/api/v1${path}`, {
    method: 'POST',
    headers: getApiHeaders(user), // no Content-Type — browser sets multipart boundary
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkBackendHealth() {
  try {
    const res = await fetch('/api/v1/health', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export default { apiGet, apiPost, apiPostForm, setApiUser, getApiHeaders, checkBackendHealth };

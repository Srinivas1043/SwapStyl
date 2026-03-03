import Cookies from 'js-cookie';
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://swapstyl.onrender.com';

/**
 * Makes an authenticated API call to the backend.
 * Gracefully handles HTML error responses (e.g. cold-start 503 pages).
 */
async function apiCall(method: string, path: string, body?: any): Promise<any> {
  const token = Cookies.get('admin_token');

  // Refresh the Supabase session token if it's expired or missing
  let authToken = token;
  if (!authToken) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      authToken = data.session.access_token;
      Cookies.set('admin_token', authToken, { expires: 7 });
    }
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
  };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (e) {
    throw new Error(`Cannot reach backend at ${API_URL}. Make sure it is deployed and running.`);
  }

  // Safely parse JSON — avoids crash on HTML error pages (503, 502, etc.)
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Server error (${response.status}). The backend may be sleeping — wait 30s and retry.`);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.message || `Request failed (${response.status})`);
  }

  return data;
}

export { apiCall };

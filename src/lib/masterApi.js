// Fetches the live master lists + colour/size codes from the Google Apps
// Script Web App (see gas/Code.gs). No caching — every call hits the network.

// Set VITE_GAS_URL in a .env file, or fall back to the deployed URL from the
// project handoff.
export const GAS_URL =
  import.meta.env.VITE_GAS_URL ||
  'https://script.google.com/macros/s/AKfycbwOAGAmkZ3vs734UfT8KWCf5YnhAYA3YxjGWa9Xj-TfVxbM_FzxgMomvaLP47U0qklqhA/exec';

/**
 * @returns {Promise<{ masters: Record<string,string[]>, codes: { color: Record<string,string>, size: Record<string,string> } }>}
 */
export async function fetchMasterData() {
  const res = await fetch(GAS_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Master endpoint responded with ${res.status}`);
  }
  const json = await res.json();
  if (!json || json.ok === false) {
    throw new Error((json && json.error) || 'Master endpoint returned an error');
  }

  const masters = json.masters || {};
  const codes = json.codes || { color: {}, size: {} };

  // An empty UNIQE payload counts as unreachable — validation must never run
  // against a stale or partial master.
  if (!masters || Object.keys(masters).length === 0) {
    throw new Error('UNIQE sheet returned no columns');
  }

  return { masters, codes, meta: json.meta || null };
}

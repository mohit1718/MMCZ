import { KEY } from './constants';

export function loadDb() {
  try {
    const s = localStorage.getItem(KEY);
    if (s) {
      const d = JSON.parse(s);
      if (d && d.v === 4) return d;
    }
  } catch (e) {}
  return null;
}

export function saveDb(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {}
}

/**
 * Infrastruttura · Persistenza · adattatore su localStorage.
 * Sostituirlo con un adattatore HTTP verso un backend non richiede di toccare
 * ne' il dominio ne' i casi d'uso: cambia solo la riga del composition root.
 */
import { WorkspaceRepository } from '../../application/ports.js';

export class LocalStorageWorkspaceRepository extends WorkspaceRepository {
  constructor(prefix = 'verum:') { super(); this.prefix = prefix; }

  async load(key) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  async save(key, value) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); }
    catch { /* quota o modalita' privata: lo stato resta solo in memoria */ }
  }
  async remove(key) {
    try { localStorage.removeItem(this.prefix + key); } catch { /* ignorato */ }
  }
}

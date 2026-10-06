// Connexion pair-à-pair via PeerJS (chargé depuis le CDN : window.Peer).
// Le code du salon sert d'identifiant PeerJS (avec un préfixe propre au jeu).
const PREFIX = 'bastonnade-v3-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // ni O/0 ni I/1 (ni L)

export function makeCode(n = 5) {
  let s = '';
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  for (let i = 0; i < n; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return s;
}

export const normalizeCode = (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

const PEER_OPTS = { debug: 0 };

export class Net {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.handlers = new Map();
    this.ping = null;
    this.lastMsg = 0;
    this.closed = false;
    this.onClose = null;
    this.onGuest = null;
    this.pingTimer = null;
  }

  on(type, fn) { this.handlers.set(type, fn); }
  off(type) { this.handlers.delete(type); }

  send(msg) {
    if (this.conn && this.conn.open) {
      try { this.conn.send(msg); } catch { /* canal fermé */ }
    }
  }

  // --- hôte -------------------------------------------------------------
  static host(code) {
    const net = new Net();
    return new Promise((resolve, reject) => {
      if (!window.Peer) { reject(new Error('Bibliothèque réseau introuvable (pas d\'accès Internet ?).')); return; }
      let opened = false;
      const peer = new window.Peer(PREFIX + code, PEER_OPTS);
      net.peer = peer;
      peer.on('open', () => { opened = true; resolve(net); });
      peer.on('error', (err) => {
        if (!opened) {
          peer.destroy();
          reject(Object.assign(new Error(err.type === 'unavailable-id' ? 'Code déjà pris.' : 'Connexion au serveur impossible.'), { type: err.type }));
        }
      });
      peer.on('connection', (conn) => {
        if (net.conn) {
          conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 400); });
          return;
        }
        net.attach(conn);
        conn.on('open', () => {
          conn.send({ t: 'welcome' });
          net.startHeartbeat();
          if (net.onGuest) net.onGuest();
        });
      });
    });
  }

  // --- invité -----------------------------------------------------------
  static join(code) {
    const net = new Net();
    return new Promise((resolve, reject) => {
      if (!window.Peer) { reject(new Error('Bibliothèque réseau introuvable (pas d\'accès Internet ?).')); return; }
      let done = false;
      const fail = (msg) => {
        if (done) return;
        done = true; clearTimeout(timer);
        net.destroy();
        reject(new Error(msg));
      };
      const timer = setTimeout(() => fail('Connexion impossible : le salon ne répond pas.'), 12000);
      const peer = new window.Peer(PEER_OPTS);
      net.peer = peer;
      peer.on('open', () => {
        const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        net.attach(conn);
        net.on('welcome', () => {
          if (done) return;
          done = true; clearTimeout(timer);
          net.off('welcome'); net.off('full');
          net.startHeartbeat();
          resolve(net);
        });
        net.on('full', () => fail('Salon plein : deux joueurs y sont déjà.'));
        conn.on('error', () => fail('Connexion impossible.'));
      });
      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') fail('Code introuvable : vérifie le code du salon.');
        else if (!done) fail('Connexion impossible (réseau ou serveur indisponible).');
      });
    });
  }

  attach(conn) {
    this.conn = conn;
    this.lastMsg = performance.now();
    conn.on('data', (m) => {
      this.lastMsg = performance.now();
      if (!m || typeof m !== 'object') return;
      if (m.t === 'ping') { this.send({ t: 'pong', ts: m.ts }); return; }
      if (m.t === 'pong') {
        const rtt = performance.now() - m.ts;
        this.ping = this.ping == null ? rtt : this.ping * 0.8 + rtt * 0.2;
        return;
      }
      const h = this.handlers.get(m.t);
      if (h) h(m);
      else if (this.handlers.has('*')) this.handlers.get('*')(m);
    });
    conn.on('close', () => this.lost());
  }

  startHeartbeat() {
    clearInterval(this.pingTimer);
    this.lastMsg = performance.now();
    this.pingTimer = setInterval(() => {
      this.send({ t: 'ping', ts: performance.now() });
      if (performance.now() - this.lastMsg > 6000) this.lost();
    }, 500);
  }

  lost() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.pingTimer);
    if (this.onClose) this.onClose();
  }

  destroy() {
    this.closed = true;
    clearInterval(this.pingTimer);
    try { if (this.conn) this.conn.close(); } catch { /* ignoré */ }
    try { if (this.peer) this.peer.destroy(); } catch { /* ignoré */ }
  }
}

// Petits outils DOM pour les menus.
import { sfxPlay, initAudio } from '../audio/audio.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function button(label, onClick, cls = '') {
  const b = h('button', { class: `btn ${cls}` }, label);
  b.addEventListener('click', (e) => {
    initAudio();
    sfxPlay.ui(cls.includes('back') ? 'back' : 'click');
    onClick(e);
  });
  b.addEventListener('mouseenter', () => sfxPlay.ui('hover'));
  return b;
}

const root = () => document.getElementById('ui');

export function show(el) {
  root().replaceChildren(el);
  const first = el.querySelector('[autofocus]');
  if (first) setTimeout(() => first.focus(), 30);
}

export function clearUI() { root().replaceChildren(); }

export function overlay(el) {
  root().append(el);
  return () => el.remove();
}

export function panel(title, ...children) {
  return h('div', { class: 'panel' }, title ? h('h2', {}, title) : null, ...children);
}

export function compactPanel(title, ...children) {
  const p = panel(title, ...children);
  p.classList.add('compact');
  return p;
}

export function screen(cls, ...children) {
  return h('div', { class: `screen ${cls || ''}` }, ...children);
}

let toastTimer = null;
export function toast(msg, ms = 3200, kind = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${kind}`;
  clearTimeout(toastTimer);
  if (ms > 0) toastTimer = setTimeout(() => { t.className = ''; }, ms);
}

export function hideToast() { document.getElementById('toast').className = ''; }

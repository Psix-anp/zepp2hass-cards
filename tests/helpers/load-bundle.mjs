import fs from 'node:fs';
import vm from 'node:vm';

export function loadBundle({ now, sources = [] } = {}) {
  const registry = new Map();
  class HTMLElement {
    constructor() { this.innerHTML = ''; this.dataset = {}; }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    addEventListener() {}
    dispatchEvent() { return true; }
  }
  const ctx = {
    console, HTMLElement,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    customElements: { define(name, klass) { registry.set(name, klass); }, get(name) { return registry.get(name); } },
    window: { customCards: [] },
    document: { createElement(name) { const C = registry.get(name); return C ? new C() : { tagName: name }; } },
    navigator: { language: 'ru-RU' },
    Date: now ? class extends Date {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return Date.parse(now); }
    } : Date,
    Intl, Math, Number, String, Array, Object, Map, Set, WeakMap, RegExp, Promise,
    URL, structuredClone, setTimeout, clearTimeout,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const file of ['src/core.js', 'src/optional-shared.js', ...sources]) {
    vm.runInContext(fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8'), ctx, { filename: file });
  }
  return { ctx, registry };
}

// Optional sections share a single render adapter and preserve the base controls.
const z2hOptionalCards = new WeakMap();
const z2hOptionalEditors = new WeakMap();

function z2hRegisterOptionalFeature(feature) {
  if (!feature || !/^[a-z0-9-]+$/.test(feature.id)) throw new Error('Invalid optional feature id');
  for (const Card of feature.cards || []) {
    let features = z2hOptionalCards.get(Card);
    if (!features) {
      features = [];
      z2hOptionalCards.set(Card, features);
      const original = Card.prototype.render;
      Card.prototype.render = function (...args) {
        const generation = this._z2hOptionalGeneration = (this._z2hOptionalGeneration || 0) + 1;
        for (const section of this.querySelectorAll?.('[data-z2h-optional]') || []) section.remove();
        const result = original.apply(this, args);
        if (!this._hass || !this.config || !this.innerHTML.includes('</ha-card>')) return result;
        const sections = [];
        for (const item of features) {
          const content = item.render?.(this) || '';
          // Some existing history loaders synchronously trigger a newer render.
          if (this._z2hOptionalGeneration !== generation) return result;
          if (content) sections.push(`<section data-z2h-optional="${item.id}">${content}</section>`);
        }
        const html = sections.join('');
        if (html) {
          const root = this.querySelector?.('ha-card');
          if (root?.insertAdjacentHTML) root.insertAdjacentHTML('beforeend', html);
          else this.innerHTML = this.innerHTML.replace('</ha-card>', `${html}</ha-card>`);
        }
        for (const item of features) {
          if (this._z2hOptionalGeneration !== generation) break;
          item.wire?.(this);
        }
        return result;
      };
    }
    if (features.some(item => item.id === feature.id)) throw new Error('Duplicate optional feature');
    features.push(feature);
  }
  for (const Editor of feature.editors || []) {
    let features = z2hOptionalEditors.get(Editor);
    if (!features) {
      features = [];
      z2hOptionalEditors.set(Editor, features);
      const originalContent = Editor.prototype.renderContent;
      const originalAfter = Editor.prototype.afterRender;
      Editor.prototype.renderContent = function (...args) {
        return originalContent.apply(this, args) + features.map(item => item.editor?.(this) || '').join('');
      };
      Editor.prototype.afterRender = function (...args) {
        originalAfter?.apply(this, args);
        for (const item of features) item.editorWire?.(this);
      };
    }
    if (features.some(item => item.id === feature.id)) throw new Error('Duplicate optional editor feature');
    features.push(feature);
  }
}

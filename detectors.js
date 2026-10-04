(() => {
  'use strict';
  // API adapters for the public BlockAdBlock / FuckAdBlock callback interface.
  // Each instance keeps its own callback list; callbacks remain asynchronous.
  function CompatibleDetector(options) {
    this._options = {resetOnEnd: false, ...options};
    this._clearCallbacks = [];
    this._scheduled = false;
  }
  CompatibleDetector.prototype.setOption = function (name, value) {
    if (name && typeof name === 'object') Object.assign(this._options, name);
    else this._options[name] = value;
    return this;
  };
  CompatibleDetector.prototype.on = function (detected, callback) {
    if (!detected && typeof callback === 'function') {
      this._clearCallbacks.push(callback);
      this.check();
    }
    return this;
  };
  CompatibleDetector.prototype.onDetected = function (callback) { return this.on(true, callback); };
  CompatibleDetector.prototype.onNotDetected = function (callback) { return this.on(false, callback); };
  CompatibleDetector.prototype.clearEvent = function () { this._clearCallbacks.length = 0; return this; };
  CompatibleDetector.prototype.check = function () {
    if (this._scheduled) return true;
    this._scheduled = true;
    setTimeout(() => {
      this._scheduled = false;
      const callbacks = this._clearCallbacks.slice();
      if (this._options.resetOnEnd) this.clearEvent();
      for (const callback of callbacks) {
        try { callback.call(this); } catch (error) { console.error(error); }
      }
    }, 0);
    return true;
  };
  CompatibleDetector.prototype.emitEvent = function (detected) { if (!detected) this.check(); return this; };
  for (const name of ['BlockAdBlock', 'FuckAdBlock', 'blockAdBlock', 'fuckAdBlock']) {
    // Avoid replacing non-configurable properties or unrelated existing values.
    if (Object.getOwnPropertyDescriptor(window, name)) continue;
    const value = /^[A-Z]/.test(name) ? CompatibleDetector : new CompatibleDetector();
    Object.defineProperty(window, name, { configurable: true, enumerable: true, get: () => value, set: () => {} });
  }
})();

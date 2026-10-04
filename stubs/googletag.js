(() => {
  'use strict';
  // Inert stand-in for the GPT API: callbacks and slot bookkeeping stay local.
  // No creative, ad request, click, impression or advertising lifecycle event is generated.
  if (window.googletag && window.googletag.apiReady) return;
  const previous = window.googletag && window.googletag.cmd;
  const queued = Array.isArray(previous) ? previous.slice() : [];
  const chain = new Proxy(function () {}, {
    get: (target, key) => key === Symbol.toPrimitive ? () => '' : key === 'then' ? undefined : chain,
    apply: () => chain,
    construct: () => chain
  });
  const slots = new Set();
  const services = new WeakMap();
  const adapter = methods => new Proxy(methods, {
    get: (target, key) => Object.hasOwn(target, key) ? target[key] : key === 'then' ? undefined : chain
  });
  function targeting() {
    const values = new Map();
    return {
      setTargeting(key, value) { values.set(String(key), (Array.isArray(value) ? value : [value]).map(String)); return this; },
      getTargeting: key => (values.get(String(key)) || []).slice(),
      getTargetingKeys: () => [...values.keys()],
      clearTargeting(key) { if (key === undefined) values.clear(); else values.delete(String(key)); return this; }
    };
  }
  function service() {
    const result = adapter({
      ...targeting(),
      getSlots: () => [...slots].filter(slot => services.get(slot).has(result)),
      getAttributeKeys: () => [],
      addEventListener() { return this; },
      removeEventListener() { return this; },
      refresh() {},
      get: () => null
    });
    return result;
  }
  const pubads = service(), companion = service(), content = service();
  function defineSlot(path, sizes, elementId) {
    const associated = new Set();
    const slot = adapter({
      ...targeting(),
      addService(value) { associated.add(value); return this; },
      getServices: () => [...associated],
      getAdUnitPath: () => String(path),
      getSlotElementId: () => typeof elementId === 'string' ? elementId : '',
      getResponseInformation: () => null,
      getAttributeKeys: () => [],
      get: () => null
    });
    services.set(slot, associated);slots.add(slot);return slot;
  }
  const api = {
    apiReady: true,
    pubadsReady: true,
    cmd: {
      push(...tasks) {
        for (const task of tasks) {
          try { if (typeof task === 'function') task.call(window); } catch (error) { console.error(error); }
        }
        return tasks.length;
      }
    },
    pubads: () => pubads,
    companionAds: () => companion,
    content: () => content,
    sizeMapping() {
      const sizes=[];
      return {addSize(viewport, adSizes) { sizes.push([viewport,adSizes]);return this; },build: () => sizes.slice()};
    },
    defineSlot,
    defineOutOfPageSlot: (path, elementId) => defineSlot(path, [], elementId),
    enableServices() {},
    display() {},
    destroySlots(values) { for (const slot of values || slots) slots.delete(slot);return true; },
    getVersion: () => '0'
  };
  window.googletag = api;
  api.cmd.push(...queued);
})();

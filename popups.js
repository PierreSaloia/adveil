(() => {
  'use strict';
  const nativeOpen = window.open;
  const now = performance.now.bind(performance);
  let gesture = null;
  const namedWindows = new Map();
  const navigationTarget = target => ['_self', '_top', '_parent'].includes(target.toLowerCase()) || (target && target.toLowerCase() !== '_blank' && target === window.name);
  function existingTarget(name) {
    const opened = namedWindows.get(name);
    if (!opened) return false;
    try { if (!opened.window.closed && now() - opened.time < 15000) return true; } catch { /* stale window */ }
    namedWindows.delete(name); return false;
  }
  function record(event) {
    if (!event.isTrusted || (event.type === 'keydown' && (event.repeat || !['Enter', ' '].includes(event.key)))) return;
    const path = event.composedPath();
    const control = path.find(node => node instanceof Element && node.matches('a[href],area[href],button,input,select,textarea,[role="button"],[role="link"]'));
    if (!control) { gesture = null; return; }
    // A pointerdown and the ensuing click are a single gesture, not two popup allowances.
    if (event.type !== 'pointerdown' && gesture?.control === control && now() - gesture.time < 1800) return;
    let expected = null;
    if (control.matches('a[href],area[href]')) {
      try { const u = new URL(control.href, location.href); if (/^https?:$/.test(u.protocol)) expected = u.href; } catch { /* javascript buttons have no link destination */ }
    }
    gesture = {control, expected, time: now(), used: false};
  }
  for (const type of ['pointerdown', 'click', 'auxclick', 'keydown']) window.addEventListener(type, record, true);
  function permit(url) {
    if (!navigator.userActivation?.isActive || !gesture || gesture.used || now() - gesture.time > 1800) return false;
    if (gesture.expected && url !== gesture.expected) return false;
    gesture.used = true;
    return true;
  }
  const guardedOpen = new Proxy(nativeOpen, {
    apply(target, receiver, args) {
      const url = args[0] === undefined || args[0] === '' ? 'about:blank' : new URL(String(args[0]), location.href).href;
      const name = args[1] === undefined ? '_blank' : String(args[1]);
      // Keep in-place navigation and genuine link redirects working.
      if (navigationTarget(name) || existingTarget(name)) return Reflect.apply(target, receiver, args);
      if (!permit(url)) return null;
      const opened = Reflect.apply(target, receiver, args);
      if (opened && name && name.toLowerCase() !== '_blank') {
        if (namedWindows.size >= 16) namedWindows.delete(namedWindows.keys().next().value);
        namedWindows.set(name, {window: opened, time: now()});
      }
      return opened;
    }
  });
  const descriptor = Object.getOwnPropertyDescriptor(window, 'open');
  Object.defineProperty(window, 'open', {...descriptor, value: guardedOpen});
  function checkLink(event) {
    const link = event.composedPath().find(node => node instanceof Element && node.matches('a[href],area[href]'));
    if (!link) return;
    const target = link.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target') || '_self';
    if (navigationTarget(target)) return;
    // Real clicks keep the browser's normal new-tab behavior, including Ctrl and middle click.
    // Programmatic click() cannot create a tab unless a real control was just activated.
    if (!event.isTrusted && !permit(link.href)) event.preventDefault();
  }
  window.addEventListener('click', checkLink, true);
  window.addEventListener('auxclick', checkLink, true);
  // form.submit() bypasses submit events, so protect both the method and synthetic requests.
  const nativeSubmit = HTMLFormElement.prototype.submit;
  // Keep the original API string representations when the camouflage layer is also present.
  const originalToString = Function.prototype.toString;
  const masked = new WeakMap([[guardedOpen, Reflect.apply(originalToString, nativeOpen, [])]]);
  function formTarget(form, submitter) {
    return submitter?.getAttribute('formtarget') || form.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target') || '_self';
  }
  const guardedSubmit = new Proxy(nativeSubmit, {
    apply(target, form, args) {
      if (form instanceof HTMLFormElement && !navigationTarget(formTarget(form)) && !existingTarget(formTarget(form)) && !permit(form.action)) return;
      return Reflect.apply(target, form, args);
    }
  });
  HTMLFormElement.prototype.submit = guardedSubmit;
  masked.set(guardedSubmit, Reflect.apply(originalToString, nativeSubmit, []));
  const toString = {toString() { return masked.has(this) ? masked.get(this) : Reflect.apply(originalToString, this, []); }}.toString;
  masked.set(toString, Reflect.apply(originalToString, originalToString, []));
  Object.defineProperty(Function.prototype, 'toString', {value: toString, writable: true, configurable: true});
  window.addEventListener('submit', event => {
    if (event.target instanceof HTMLFormElement && !navigationTarget(formTarget(event.target, event.submitter)) && !existingTarget(formTarget(event.target, event.submitter)) && !permit(event.target.action)) event.preventDefault();
  }, true);
})();

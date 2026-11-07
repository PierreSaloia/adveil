import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {normalize, networkRules, sushiRules} from '../settings.js';

test('sushiRules generates rules and respects pauses', () => {
  const base = normalize({});
  const rules = sushiRules(base);
  assert.equal(rules.length, 4);

  const blockRule = rules.find(r => r.action.type === 'block');
  assert.equal(blockRule.id, 200);
  assert.deepEqual(blockRule.condition.initiatorDomains, ['sushianimes.com.br']);
  assert.equal(blockRule.condition.domainType, 'thirdParty');

  const aabcRedirect = rules.find(r => r.id === 203);
  assert.equal(aabcRedirect.action.type, 'redirect');
  assert.equal(aabcRedirect.action.redirect.extensionPath, '/stubs/antiadblockcore.js');

  const wingsmobRedirect = rules.find(r => r.id === 201);
  assert.equal(wingsmobRedirect.action.redirect.extensionPath, '/stubs/noop.js');

  assert.equal(sushiRules(normalize({disabledHosts: ['sushianimes.com.br']})).length, 0);
  assert.equal(sushiRules(normalize({ads: false})).length, 0);
  assert.equal(sushiRules(normalize({enabled: false})).length, 0);

  const all = networkRules(base);
  assert.ok(all.some(r => r.id === 200));
  assert.equal(new Set(all.map(r => r.id)).size, all.length);
});

test('antiadblockcore stub reports not detected without network', async () => {
  await access(new URL('../stubs/antiadblockcore.js', import.meta.url));
  const source = await readFile(new URL('../stubs/antiadblockcore.js', import.meta.url), 'utf8');
  let dispatched = null;
  const window = {
    dispatchEvent: e => { dispatched = e; }
  };
  function CustomEvent(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
  runInNewContext(source, { window, CustomEvent });
  assert.ok(window.AABC_DETECTION);
  assert.equal(window.AABC_DETECTION.detected, false);
  assert.ok(dispatched);
  assert.equal(dispatched.type, 'aabc:detection');
  assert.equal(dispatched.detail.detected, false);
});

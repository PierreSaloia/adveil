import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { DEFAULTS, otakulogiaRules, networkRules, isAdvertisingURL } from '../settings.js';

test('otakulogiaRules blocks third-party trackers and neutralizes ExoClick scripts', () => {
  const rules = otakulogiaRules(DEFAULTS);
  assert.equal(rules.length, 4);
  assert.deepEqual(rules.map(r => r.id), [210, 211, 212, 213]);

  const blockRule = rules.find(r => r.id === 210);
  assert.equal(blockRule.action.type, 'block');
  assert.deepEqual(blockRule.condition.initiatorDomains, ['otakulogia.com']);
  assert.ok(blockRule.condition.excludedRequestDomains.includes('classotaku.app'));
  assert.ok(blockRule.condition.excludedRequestDomains.includes('gigaclass.top'));
  assert.ok(blockRule.condition.excludedRequestDomains.includes('thetvdb.com'));
  assert.ok(blockRule.condition.excludedRequestDomains.includes('anilist.co'));
  assert.ok(blockRule.condition.excludedRequestDomains.includes('myanimelist.net'));
  assert.ok(blockRule.condition.excludedResourceTypes.includes('media'));
  assert.ok(blockRule.condition.excludedResourceTypes.includes('image'));
  assert.ok(blockRule.condition.excludedResourceTypes.includes('xmlhttprequest'));
  assert.ok(!blockRule.condition.excludedRequestDomains.includes('google-analytics.com'));
  assert.ok(!blockRule.condition.excludedRequestDomains.includes('facebook.com'));

  const trackerRule = rules.find(r => r.id === 213);
  assert.equal(trackerRule.action.type, 'block');
  assert.ok(trackerRule.condition.requestDomains.includes('google-analytics.com'));
  assert.ok(trackerRule.condition.requestDomains.includes('facebook.com'));
  assert.ok(trackerRule.condition.requestDomains.includes('magsrv.com'));

  const magsrvRule = rules.find(r => r.id === 211);
  assert.equal(magsrvRule.action.redirect.extensionPath, '/stubs/noop.js');
  assert.equal(magsrvRule.condition.urlFilter, '||magsrv.com/*');

  const pemsrvRule = rules.find(r => r.id === 212);
  assert.equal(pemsrvRule.action.redirect.extensionPath, '/stubs/noop.js');
  assert.equal(pemsrvRule.condition.urlFilter, '||pemsrv.com/*');

  assert.equal(otakulogiaRules({ ...DEFAULTS, disabledHosts: ['otakulogia.com'] }).length, 0);
  assert.ok(networkRules(DEFAULTS).some(r => r.id === 210));
  assert.equal(isAdvertisingURL('https://a.magsrv.com/ad-provider.js'), true);
  assert.equal(isAdvertisingURL('https://a.pemsrv.com/pop.js'), true);
});

test('compat.js blocks watch-time counters, rotates visitor IDs, and anonymizes GraphQL on otakulogia.com', async () => {
  const compatCode = await readFile(new URL('../compat.js', import.meta.url), 'utf8');

  class FakeStorage {
    constructor(initial = {}) {
      this._map = new Map(Object.entries(initial));
    }
    getItem(key) {
      return this._map.has(String(key)) ? this._map.get(String(key)) : null;
    }
    setItem(key, value) {
      this._map.set(String(key), String(value));
    }
    removeItem(key) {
      this._map.delete(String(key));
    }
  }

  const localStore = new FakeStorage({
    otk_local_daily_watch: JSON.stringify({ date: '2026-11-06', seconds: 3599 }),
    otk_delayed_vip_play_used: '1',
    otk_visitor_id: 'v_persistent_123',
    otakulogia_visitor_id: 'uuid-persistent-456'
  });
  const sessionStore = new FakeStorage({
    otk_soft_play_episode_count: '5',
    otk_soft_play_last_episode: '34252:1'
  });

  const networkCalls = [];
  const baseFetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const body = init?.body ? JSON.parse(init.body) : null;
    networkCalls.push({ url, body });

    if (body?.operationName === 'AppSettings') {
      return new Response(JSON.stringify({
        data: {
          appSettings: {
            __typename: 'AppSettingsEntity',
            forcePaywall: true,
            forcePaywallAfterOneEpisode: true,
            forcePaywallAfterThreeEpisodes: true,
            adsEnabled: true,
            playLinkOnPlayEnabled: true,
            guestAnimeLinkEnabled: true
          }
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (body?.operationName === 'SingleVideo') {
      return new Response(JSON.stringify({
        data: {
          SingleVideo: [{ video_id: '1', url: 'https://nsrv.classotaku.app/file/classgg/4692/1.mp4' }]
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  };

  let beaconSent = false;
  const documentElement = { dataset: {} };
  const windowObj = {
    location: { hostname: 'otakulogia.com' },
    Storage: FakeStorage,
    localStorage: localStore,
    sessionStorage: sessionStore,
    Response,
    fetch: baseFetch,
    navigator: {
      sendBeacon() {
        beaconSent = true;
        return true;
      }
    },
    document: {
      documentElement,
      getElementById() { return null; },
      createElement() { return { style: {}, remove() {} }; }
    },
    Node: { prototype: { appendChild(c) { return c; } } },
    addEventListener() {}
  };
  windowObj.window = windowObj;
  windowObj.globalThis = windowObj;

  vm.runInNewContext(compatCode, windowObj);

  // 1. Storage counters are wiped and frozen at 0
  const watchCounter = JSON.parse(windowObj.localStorage.getItem('otk_local_daily_watch'));
  assert.equal(watchCounter.seconds, 0);
  windowObj.localStorage.setItem('otk_local_daily_watch', JSON.stringify({ date: '2026-11-06', seconds: 3600 }));
  assert.equal(JSON.parse(windowObj.localStorage.getItem('otk_local_daily_watch')).seconds, 0);

  assert.equal(windowObj.localStorage.getItem('otk_delayed_vip_play_used'), null);
  windowObj.localStorage.setItem('otk_delayed_vip_play_used', '1');
  assert.equal(windowObj.localStorage.getItem('otk_delayed_vip_play_used'), null);

  assert.equal(windowObj.sessionStorage.getItem('otk_soft_play_episode_count'), null);
  windowObj.sessionStorage.setItem('otk_soft_play_episode_count', '5');
  assert.equal(windowObj.sessionStorage.getItem('otk_soft_play_episode_count'), null);

  // 2. Visitor IDs are ephemeral per session (never persisted to storage)
  const id1 = windowObj.localStorage.getItem('otk_visitor_id');
  const id2 = windowObj.localStorage.getItem('otk_visitor_id');
  assert.notEqual(id1, 'v_persistent_123');
  assert.equal(id1, id2);
  assert.equal(localStore._map.has('otk_visitor_id'), false);

  // 3. Anonymous VIP session user is provided when unauthenticated
  const anonUser = JSON.parse(windowObj.localStorage.getItem('otakulogia:user'));
  assert.equal(anonUser.id, 'anon');
  assert.equal(anonUser.isVip, true);

  // 4. TrackActivity, RecordWatchTime, DailyWatchTime, WatchPlayGate never hit the network
  const trackRes = await (await windowObj.fetch('https://api.otakulogia.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      operationName: 'TrackActivity',
      query: 'mutation TrackActivity($input: TrackActivityInput!) { trackActivity(input: $input) }',
      variables: { input: { action: 'WATCH', visitorId: 'v1' } }
    })
  })).json();
  assert.equal(trackRes.data.trackActivity, true);

  const watchTimeRes = await (await windowObj.fetch('https://api.otakulogia.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      operationName: 'RecordWatchTime',
      query: 'mutation RecordWatchTime($input: RecordWatchTimeInput!) { recordWatchTime(input: $input) { secondsWatched limitReached isVip } }',
      variables: { input: { seconds: 15, visitorId: 'v1' } }
    })
  })).json();
  assert.equal(watchTimeRes.data.recordWatchTime.secondsWatched, 0);
  assert.equal(watchTimeRes.data.recordWatchTime.limitReached, false);
  assert.equal(watchTimeRes.data.recordWatchTime.isVip, true);

  const gateRes = await (await windowObj.fetch('https://api.otakulogia.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      operationName: 'WatchPlayGate',
      query: 'query WatchPlayGate($upstreamEpisodeId: Int) { requiresVipToWatch(upstreamEpisodeId: $upstreamEpisodeId) shouldShowSoftPlayPaywall }'
    })
  })).json();
  assert.equal(gateRes.data.requiresVipToWatch, false);
  assert.equal(gateRes.data.shouldShowSoftPlayPaywall, false);

  const meRes = await (await windowObj.fetch('https://api.otakulogia.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      operationName: 'Me',
      query: 'query Me { me { id isVip } }'
    })
  })).json();
  assert.equal(meRes.data.me.id, 'anon');
  assert.equal(meRes.data.me.isVip, true);

  assert.equal(networkCalls.length, 0);

  // 5. Outgoing SingleVideo rotates visitorId; AppSettings neutralizes paywalls/ads
  await windowObj.fetch('https://api.otakulogia.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      operationName: 'SingleVideo',
      query: 'query SingleVideo($input: SingleVideoInput!) { SingleVideo(input: $input) }',
      variables: { input: { videoId: '1', visitorId: 'v_static_fingerprint' } }
    })
  });
  assert.equal(networkCalls.length, 1);
  assert.notEqual(networkCalls[0].body.variables.input.visitorId, 'v_static_fingerprint');

  const settingsRes = await (await windowObj.fetch('https://api.otakulogia.com/graphql', {
    method: 'POST',
    body: JSON.stringify({
      operationName: 'AppSettings',
      query: 'query AppSettings { appSettings { forcePaywall adsEnabled } }'
    })
  })).json();
  assert.equal(settingsRes.data.appSettings.forcePaywall, false);
  assert.equal(settingsRes.data.appSettings.adsEnabled, false);
  assert.equal(settingsRes.data.appSettings.playLinkOnPlayEnabled, false);

  // 6. Beacons to analytics/Firebase are blocked
  windowObj.navigator.sendBeacon('https://region1.google-analytics.com/g/collect', 'data');
  assert.equal(beaconSent, false);
  assert.equal(documentElement.dataset.exoclickDisplayAds, '0');

  // 7. Synthetic ANON_TOKEN is provided locally for immediate verified VIP session
  const anonToken = windowObj.localStorage.getItem('otakulogia_access_token');
  assert.ok(anonToken.startsWith('eyJ'));
});

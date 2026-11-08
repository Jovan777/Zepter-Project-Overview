import test from 'node:test';
import assert from 'node:assert/strict';
import {observeWorkspaceMotion, indicatorBox, nativeMotionAvailable, watchMotionPreference} from '../src/features/workspace/pageMotion.js';

function fixture() {
  let mutation, resize, preferenceListener, next = 0, disconnected = 0;
  const frames = new Map(), listeners = new Map(), elements = [], groups = [];
  const host = {scrollX: 0, scrollY: 0,
    requestAnimationFrame: cb => {const id = ++next; frames.set(id, cb); return id;}, cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class {constructor(cb) {mutation = cb;} observe() {} disconnect() {disconnected++;}},
    ResizeObserver: class {constructor(cb) {resize = cb;} observe() {} disconnect() {disconnected++;}},
    getComputedStyle: element => ({position: element.position || 'static', backgroundImage: 'none', backgroundColor: '#fff2d9'}),
    addEventListener: (type, cb) => listeners.set(type, cb), removeEventListener: type => listeners.delete(type),
  };
  const preference = {matches: false, addEventListener: (_type, cb) => {preferenceListener = cb;}, removeEventListener: () => {preferenceListener = null;}};
  const main = {ownerDocument: {defaultView: host}, closest: () => main,
    querySelector: () => null,
    querySelectorAll: selector => selector.includes('.employee-filter-tabs') ? groups : elements,
    addEventListener: (type, cb) => listeners.set('shell:' + type, cb), removeEventListener: type => listeners.delete('shell:' + type),
  };
  const node = (top = 0) => {
    const calls = [], animations = [];
    return {calls, animations, top, visible: true,
      getClientRects() {return this.visible ? [{}] : [];}, getBoundingClientRect() {return {top: this.top, left: 0, width: 200, height: 90};},
      animate(keyframes, timing) {
        calls.push({keyframes, timing}); let complete;
        const animation = {cancelled: false, finished: new Promise(resolve => {complete = resolve;}), cancel() {this.cancelled = true; complete();}, finish() {complete();}};
        animations.push(animation); return animation;
      },
    };
  };
  return {host, main, preference, elements, groups, listeners, node,
    mutate: records => mutation(records || []), resize: () => resize(),
    flush() {const batch = [...frames.values()]; frames.clear(); for (const cb of batch) cb();},
    reduce() {preference.matches = true; preferenceListener();},
    get pendingFrames() {return frames.size;}, get disconnected() {return disconnected;}, get preferenceListener() {return preferenceListener;},
  };
}

test('Real cards arriving after the initial loading state receive a visible entrance', () => {
  const f = fixture(), controller = observeWorkspaceMotion(f.main, f.preference);
  f.flush(); assert.equal(f.elements.length, 0);
  const card = f.node(); f.elements.push(card); f.mutate(); f.flush();
  assert.equal(card.calls.length, 1);
  assert.equal(card.calls[0].keyframes[0].opacity, 0);
  assert.ok(card.calls[0].keyframes[0].transform.includes('translateY'));
  assert.ok(card.calls[0].timing.duration >= 300);
  controller.destroy();
});
test('Typing, repeated data signals and initial resize observation do not restart the same card entrance', () => {
  const f = fixture(), card = f.node(); f.elements.push(card);
  const controller = observeWorkspaceMotion(f.main, f.preference); f.flush();
  f.mutate(); f.mutate(); f.resize(); assert.equal(f.pendingFrames, 1); f.flush();
  assert.equal(card.calls.length, 1); assert.equal(card.animations[0].cancelled, false);
  controller.destroy();
});
test('Native route transitions defer the loaded-card entrance until their snapshots finish', () => {
  const f = fixture(), card = f.node(); f.elements.push(card); let native = true;
  const controller = observeWorkspaceMotion(f.main, f.preference, {nativeActive: () => native}); f.flush();
  assert.equal(card.calls.length, 0);
  native = false; controller.refresh(); f.flush(); assert.equal(card.calls.length, 1);
  controller.destroy();
});
test('Reduced motion cancels active effects and leaves newly loaded content immediately available', () => {
  const f = fixture(), card = f.node(); f.elements.push(card);
  const controller = observeWorkspaceMotion(f.main, f.preference); f.flush(); f.reduce();
  assert.equal(card.animations[0].cancelled, true);
  const next = f.node(100); f.elements.push(next); f.mutate(); f.flush();
  assert.equal(next.calls.length, 0);
  controller.destroy(); assert.equal(f.preferenceListener, null);
});
test('Hidden panels remain untouched and cleanup disconnects observers and pending work', () => {
  const f = fixture(), card = f.node(); card.visible = false; f.elements.push(card);
  const controller = observeWorkspaceMotion(f.main, f.preference); f.flush(); assert.equal(card.calls.length, 0);
  card.visible = true; f.mutate(); f.flush(); assert.equal(card.calls.length, 1);
  f.mutate(); controller.destroy(); f.flush();
  assert.equal(f.disconnected, 2); assert.equal(f.pendingFrames, 0); assert.equal(f.listeners.size, 0); assert.ok(card.animations[0].cancelled);
});
test('Reordered cards move from their previous position without replacing their content', async () => {
  const f = fixture(), card = f.node(); f.elements.push(card);
  const controller = observeWorkspaceMotion(f.main, f.preference); f.flush();
  card.animations[0].finish(); await Promise.resolve(); f.flush();
  card.top = 80; f.mutate(); f.flush();
  assert.equal(card.calls.length, 2); assert.match(card.calls[1].keyframes[0].transform, /-80px/);
  assert.equal(f.elements[0], card); controller.destroy();
});
test('An open dialog prevents background content moving while the user makes a decision', () => {
  const f = fixture(), card = f.node(); f.elements.push(card); f.main.querySelector = () => ({});
  const controller = observeWorkspaceMotion(f.main, f.preference); f.flush();
  assert.equal(card.calls.length, 0); controller.destroy();
});
test('Selection indicator geometry accounts for wrapped rows, borders and horizontal scrolling', () => {
  const group = {getBoundingClientRect: () => ({left: 50, top: 100}), scrollLeft: 60, scrollTop: 0, clientLeft: 1, clientTop: 1};
  const selected = {getBoundingClientRect: () => ({left: 110, top: 150, width: 100, height: 44})};
  assert.deepEqual(indicatorBox(group, selected), {x: 119, y: 49, width: 100, height: 44});
});
test('Selection glider follows the actual button geometry while retaining the same controls', () => {
  const f = fixture(), values = new Map(), attributes = new Set(); let selectedLeft = 0;
  const selected = {getBoundingClientRect: () => ({left: selectedLeft, top: 0, width: 90, height: 44})};
  const group = {style: {setProperty: (key, value) => values.set(key, value), removeProperty: key => values.delete(key)},
    querySelector: () => selected, getClientRects: () => [{}], getBoundingClientRect: () => ({left: 0, top: 0}),
    scrollLeft: 0, scrollTop: 0, clientLeft: 0, clientTop: 0, closest: () => null,
    setAttribute: name => attributes.add(name), removeAttribute: name => attributes.delete(name)};
  f.groups.push(group); f.main.contains = element => f.groups.includes(element);
  const controller = observeWorkspaceMotion(f.main, f.preference); f.flush();
  assert.ok(attributes.has('data-motion-tabs')); assert.equal(values.get('--motion-pill-x'), '0px');
  selectedLeft = 110; f.mutate(); f.flush();
  assert.equal(values.get('--motion-pill-x'), '110px'); assert.equal(values.get('--motion-pill-height'), '44px');
  assert.equal(group.querySelector(), selected);
  f.groups.length = 0; f.mutate(); f.flush();
  assert.equal(values.size, 0); assert.equal(attributes.size, 0);
  controller.destroy();
});
test('An unavailable animation engine cannot prevent loaded content from appearing', () => {
  const f = fixture(), card = f.node(); card.animate = () => {throw Error('Unavailable engine');}; f.elements.push(card);
  const controller = observeWorkspaceMotion(f.main, f.preference);
  assert.doesNotThrow(() => f.flush()); assert.equal(card.visible, true); controller.destroy();
});
test('Accordion opening and interrupted closing animate the actual height without persistent inline styles', () => {
  const f = fixture(), details = f.node(); let height = 44;
  details.tagName = 'DETAILS'; details.isConnected = true;
  details.getBoundingClientRect = () => ({height, top: 0, left: 0});
  const summary = {parentElement: details};
  const event = {target: {closest: () => summary}};
  const controller = observeWorkspaceMotion(f.main, f.preference); f.flush();
  f.listeners.get('shell:click')(event); height = 180; f.flush();
  assert.equal(details.calls[0].keyframes[0].height, '44px');
  assert.equal(details.calls[0].keyframes[1].height, '180px');
  f.listeners.get('shell:click')(event); height = 44; f.flush();
  assert.ok(details.animations[0].cancelled);
  assert.equal(details.calls[1].keyframes[1].height, '44px');
  assert.equal(details.style, undefined);
  controller.destroy();
});
test('Native transitions are enabled only with browser support and normal motion preference', () => {
  assert.equal(nativeMotionAvailable({}), false);
  const host = {document: {startViewTransition() {}}, matchMedia: () => ({matches: false})};
  assert.equal(nativeMotionAvailable(host), true);
  host.matchMedia = () => ({matches: true}); assert.equal(nativeMotionAvailable(host), false);
});
test('Legacy media-query listener is removed without touching unrelated listeners', () => {
  let listener;
  const preference = {addListener: cb => {listener = cb;}, removeListener: cb => {assert.equal(cb, listener); listener = null;}};
  const stop = watchMotionPreference(preference, () => {}); assert.ok(listener); stop(); assert.equal(listener, null);
});

export const motionEase = 'cubic-bezier(.22,1,.36,1)';
const enterSelector = [
  'a[class*="-card"]', 'a[class*="-row"]', 'a[class*="-item"]',
  '.employee-discussion-card', '.president-history-card',
  '.employee-metric', '.manager-metric', '.president-metric',
  '.admin-metric', '.admin-user-row', '.admin-sector-row', '.admin-audit-row', '.admin-heading',
  '.employee-greeting', '.president-greeting', '.manager-page-heading', '.manager-wave-heading',
  '.employee-detail-title', '.manager-project-overview', '.president-idea-overview',
  '.employee-tools', '.manager-project-tools', '.manager-expansion',
  '.employee-form-success', '.employee-form-error', '.employee-error',
  '.manager-project-activity', '.employee-project-activity', '.president-project-activity',
  '.manager-activity-editor', '.president-report-section', '.employee-empty',
].join(',');
const tabsSelector = [
  '.employee-filter-tabs', '.manager-tabs', '.manager-project-tabs', '.manager-report-tabs',
  '.manager-idea-tabs', '.president-idea-tabs', '.president-attention-tabs',
  '.president-history-filters', '.president-project-filters', '.president-segmented',
  '.workspace-navigation nav',
  '.admin-tabs',
].join(',');
const selectedSelector = ':scope > [aria-pressed="true"], :scope > .is-active, :scope > [aria-current="page"]';
const panelSelector = '.manager-project-panel.is-current, .manager-activity-editor';

export function watchMotionPreference(preference, listener) {
  if (preference?.addEventListener) preference.addEventListener('change', listener);
  else preference?.addListener?.(listener);
  return () => {
    if (preference?.removeEventListener) preference.removeEventListener('change', listener);
    else preference?.removeListener?.(listener);
  };
}
export function nativeMotionAvailable(host = globalThis.window) {
  return !!host?.document?.startViewTransition && host.matchMedia?.('(prefers-reduced-motion: reduce)').matches === false;
}
export function indicatorBox(group, selected) {
  const outer = group.getBoundingClientRect(), inner = selected.getBoundingClientRect();
  return {x: inner.left - outer.left + group.scrollLeft - group.clientLeft,
    y: inner.top - outer.top + group.scrollTop - group.clientTop, width: inner.width, height: inner.height};
}

// Installed once per shell. New API results are observed AFTER they mount, rather
// than spending the entire entrance animation on the initial loading message.
export function observeWorkspaceMotion(main, preference, options = {}) {
  const shell = main?.closest('.workspace-shell') || main;
  const host = options.host || main?.ownerDocument?.defaultView;
  if (!main || !host) return {refresh() {}, destroy() {}};
  const seen = new WeakSet(), positions = new WeakMap(), indicators = new Map(), active = new Set(), running = new WeakMap();
  const pendingPanels = new Set();
  let frame = null, stopped = false;
  const visible = element => element.getClientRects().length > 0;
  const reduced = () => !preference || preference.matches;
  function animate(element, frames, timing = {}, onEnd) {
    if (reduced() || typeof element.animate !== 'function') {onEnd?.(); return;}
    running.get(element)?.cancel();
    let animation;
    try {animation = element.animate(frames, {duration: 420, easing: motionEase, ...timing});}
    catch {onEnd?.(); return;}
    active.add(animation);
    running.set(element, animation);
    const done = () => {active.delete(animation); if (running.get(element) === animation) running.delete(element); onEnd?.(); schedule();};
    animation.finished?.then(done, done);
    return animation;
  }
  function updateIndicators() {
    for (const group of indicators.keys()) {
      if (shell.contains?.(group) === false) {
        group.removeAttribute('data-motion-tabs');
        for (const key of ['x', 'y', 'width', 'height', 'color', 'image']) group.style.removeProperty('--motion-pill-' + key);
        indicators.delete(group);
      }
    }
    for (const group of shell.querySelectorAll(tabsSelector)) {
      const selected = group.querySelector(selectedSelector);
      if (!selected || !visible(group)) {group.removeAttribute('data-motion-tabs'); continue;}
      if (!indicators.has(group)) {
        const style = host.getComputedStyle(selected);
        indicators.set(group, true);
        const navigation = !!group.closest('.workspace-navigation');
        group.style.setProperty('--motion-pill-color', navigation ? '#fff2d9' : style.backgroundColor);
        group.style.setProperty('--motion-pill-image', navigation ? 'none' : style.backgroundImage);
      }
      const box = indicatorBox(group, selected);
      for (const [key, value] of Object.entries(box)) group.style.setProperty('--motion-pill-' + key, value + 'px');
      group.setAttribute('data-motion-tabs', '');
    }
  }
  function flush() {
    frame = null;
    if (stopped) return;
    updateIndicators();
    // The router owns outgoing/incoming snapshots during a native transition.
    // Reveal late data once that transition ends instead of capturing invisible cards.
    if (options.nativeActive?.()) return;
    const candidates = [...main.querySelectorAll(enterSelector)].filter(visible);
    let order = 0;
    const hasDialog = !!shell.querySelector('dialog[open]');
    for (const element of candidates) {
      if (running.has(element)) continue;
      const rect = element.getBoundingClientRect(), top = rect.top + host.scrollY, left = rect.left + host.scrollX;
      const previous = positions.get(element);
      if (!seen.has(element)) {
        seen.add(element);
        const style = host.getComputedStyle(element);
        if (!hasDialog && !['fixed', 'sticky'].includes(style.position)) {
          animate(element, [{opacity: 0, transform: 'translateY(18px)'}, {opacity: 1, transform: 'none'}],
            {delay: Math.min(order++, 5) * 35, fill: 'backwards'});
        }
      } else if (previous && !hasDialog) {
        const dx = previous.left - left, dy = previous.top - top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          animate(element, [{transform: `translate(${Math.max(-100, Math.min(100, dx))}px,${Math.max(-100, Math.min(100, dy))}px)`}, {transform: 'none'}], {duration: 340});
        }
      }
      positions.set(element, {top, left});
    }
    for (const panel of pendingPanels) {
      if (visible(panel) && !hasDialog) animate(panel, [{opacity: 0, transform: 'translateY(12px)'}, {opacity: 1, transform: 'none'}], {duration: 340});
    }
    pendingPanels.clear();
  }
  function schedule() {if (!stopped && frame === null) frame = host.requestAnimationFrame(flush);}
  const observer = host.MutationObserver ? new host.MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target.matches?.(panelSelector)) pendingPanels.add(record.target);
        if (record.attributeName === 'data-view') for (const panel of record.target.querySelectorAll(panelSelector + ', .manager-activity-main > section')) pendingPanels.add(panel);
      }
    }
    schedule();
  }) : null;
  observer?.observe(shell, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'open', 'hidden', 'aria-pressed', 'aria-current', 'data-view']});
  const resize = host.ResizeObserver ? new host.ResizeObserver(schedule) : null;
  resize?.observe(shell);
  const summaryClick = event => {
    const summary = event.target.closest?.('summary');
    const details = summary?.parentElement;
    if (!details || details.tagName !== 'DETAILS' || reduced()) return;
    const height = details.getBoundingClientRect().height;
    host.requestAnimationFrame(() => {
      if (stopped || !details.isConnected || reduced()) return;
      const next = details.getBoundingClientRect().height;
      if (Math.abs(next - height) < 2) return;
      animate(details, [{height: height + 'px', overflow: 'hidden'}, {height: next + 'px', overflow: 'hidden'}], {duration: 320});
      schedule();
    });
  };
  shell.addEventListener('click', summaryClick);
  shell.addEventListener('scroll', schedule, true);
  host.addEventListener('resize', schedule);
  const unwatch = watchMotionPreference(preference, () => {
    if (reduced()) {for (const animation of active) animation.cancel(); active.clear();}
    schedule();
  });
  schedule();
  return {refresh: schedule, destroy() {
    stopped = true;
    if (frame !== null) host.cancelAnimationFrame(frame);
    observer?.disconnect(); resize?.disconnect(); unwatch();
    shell.removeEventListener('click', summaryClick);
    shell.removeEventListener('scroll', schedule, true);
    host.removeEventListener('resize', schedule);
    for (const animation of active) animation.cancel();
    active.clear();
    for (const group of indicators.keys()) {
      group.removeAttribute('data-motion-tabs');
      for (const key of ['x', 'y', 'width', 'height', 'color', 'image']) group.style.removeProperty('--motion-pill-' + key);
    }
  }};
}

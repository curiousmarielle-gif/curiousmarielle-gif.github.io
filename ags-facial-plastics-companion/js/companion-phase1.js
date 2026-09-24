/** Presentation-only filters. Values come from the existing table, never a clinical model. */
export function bindCompanionPhase1() {
  const tools = document.getElementById('material-tools');
  const table = document.getElementById('materials-table');
  const query = document.getElementById('material-query');
  const evidence = document.getElementById('material-evidence');
  const reset = document.getElementById('material-reset');
  const status = document.getElementById('material-status');
  const options = document.getElementById('evidence-options');
  if (!(tools instanceof HTMLElement) || !(table instanceof HTMLTableElement) ||
      !(query instanceof HTMLInputElement) || !(evidence instanceof HTMLSelectElement) ||
      !reset || !status || !options || tools.dataset.bound === 'true') return () => {};
  tools.dataset.bound = 'true';

  const rows = [...table.querySelectorAll('tbody tr')];
  const expansions = [...document.querySelectorAll('#materials .acc-expand li')];
  // Capture the existing cells before adding visual column labels for small screens.
  const entries = rows.map(row => {
    const source = ['id', 'class', 'source'].map(column => row.querySelector(`[data-column="${column}"]`)?.textContent?.trim() || '').join(' ');
    return { row, source, evidence: row.querySelector('[data-column="evidence"]')?.textContent?.trim() || '' };
  });
  const headings = [...table.querySelectorAll('thead th')].map(cell => cell.textContent?.trim() || '');
  table.querySelectorAll('thead,tbody').forEach(group => group.setAttribute('role', 'rowgroup'));
  table.querySelectorAll('tr').forEach(row => row.setAttribute('role', 'row'));
  table.querySelectorAll('th').forEach(cell => cell.setAttribute('role', 'columnheader'));
  rows.forEach(row => row.querySelectorAll('td').forEach((cell, index) => {
    cell.setAttribute('role', 'cell');
    const header = table.querySelectorAll('thead th')[index];
    if (header?.id) cell.setAttribute('headers', header.id);
    const label = document.createElement('span');
    label.className = 'cell-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = headings[index];
    cell.prepend(label);
  }));
  table.classList.add('phase1-reflow');

  // Preserve source order; do not rank evidence, combine labels, or infer classifications.
  const labels = [...new Set(entries.map(entry => entry.evidence))];
  const buttons = labels.map(label => {
    evidence.add(new Option(label, label));
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-controls', 'materials-table');
    button.setAttribute('aria-pressed', 'false');
    item.append(button);
    options.append(item);
    return { button, label };
  });
  const apply = () => {
    const search = query.value.trim().toLocaleLowerCase('en');
    let count = 0;
    entries.forEach((entry, index) => {
      const visible = entry.source.toLocaleLowerCase('en').includes(search) &&
        (!evidence.value || entry.evidence === evidence.value);
      entry.row.toggleAttribute('hidden', !visible);
      // Retain the separate archived expansion verbatim, with matching row visibility.
      expansions[index]?.toggleAttribute('hidden', !visible);
      if (visible) count += 1;
    });
    status.textContent = `${count} of ${entries.length} material rows shown.`;
    buttons.forEach(({ button, label }) => button.setAttribute('aria-pressed', String(evidence.value === label)));
  };
  const showAll = () => { query.value = ''; evidence.value = ''; apply(); };
  const handlers = buttons.map(({ button, label }) => {
    const handler = () => { evidence.value = evidence.value === label ? '' : label; apply(); };
    button.addEventListener('click', handler);
    return () => button.removeEventListener('click', handler);
  });
  query.addEventListener('input', apply);
  evidence.addEventListener('change', apply);
  reset.addEventListener('click', showAll);
  tools.hidden = false;
  apply();

  const nav = document.querySelector('.nav');
  const measureNav = () => {
    const height = nav && getComputedStyle(nav).position === 'sticky' ? nav.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--phase1-nav-offset', `${Math.ceil(height) + 16}px`);
  };
  const navObserver = new ResizeObserver(measureNav);
  if (nav) navObserver.observe(nav);
  window.addEventListener('resize', measureNav);
  measureNav();

  /** Reveal nested disclosures on initial URLs, links, and history navigation. @param {string} hash */
  const reveal = hash => {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    if (target.closest('tr[hidden], li[data-material-id][hidden]')) showAll();
    /** @type {HTMLElement | null} */
    let parent = target;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    measureNav();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  /** @param {MouseEvent} event */
  const onLink = event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    const hash = link?.getAttribute('href');
    if (!hash || hash === '#') return;
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    if (location.hash !== hash) history.pushState(null, '', hash);
    reveal(hash);
  };
  const onHash = () => reveal(location.hash);
  document.addEventListener('click', onLink);
  window.addEventListener('hashchange', onHash);
  // Existing images/media can settle after the first frame and move a deep-link target.
  window.addEventListener('load', onHash, { once: true });
  const frame = requestAnimationFrame(() => { if (location.hash) onHash(); });

  return () => {
    cancelAnimationFrame(frame);
    navObserver.disconnect();
    window.removeEventListener('resize', measureNav);
    document.documentElement.style.removeProperty('--phase1-nav-offset');
    document.removeEventListener('click', onLink);
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('load', onHash);
    query.removeEventListener('input', apply);
    evidence.removeEventListener('change', apply);
    reset.removeEventListener('click', showAll);
    handlers.forEach(cleanup => cleanup());
    showAll();
    table.querySelectorAll('.cell-label').forEach(label => label.remove());
    table.classList.remove('phase1-reflow');
    options.replaceChildren();
    while (evidence.options.length > 1) evidence.remove(1);
    tools.hidden = true;
    delete tools.dataset.bound;
  };
}

/** Inactive preparation only. Reveal and delivery require verified service configuration. */
export function bindAttendeeFeedback() {
  const form = document.getElementById('review-form');
  const fields = document.getElementById('review-fields');
  const status = document.getElementById('review-status');
  if (!(form instanceof HTMLFormElement) || !(fields instanceof HTMLFieldSetElement) || !status || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  const unavailable = 'Feedback collection is unavailable.';
  form.reset();
  fields.disabled = true;
  const version = document.getElementById('review-version');
  if (version instanceof HTMLInputElement) version.value = document.querySelector('[data-release-stamp]')?.textContent?.trim() || '';
  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = unavailable;
  });
  form.addEventListener('reset', () => { status.textContent = unavailable; });
  // Do not retain response values through history restoration or page closure.
  window.addEventListener('pagehide', () => form.reset());
  window.addEventListener('pageshow', () => form.reset());
}

/** Progressive, read-only page navigation. Native modal behavior retains browser pinch zoom. */
export function bindQuestionnaireViewer() {
  const viewer = document.getElementById('questionnaire-viewer');
  const image = document.getElementById('questionnaire-image');
  const pageLink = document.getElementById('questionnaire-page');
  const controls = document.getElementById('questionnaire-controls');
  const previous = document.getElementById('questionnaire-previous');
  const next = document.getElementById('questionnaire-next');
  const status = document.getElementById('questionnaire-page-status');
  const enlarge = document.getElementById('questionnaire-enlarge');
  const dialog = document.getElementById('questionnaire-dialog');
  const enlargedImage = document.getElementById('questionnaire-enlarged-image');
  const title = document.getElementById('questionnaire-dialog-title');
  const viewport = document.getElementById('questionnaire-zoom-viewport');
  const zoomIn = document.getElementById('questionnaire-zoom-in');
  const zoomOut = document.getElementById('questionnaire-zoom-out');
  const zoomStatus = document.getElementById('questionnaire-zoom-status');
  const close = document.getElementById('questionnaire-close');
  if (!viewer || !(image instanceof HTMLImageElement) || !(pageLink instanceof HTMLAnchorElement) || !controls ||
      !previous || !next || !status || !enlarge || !(dialog instanceof HTMLDialogElement) ||
      !(enlargedImage instanceof HTMLImageElement) || !title || !viewport || !zoomIn || !zoomOut || !zoomStatus || !close ||
      viewer.dataset.bound === 'true') return;
  const count = Number(viewer.dataset.pageCount);
  if (!Number.isInteger(count) || count < 1) return;
  viewer.dataset.bound = 'true';
  const firstSource = image.getAttribute('src') || '';
  let current = 1;
  let zoom = 100;
  /** @type {HTMLElement | null} */
  let opener = null;
  const showPage = (/** @type {number} */ number) => {
    current = Math.max(1, Math.min(count, number));
    image.src = firstSource.replace('page-01.png', `page-${String(current).padStart(2, '0')}.png`);
    image.alt = `Prevalidation questionnaire, page ${current} of ${count}.`;
    pageLink.href = image.src;
    pageLink.setAttribute('aria-label', `Enlarge page ${current} of ${count}`);
    status.textContent = `Page ${current} of ${count}`;
    previous.setAttribute('aria-disabled', String(current === 1));
    next.setAttribute('aria-disabled', String(current === count));
  };
  previous.addEventListener('click', () => showPage(current - 1));
  next.addEventListener('click', () => showPage(current + 1));
  controls.hidden = false;
  showPage(1);
  // If native dialogs are unavailable, the page image and full reference links still work.
  if (typeof dialog.showModal !== 'function') return;
  const setZoom = (/** @type {number} */ value) => {
    zoom = Math.max(100, Math.min(400, value));
    enlargedImage.style.width = `${zoom}%`;
    zoomStatus.textContent = `${zoom}%`;
    zoomOut.setAttribute('aria-disabled', String(zoom === 100));
    zoomIn.setAttribute('aria-disabled', String(zoom === 400));
  };
  const open = (/** @type {HTMLElement} */ trigger) => {
    opener = trigger;
    title.textContent = `Prevalidation questionnaire — Page ${current} of ${count}`;
    enlargedImage.src = image.src;
    enlargedImage.alt = image.alt;
    setZoom(100);
    dialog.showModal();
    document.documentElement.classList.add('questionnaire-modal-open');
    viewport.scrollTo(0, 0);
    close.focus();
  };
  enlarge.hidden = false;
  pageLink.setAttribute('aria-haspopup', 'dialog');
  pageLink.addEventListener('click', event => { event.preventDefault(); open(pageLink); });
  enlarge.addEventListener('click', () => open(enlarge));
  zoomIn.addEventListener('click', () => setZoom(zoom + 25));
  zoomOut.addEventListener('click', () => setZoom(zoom - 25));
  viewport.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (['+', '=', '-'].includes(event.key)) {
      event.preventDefault();
      setZoom(zoom + (event.key === '-' ? -25 : 25));
    }
  });
  close.addEventListener('click', () => dialog.close());
  // Keep Tab within the dialog instead of allowing focus to move to browser chrome.
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button, [tabindex="0"]')].filter(/** @returns {element is HTMLElement} */ element => element instanceof HTMLElement);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
  });
  // Escape uses the native cancel/close lifecycle, including focus restoration.
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('questionnaire-modal-open');
    opener?.focus({ preventScroll: true });
  });
}

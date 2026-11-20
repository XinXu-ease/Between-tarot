const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../dist/app.js'), 'utf8');

function boot({ legacy, journal, reduced = false } = {}) {
  const dom = new JSDOM('<nav><button data-nav="home">Home</button><button data-nav="reading">Reading</button><button data-nav="journal">Journal</button></nav><main id="app" class="app"></main>', { url: 'http://localhost/', runScripts: 'outside-only' });
  const { window } = dom;
  let now = 0, nextId = 1;
  const timers = new Map();
  window.setTimeout = (callback, ms = 0) => { const id = nextId++; timers.set(id, { callback, time: now + ms }); return id; };
  window.clearTimeout = (id) => timers.delete(id);
  window.matchMedia = () => ({ matches: reduced });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.HTMLElement.prototype.setPointerCapture = function () {};
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.animate = function (frames, options) { return { frames, options, cancel() {}, onfinish: null }; };
  if (legacy) window.localStorage.setItem('between_journal_v1', JSON.stringify(legacy));
  if (journal) window.localStorage.setItem('between_journal_v2', JSON.stringify(journal));
  window.eval(source);
  const api = {
    dom, window, document: window.document,
    $(selector) { const node = window.document.querySelector(selector); assert.ok(node, `Expected ${selector} in current page`); return node; },
    click(selector) { api.$(selector).click(); },
    tick(ms) {
      const target = now + ms;
      for (;;) {
        const pending = [...timers].filter(([, value]) => value.time <= target).sort((a, b) => a[1].time - b[1].time)[0];
        if (!pending) break;
        timers.delete(pending[0]); now = pending[1].time; pending[1].callback();
      }
      now = target;
    },
    entries() { return JSON.parse(window.localStorage.getItem('between_journal_v2')); },
    input(selector, value) { const node = api.$(selector); node.value = value; node.dispatchEvent(new window.Event('input', { bubbles: true })); },
    begin(question = 'What should I consider about my career?') { api.input('#question', question); api.click('#start'); },
    pick(index) { api.click(`[data-card="${index}"]`); api.tick(reduced ? 1 : 620); },
    result() { for (const index of [1, 3, 5]) api.pick(index); api.tick(reduced ? 10 : 2600); },
  };
  return api;
}

test('three selections advance through the actual UI to Result, reflection, and Journal', () => {
  const t = boot();
  t.begin();
  assert.equal(t.document.querySelectorAll('.shuffle-sheet').length, 18);
  assert.ok(t.$('.draw-stage.shuffling'));
  t.tick(2300);
  assert.equal(t.document.querySelectorAll('.hand-card').length, 78);
  assert.equal(t.document.querySelector('.draw-title .eyebrow'), null, 'Past / Present / Future is not repeated above the draw slots');
  assert.equal(t.document.querySelector('.hand-footer'), null);
  assert.equal(t.document.body.textContent.includes('Scroll or drag to explore'), false);
  assert.equal(t.$('.hand-status').lastElementChild.id, 'shuffle-again');
  assert.equal(t.$('.hand-status').firstElementChild.id, 'draw-progress');
  assert.equal(t.document.querySelector('.hand-card').querySelector('img').getAttribute('src'), 'assets/tarot/CardBacks.png');
  t.result();
  assert.equal(t.document.querySelector('.draw-stage'), null);
  assert.equal(t.document.querySelectorAll('.reading-card').length, 3);
  assert.equal(t.document.querySelectorAll('.reading-card-rotator.is-revealed').length, 3);
  assert.equal(t.document.querySelector('.section-head .eyebrow'), null);
  assert.equal(t.document.querySelector('.inline-reflection h2'), null);
  const [saved] = t.entries();
  assert.deepEqual(saved.spread, ['Past', 'Present', 'Future']);
  assert.deepEqual(saved.interpretations.map(x => x.position), saved.spread);
  assert.equal(new Set(saved.cards.map(x => x.id)).size, 3);
  assert.ok(saved.interpretations[0].text.includes('experiences'));
  assert.ok(saved.interpretations[2].text.includes('could develop'));
  assert.equal(t.document.querySelector('#finish'), null);
  assert.equal(t.document.querySelector('#reflect'), null);
  assert.ok(t.$('.inline-reflection'), 'Reflection is visible with the reading result');
  assert.equal(t.$('#save-reflection').disabled, true);
  t.click('[data-active="2"]');
  assert.equal(t.$('.interpretation .eyebrow').textContent, 'Future');
  assert.equal(t.entries().length, 1);
  assert.ok(t.$('.result-stage'), 'Reflection stays inside the reading result');
  t.input('#notes', 'I am going to gather more information.');
  t.click('[data-mood="Calm"]');
  assert.equal(t.$('#notes').value, 'I am going to gather more information.');
  t.input('#next', 'Talk to a mentor.');
  t.click('#save-reflection');
  assert.ok(t.$('.journal-detail'));
  assert.equal(t.document.querySelectorAll('.archive-card').length, 3);
  assert.equal(t.document.querySelector('.timeline-event h3'), null);
  assert.ok(t.$('.timeline-event-title').textContent.length > 0);
  assert.equal(t.$('.timeline-event-title').tagName, 'TIME');
  assert.equal(t.entries()[0].timeline.length, 1);
  assert.deepEqual(t.entries()[0].cards, saved.cards);
  t.dom.window.close();
});

test('Result reveals cards, then interpretation, then reflection in sequence', () => {
  const t = boot(); t.begin(); t.tick(2300);
  t.pick(1); t.pick(3); t.pick(5); t.tick(460);
  const stage = t.$('.result-stage');
  assert.ok(stage.classList.contains('is-entering'));
  assert.equal(t.document.querySelectorAll('.reading-card-rotator.is-revealed').length, 0);
  assert.equal(stage.classList.contains('show-interpretation'), false);
  assert.equal(stage.classList.contains('show-reflection'), false);
  t.tick(1260);
  assert.equal(t.document.querySelectorAll('.reading-card-rotator.is-revealed').length, 3);
  assert.equal(stage.classList.contains('show-interpretation'), false);
  t.tick(640);
  assert.equal(stage.classList.contains('show-interpretation'), true);
  assert.equal(stage.classList.contains('show-reflection'), false);
  t.tick(550);
  assert.equal(stage.classList.contains('show-reflection'), true);
  t.tick(650);
  assert.equal(stage.classList.contains('is-entering'), false);
  const css = fs.readFileSync(path.join(__dirname, '../dist/draw.css'), 'utf8');
  assert.match(css, /\.result-stage\.is-entering \.inline-reflection[^}]*visibility:\s*hidden/);
  assert.match(css, /\.result-stage\.is-entering\.show-reflection \.inline-reflection[^}]*visibility:\s*visible/);
  t.dom.window.close();
});

test('Home topic categories supply editable defaults and can be toggled off', () => {
  const t = boot();
  assert.equal(t.document.querySelector('.hero .eyebrow'), null);
  assert.equal(t.document.querySelector('.hero .lede'), null);
  assert.ok(fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8').includes('Read the cards. Reflect inward. Move with intention.'));
  assert.equal(t.$('.hero-intro h1').textContent, 'Between the cards and you, clarity begins.');
  assert.deepEqual([...t.document.querySelectorAll('[data-topic]')].map(button => button.textContent), ['Love', 'Career', 'Self', 'General']);
  t.click('[data-topic="career"]');
  assert.equal(t.$('#question').value, 'What should I focus on in my career right now?');
  assert.equal(t.$('[data-topic="career"]').getAttribute('aria-pressed'), 'true');
  assert.equal(t.$('#start').disabled, false);
  t.click('[data-topic="career"]');
  assert.equal(t.$('[data-topic="career"]').getAttribute('aria-pressed'), 'false');
  assert.equal(t.$('#question').value, '');
  assert.equal(t.$('#start').disabled, true);
  t.click('[data-topic="self"]');
  t.input('#question', 'What do I need to practice this week?');
  t.click('[data-topic="self"]');
  assert.equal(t.$('#question').value, 'What do I need to practice this week?', 'Deselecting preserves an edited question');
  t.click('[data-topic="love"]');
  assert.equal(t.$('#question').value, 'What should I understand about my relationships right now?');
  t.click('#start'); t.tick(2300); t.result();
  assert.equal(t.entries()[0].topic, 'love');
  const homeCss = fs.readFileSync(path.join(__dirname, '../dist/styles.css'), 'utf8');
  assert.match(homeCss, /grid-template-areas:"intro oracle" "question oracle"/);
  assert.match(homeCss, /row-gap:36px/);
  assert.ok(fs.existsSync(path.join(__dirname, '../dist/assets/home-tarot-linework.png')));
  assert.match(homeCss, /\.hero::before\{[^}]*background-image:url\("assets\/home-tarot-linework\.png"\)/);
  assert.match(homeCss, /\.hero::before\{[^}]*mask-image:linear-gradient\(135deg,rgba\(0,0,0,\.18\)[^}]*#000 100%\)/);
  assert.match(homeCss, /\.hero::before\{[^}]*mix-blend-mode:screen[^}]*opacity:\.68/);
  assert.match(homeCss, /nav button\.active\{[^}]*color:color-mix\(in srgb,var\(--gold\) 58%,var\(--cream\)\)/);
  assert.match(homeCss, /nav button\.active::after\{[^}]*content:"✦"[^}]*color:var\(--gold\)/);
  assert.doesNotMatch(homeCss, /nav button(?:\:hover)?,nav button\.active\{[^}]*linear-gradient/);
  t.dom.window.close();
});

test('Journal rows group date and topic at left and offer an independent delete control', () => {
  const t = boot(); t.begin(); t.tick(2300); t.result();
  const saved = t.entries()[0];
  t.click('[data-nav="journal"]');
  assert.equal(t.document.querySelector('.journal-list .section-head .eyebrow'), null);
  const row = t.$('.journal-row'), main = t.$('.journal-row-main');
  assert.equal(t.$('.journal-meta time').textContent.length > 0, true);
  assert.equal(t.$('.journal-meta .topic').textContent, saved.topic);
  assert.equal(t.$('.journal-question h2').textContent, saved.question);
  assert.equal(t.$('.entry-status').textContent, 'No notes yet');
  assert.equal(t.$('.journal-delete').getAttribute('aria-label'), 'Delete this reading');
  assert.ok(t.$('.journal-delete').textContent.includes('Delete this reading'));
  assert.equal(t.$('.journal-row-actions').firstElementChild.className, 'entry-status');
  assert.equal(t.$('.journal-row-actions').lastElementChild.className, 'journal-delete');
  assert.equal(main.closest('.journal-row'), row);
  const journalCss = fs.readFileSync(path.join(__dirname, '../dist/journal.css'), 'utf8');
  assert.match(journalCss, /\.journal-delete\{[^}]*max-width:0[^}]*opacity:0[^}]*visibility:hidden/);
  assert.match(journalCss, /\.journal-row:hover \.journal-delete,\.journal-row:focus-within \.journal-delete\{[^}]*max-width:180px[^}]*opacity:1[^}]*visibility:visible/);
  t.click('.journal-delete');
  assert.equal(t.entries().length, 0);
  assert.ok(t.$('.journal-list .empty'));
  t.dom.window.close();
});

test('Journal records can be sorted by time and filtered by topic', () => {
  const cards = [{ id: 'major-0', reverse: false }, { id: 'cups-2', reverse: true }, { id: 'swords-3', reverse: false }];
  const entry = (id, createdAt, topic, question) => ({ id, createdAt, topic, question, cards, timeline: [] });
  const t = boot({ journal: [
    entry('middle', '2026-11-18T16:00:00Z', 'career', 'A middle career reading'),
    entry('newest', '2026-11-20T16:00:00Z', 'love', 'The newest love reading'),
    entry('oldest', '2026-11-16T16:00:00Z', 'love', 'The oldest love reading'),
    entry('unfiled', '2026-11-14T16:00:00Z', undefined, 'A reading without a selected topic'),
  ] });
  t.click('[data-nav="journal"]');
  const ids = () => [...t.document.querySelectorAll('[data-entry]')].map(node => node.dataset.entry);
  assert.deepEqual(ids(), ['newest', 'middle', 'oldest', 'unfiled']);
  assert.equal(t.$('#journal-filter-toggle').textContent.trim().startsWith('Topic'), true);
  assert.equal(t.$('#journal-filter-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(t.$('#journal-topic-menu').hidden, true);
  t.click('#journal-filter-toggle');
  assert.equal(t.$('#journal-filter-toggle').getAttribute('aria-expanded'), 'true');
  assert.deepEqual([...t.document.querySelectorAll('[data-journal-topic]')].map(option => option.textContent.trim()), ['All topics✓', 'Love', 'Career', 'Self', 'General', 'Other']);

  t.click('#journal-sort');
  assert.deepEqual(ids(), ['unfiled', 'oldest', 'middle', 'newest']);
  assert.match(t.$('#journal-sort').getAttribute('aria-label'), /Oldest first/);

  t.click('#journal-filter-toggle');
  t.click('[data-journal-topic="love"]');
  assert.deepEqual(ids(), ['oldest', 'newest']);
  assert.match(t.$('#journal-sort').getAttribute('aria-label'), /Oldest first/, 'Filtering preserves the selected sort order');
  assert.equal(t.$('#journal-topic-menu').hidden, true, 'The topic menu closes after a selection');

  t.click('#journal-filter-toggle');
  t.click('[data-journal-topic="career"]');
  assert.deepEqual(ids(), ['middle']);

  t.click('#journal-filter-toggle');
  t.click('[data-journal-topic="other"]');
  assert.deepEqual(ids(), ['unfiled']);
  assert.equal(t.$('.journal-meta .topic').textContent, 'other');
  t.dom.window.close();
});

test('A new reading without a chosen topic is filed as Other', () => {
  const t = boot({ reduced: true });
  t.begin('What should I consider today?');
  t.tick(10);
  t.result();
  assert.equal(t.entries()[0].topic, 'other');
  t.dom.window.close();
});

test('a feeling alone is enough to save the inline reflection', () => {
  const t = boot(); t.begin(); t.tick(2300); t.result();
  assert.equal(t.$('#notes').getAttribute('placeholder'), 'This card reminds me of a pattern I keep returning to…');
  assert.equal(t.$('#next').getAttribute('placeholder'), 'Have one honest conversation this week…');
  t.click('[data-mood="Hopeful"]');
  assert.equal(t.$('#save-reflection').disabled, false);
  t.click('[data-mood="Hopeful"]');
  assert.equal(t.$('[data-mood="Hopeful"]').getAttribute('aria-pressed'), 'false');
  assert.equal(t.$('#save-reflection').disabled, true, 'A selected feeling can be toggled off');
  t.click('[data-mood="Hopeful"]');
  assert.ok(t.$('.result-stage'), 'Mood selection must not route to a separate page');
  t.click('#save-reflection');
  assert.ok(t.$('.journal-detail'));
  assert.equal(t.entries()[0].timeline[0].mood, 'Hopeful');
  assert.equal(t.entries()[0].timeline[0].reflectionNotes, '');
  assert.equal(t.entries()[0].timeline[0].nextStep, '');
  t.dom.window.close();
});

test('Other feeling fades in an editable field and saves the custom mood', () => {
  const t = boot(); t.begin(); t.tick(2300); t.result();
  assert.equal(t.$('#custom-mood-field').hidden, true);
  t.click('#custom-mood-toggle');
  assert.equal(t.$('#custom-mood-field').hidden, false);
  assert.equal(t.$('#custom-mood-toggle').getAttribute('aria-pressed'), 'true');
  t.input('#custom-mood', 'Cautiously optimistic');
  assert.equal(t.$('#save-reflection').disabled, false);
  t.click('#save-reflection');
  assert.equal(t.entries()[0].timeline[0].mood, 'Cautiously optimistic');
  const css = fs.readFileSync(path.join(__dirname, '../dist/draw.css'), 'utf8');
  assert.match(css, /@keyframes custom-mood-in/);
  t.dom.window.close();
});

test('Skip opens the automatically saved reading without creating a reflection', () => {
  const t = boot(); t.begin(); t.tick(2300); t.result();
  t.click('#skip-reflection');
  assert.ok(t.$('.journal-detail'));
  assert.equal(t.entries().length, 1);
  assert.equal(t.entries()[0].timeline.length, 0);
  t.dom.window.close();
});

test('Journal detail leads with the overall reflection and reveals one card meaning at right on click', () => {
  const t = boot(); t.begin(); t.tick(2300); t.result();
  const saved = t.entries()[0];
  t.click('#skip-reflection');
  const heading = t.$('.archive-heading');
  assert.equal(t.$('#back-journal').textContent, '←');
  assert.equal(t.$('#back-journal').getAttribute('aria-label'), 'Back to journal');
  assert.equal(heading.querySelector('.eyebrow'), null, 'The duplicate archive timestamp is removed');
  assert.equal(t.$('.archive-actions .topic').textContent, saved.topic);
  assert.ok(t.$('.archive-actions #delete-entry'));
  assert.equal(t.document.querySelector('.frame-heading .eyebrow'), null);
  assert.ok(t.$('.frame-heading h2').textContent.startsWith('Drawn '));
  const overall = t.$('.frame-overall'), cards = t.$('.archive-cards'), grid = t.$('.archive-reading-grid');
  assert.ok(t.$('.reading-frame').classList.contains('detail-entering'), 'The whole reading frame enters as one card');
  assert.ok(overall.compareDocumentPosition(grid) & t.window.Node.DOCUMENT_POSITION_FOLLOWING, 'Overall reflection appears above the card-and-meaning grid');
  assert.equal(grid.firstElementChild.className, 'archive-card-column');
  assert.equal(grid.lastElementChild.className, 'archive-card-details', 'Card interpretation owns the right-hand grid column');
  assert.ok(cards.closest('.archive-card-column'));
  assert.ok(cards.classList.contains('is-entering'));
  assert.equal(t.document.querySelectorAll('.archive-card').length, 3);
  assert.equal([...t.document.querySelectorAll('.archive-card-meaning')].every(panel => panel.hidden), true);
  assert.equal(t.$('.archive-card-prompt').hidden, false);
  t.click('[data-archive-card="1"]');
  assert.equal(t.$('[data-archive-card="1"]').getAttribute('aria-pressed'), 'true');
  assert.equal(t.$('#archive-meaning-1').hidden, false);
  assert.ok(t.$('#archive-meaning-1').closest('.archive-card-details'));
  assert.ok(t.$('#archive-meaning-1').textContent.includes(saved.interpretations[1].text));
  assert.equal(t.$('.archive-card-prompt').hidden, true);
  const journalCss = fs.readFileSync(path.join(__dirname, '../dist/journal.css'), 'utf8');
  assert.match(journalCss, /\.frame-heading\{[^}]*border-bottom:0/);
  assert.match(journalCss, /\.frame-overall\{[^}]*border:0/);
  assert.match(journalCss, /\.timeline-section\{[^}]*max-width:none[^}]*margin:70px 0 44px[^}]*padding:0 30px/);
  t.click('#open-composer');
  assert.equal(t.$('.reading-frame').classList.contains('detail-entering'), false, 'Internal updates do not replay the frame entrance');
  t.dom.window.close();
});

test('wheel, keyboard, and drag work on the draw page; selecting does not reset scroll', () => {
  const t = boot(); t.begin(); t.tick(2300);
  const hand = t.$('#scroll-deck');
  hand.dispatchEvent(new t.window.WheelEvent('wheel', { deltaY: 200, cancelable: true }));
  assert.equal(hand.scrollLeft, 200);
  t.$('[data-card="1"]').focus();
  t.$('[data-card="1"]').dispatchEvent(new t.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(t.document.activeElement.dataset.card, '2');
  t.pick(2);
  assert.equal(t.$('#scroll-deck'), hand);
  assert.equal(hand.scrollLeft, 200);
  const pointer = (name, x) => { const e = new t.window.Event(name, { bubbles: true, cancelable: true }); Object.assign(e, { pointerType: 'mouse', pointerId: 1, button: 0, clientX: x }); hand.dispatchEvent(e); };
  pointer('pointerdown', 400); pointer('pointermove', 300); pointer('pointerup', 300);
  assert.equal(hand.scrollLeft, 300);
  t.click('[data-card="4"]');
  t.tick(620);
  assert.equal(t.document.querySelectorAll('.draw-slot.filled').length, 1, 'A drag must not also choose a card');
  t.pick(4);
  assert.equal(t.document.querySelectorAll('.draw-slot.filled').length, 2);
  t.dom.window.close();
});

test('rapid or repeated clicks cannot duplicate cards or create multiple readings', () => {
  const t = boot(); t.begin(); t.tick(2300);
  t.click('[data-card="1"]'); t.click('[data-card="1"]'); t.click('[data-card="3"]');
  t.tick(620);
  assert.equal(t.document.querySelectorAll('.draw-slot.filled').length, 1);
  t.pick(3); t.pick(5); t.tick(2700);
  t.tick(10000);
  assert.equal(t.entries().length, 1);
  assert.equal(new Set(t.entries()[0].cards.map(x => x.id)).size, 3);
  t.dom.window.close();
});

test('shuffle again replays the shuffle and clears selections without creating an entry', () => {
  const t = boot(); t.begin(); t.tick(2300); t.pick(1);
  t.click('#shuffle-again');
  assert.ok(t.$('.draw-stage.shuffling'));
  assert.equal(t.document.querySelectorAll('.draw-slot.filled').length, 0);
  t.tick(2300);
  assert.equal(t.document.querySelectorAll('.hand-card:not(:disabled)').length, 78);
  assert.equal(t.entries().length, 0);
  t.result(); assert.ok(t.$('.result-stage'));
  t.dom.window.close();
});

test('leaving during shuffle or a card flight cancels stale callbacks and can resume', () => {
  const t = boot(); t.begin();
  t.click('[data-nav="journal"]'); t.tick(3000); t.click('[data-nav="reading"]');
  assert.ok(t.$('.draw-stage.choosing'));
  t.click('[data-card="1"]');
  t.click('[data-nav="home"]'); t.tick(3000); t.click('[data-nav="reading"]');
  assert.equal(t.document.querySelectorAll('.draw-slot.filled').length, 1);
  t.pick(3); t.click('[data-card="5"]');
  t.click('[data-nav="journal"]'); t.tick(5000);
  assert.equal(t.entries().length, 1);
  assert.ok(t.$('.journal-list'));
  t.click('[data-nav="reading"]');
  assert.ok(t.$('.result-stage'));
  assert.equal(t.document.querySelectorAll('.flying-card').length, 0);
  t.dom.window.close();
});

test('a new reading is not overwritten by a previous shuffle timeout', () => {
  const t = boot(); t.begin('First question'); t.tick(1000);
  t.click('[data-nav="home"]'); t.begin('Second question'); t.tick(1300);
  assert.ok(t.$('.draw-stage.shuffling'));
  t.tick(1000); t.result();
  assert.equal(t.entries().length, 1);
  assert.equal(t.entries()[0].question, 'Second question');
  t.dom.window.close();
});

test('legacy journal positions are kept, while new readings use the time spread', () => {
  const old = { id: 'old', date: '2026-11-18T16:00:00Z', question: 'An earlier question', topic: 'self', cards: [{ id: 'major-0', reverse: false }, { id: 'cups-2', reverse: true }, { id: 'swords-3', reverse: false }], notes: 'An earlier note', next: '' };
  const t = boot({ legacy: [old] });
  t.click('[data-nav="journal"]'); t.click('[data-entry="old"]');
  assert.deepEqual([...t.document.querySelectorAll('.archive-card .eyebrow')].map(x => x.textContent), ['The Present', 'The Hidden Influence', 'The Guidance']);
  assert.ok(t.$('.timeline-content').textContent.includes(old.notes));
  t.click('[data-nav="home"]'); t.begin(); t.tick(2300); t.result();
  t.click('[data-nav="journal"]'); t.click('[data-entry="old"]');
  assert.equal(t.$('.archive-heading h1').textContent, old.question);
  t.click('[data-nav="reading"]');
  assert.ok(t.$('.result-stage'));
  assert.equal(t.$('.interpretation .eyebrow').textContent, 'Past');
  t.dom.window.close();
});

test('reduced-motion mode still completes the flow without waiting for CSS animations', () => {
  const t = boot({ reduced: true }); t.begin(); t.tick(1); t.result();
  assert.ok(t.$('.result-stage'));
  assert.equal(t.entries().length, 1);
  t.dom.window.close();
});

test('a storage write error does not trap the user in settling', () => {
  const t = boot(); t.begin(); t.tick(2300);
  t.window.Storage.prototype.setItem = () => { throw new Error('Quota exceeded'); };
  t.result();
  assert.ok(t.$('.result-stage'));
  assert.ok([...t.document.querySelectorAll('.toast')].some(x => x.textContent.includes('could not save')));
  t.dom.window.close();
});

test('card overlap and focus lift keep a stable button target; flipping is separate from reversal', () => {
  const t = boot();
  const style = t.document.createElement('style');
  style.textContent = fs.readFileSync(path.join(__dirname, '../dist/draw.css'), 'utf8');
  t.document.head.append(style);
  t.begin(); t.tick(2300);
  assert.ok(style.sheet.cssRules.length > 30, 'The motion stylesheet parses into CSS rules');
  assert.equal(t.window.getComputedStyle(t.$('#app')).maxWidth, 'none');
  assert.ok(parseFloat(t.window.getComputedStyle(t.$('.draw-stage')).getPropertyValue('--overlap')) < 0);
  const button = t.$('[data-card="2"]'); button.focus();
  assert.equal(t.window.getComputedStyle(button).zIndex, '100');
  assert.equal(t.window.getComputedStyle(button.querySelector('.hand-card-surface')).transform, 'translateY(-18px)');
  assert.notEqual(t.window.getComputedStyle(button).transform, 'translateY(-18px)', 'The hit target should not move with the artwork');
  t.window.Math.random = () => 0.2;
  t.click('#shuffle-again'); t.tick(2300); t.result();
  assert.equal(t.document.querySelectorAll('.reading-card-front img.is-reversed').length, 3);
  assert.equal(t.window.getComputedStyle(t.$('.reading-card-front img')).transform, 'rotate(180deg)');
  assert.equal(t.window.getComputedStyle(t.$('.reading-card-rotator')).transform, 'rotateY(180deg)');
  const resultCards = [...t.document.querySelectorAll('.reading-card')];
  assert.equal(new Set(resultCards.map(card => t.window.getComputedStyle(card).height)).size, 1, 'Reading card frames have one fixed height');
  assert.equal(t.window.getComputedStyle(t.$('.reading-card button')).alignItems, 'stretch');
  const css = style.textContent;
  assert.match(css, /\.slot-target[^}]*aspect-ratio:\s*300\s*\/\s*527/);
  assert.match(css, /\.draw-slots[^}]*padding:\s*16px 0/);
  assert.match(css, /\.hand-card[^}]*aspect-ratio:\s*300\s*\/\s*527/);
  assert.match(css, /\.reading-card-art[^}]*aspect-ratio:\s*300\s*\/\s*527/);
  assert.match(css, /\.spread[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, 'The three result frames fill the available row equally');
  assert.match(css, /\.reading-card-art[^}]*width:\s*100%/, 'Each card face fills its frame width');
  assert.match(css, /\.interpretation > \.eyebrow, \.interpretation \.overall > \.eyebrow\s*\{\s*color:\s*var\(--gold\)/);
  assert.match(css, /\.card-hand[^}]*scrollbar-width:\s*none/);
  assert.match(css, /\.card-hand::\-webkit-scrollbar[^}]*display:\s*none/);
  assert.doesNotMatch(css, /reflection-in/);
  t.dom.window.close();
});

test('the design system uses five type sizes, two shadows, and a compact draw layout', () => {
  const css = ['styles.css', 'draw.css', 'journal.css'].map(file => fs.readFileSync(path.join(__dirname, '../dist', file), 'utf8')).join('\n');
  const typeTokens = [...css.matchAll(/--type-[\w-]+\s*:/g)].map(match => match[0]);
  assert.deepEqual([...new Set(typeTokens)].sort(), ['--type-body:', '--type-display:', '--type-heading:', '--type-sm:', '--type-xs:']);
  assert.equal(/(?:font-size|font)\s*:[^;}]*?(?:\d+px|clamp\()/.test(css), false, 'Font declarations only reference the five tokens');
  const shadowValues = [...css.matchAll(/box-shadow\s*:\s*([^;}]+)/g)].map(match => match[1].trim());
  assert.deepEqual([...new Set(shadowValues)].sort(), ['none', 'var(--shadow-card)', 'var(--shadow-glow)']);
  const drawCss = fs.readFileSync(path.join(__dirname, '../dist/draw.css'), 'utf8');
  assert.match(drawCss, /grid-template-rows:\s*auto auto auto/);
  assert.match(drawCss, /align-content:\s*center/);
  assert.doesNotMatch(drawCss, /grid-template-rows:\s*auto 1fr auto/);
});

test('saved cards and their interpretations survive a reload and every deck image exists', () => {
  const t = boot(); t.begin(); t.tick(2300); t.result();
  const entries = t.entries();
  for (const img of t.document.querySelectorAll('.reading-card-front img')) {
    assert.ok(fs.existsSync(path.join(__dirname, '../dist', img.getAttribute('src'))));
  }
  const refreshed = boot({ journal: entries });
  refreshed.click('[data-nav="journal"]'); refreshed.click(`[data-entry="${entries[0].id}"]`);
  assert.deepEqual([...refreshed.document.querySelectorAll('.archive-card .eyebrow')].map(x => x.textContent), ['Past', 'Present', 'Future']);
  for (const interpretation of entries[0].interpretations) assert.ok(refreshed.$('.journal-detail').textContent.includes(interpretation.text));
  assert.deepEqual(refreshed.entries(), entries);
  t.dom.window.close(); refreshed.dom.window.close();
});

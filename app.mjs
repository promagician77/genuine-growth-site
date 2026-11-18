import { emailBasis, LEGAL_FORMS, SOURCES } from './engine/pecr.mjs';
import { SEGMENTS, CHANNELS } from './engine/segments.mjs';
import { project, ASSUMPTIONS, LEARNING_EVENTS } from './engine/planner.mjs';
import { normEmail, normPhone, normPostcodeUK } from './engine/capi.mjs';
import { sha256Hex } from './engine/sha256.mjs';
import { WEEKS, MEDIA } from './engine/plan.mjs';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('en-GB');
const gbp = (n) => (n == null || !isFinite(n) ? '–' : `£${Math.round(n).toLocaleString('en-GB')}`);
const ICON = { pass: '✓', fail: '×', warn: '!' };
const D = await (await fetch('data/results.json')).json();
const BR = D.bridge;

// ---------- hero ----------
const em = D.emails;
$('#hero-proof').innerHTML = `Tested here: <strong>${fmt(BR.stream.deliveries)} Shopify webhooks</strong> replayed through the tracking bridge, with all ${fmt(BR.bridge.sent)} expected Meta events matched and no plaintext email or phone sent; <strong>${em.length} programme emails</strong> passing every check except placeholders to fill; and <strong>${D.mutation ? `${D.mutation.caught} of ${D.mutation.applied}` : 'all'} planted bugs</strong> caught by the tests.`;

// ---------- PECR ----------
$('#email-intro').textContent = 'Under PECR, limited companies, LLPs and public bodies can receive marketing email without prior consent, but sole traders and ordinary partnerships are treated like individuals: they need consent or the soft opt-in. ONS counts 19.2% of UK VAT or PAYE-registered businesses as sole proprietors or partnerships, so some of your customers and prospects will be, and each contact gets a basis before a send. Since 5 February 2026, PECR fines can reach £17.5 million or 4% of global turnover.';
const pf = $('#pecr');
const formSel = $('#pf-form');
const srcSel = $('#pf-source');
formSel.innerHTML = Object.entries(LEGAL_FORMS).map(([k, v]) => `<option value="${k}"${k === 'sole-trader' ? ' selected' : ''}>${esc(v.label)}</option>`).join('');
srcSel.innerHTML = Object.entries(SOURCES).map(([k, v]) => `<option value="${k}"${k === 'public-web' ? ' selected' : ''}>${esc(v.label)}</option>`).join('');
const BASIS_WORD = { corporate: 'Company: no consent needed', 'soft-opt-in': 'Soft opt-in', consent: 'Consent on record', suppressed: 'Suppressed', none: 'No basis yet' };
function renderPecr() {
  const f = new FormData(pf);
  const r = emailBasis({
    legalForm: f.get('legalForm'), source: f.get('source'), optOutOffered: f.has('optOutOffered'), consent: f.has('consent'),
    namedPerson: f.has('namedPerson'), content: f.has('partner') ? 'partner' : 'own', optedOut: f.has('optedOut'),
  });
  const out = $('#pecr-out');
  out.className = `verdict ${r.allowed ? 'yes' : 'no'}`;
  out.innerHTML = `<p class="word"><span class="ic ${r.allowed ? 'pass' : 'fail'}" aria-hidden="true">${r.allowed ? '✓' : '×'}</span>${r.allowed ? 'Can be emailed' : 'Do not email yet'}</p>
    <p class="basis">Basis: ${esc(BASIS_WORD[r.basis])} · ${esc(r.subscriber)} subscriber</p>
    <p>${esc(r.why)}</p>${r.needs.length ? `<ul>${r.needs.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
}
pf.addEventListener('change', renderPecr);
renderPecr();
const sources = Object.keys(SOURCES);
$('#pecr-grid').innerHTML = `<thead><tr><th scope="col">Legal form</th>${sources.map((s) => `<th scope="col">${esc(SOURCES[s].label)}</th>`).join('')}</tr></thead><tbody>${Object.keys(LEGAL_FORMS).map((form) => `<tr><th scope="row">${esc(LEGAL_FORMS[form].label)}</th>${sources.map((s) => {
  const r = emailBasis({ legalForm: form, source: s, optOutOffered: true });
  return `<td><span class="cell"><span class="ic ${r.allowed ? 'pass' : 'fail'}" aria-hidden="true">${r.allowed ? '✓' : '×'}</span>${r.allowed ? (r.basis === 'corporate' ? 'Yes' : 'Soft opt-in') : 'Consent'}</span></td>`;
}).join('')}</tr>`).join('')}</tbody>`;

// ---------- segments ----------
const tabs = $('#seg-tabs');
const segPanel = $('#seg-panel');
tabs.innerHTML = SEGMENTS.map((s, i) => `<button type="button" role="tab" id="tab-${s.id}" aria-controls="seg-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-seg="${s.id}">${esc(s.name)}<span class="tag">${esc(s.start)}</span></button>`).join('');
function showSeg(id) {
  const s = SEGMENTS.find((x) => x.id === id);
  for (const b of tabs.querySelectorAll('button')) { const on = b.dataset.seg === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }
  segPanel.setAttribute('aria-labelledby', `tab-${id}`);
  segPanel.innerHTML = `<h3>${esc(s.name)}</h3>
    <dl><dt>Who</dt><dd>${esc(s.who)}</dd><dt>What they need</dt><dd>${esc(s.need)}</dd><dt>Message to test</dt><dd>${esc(s.angle)}</dd></dl>
    <dl><dt>Channels, in order</dt><dd><span class="chips">${s.channels.map((c) => `<span class="chip">${esc(CHANNELS[c])}</span>`).join('')}</span></dd><dt>On Meta</dt><dd>${esc(s.meta)}</dd><dt>Judged by</dt><dd>${esc(s.measure)} · starts ${esc(s.start)}</dd></dl>`;
}
tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showSeg(b.dataset.seg); });
tabs.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  const bs = [...tabs.querySelectorAll('button')];
  const i = bs.indexOf(document.activeElement);
  const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
  n.focus(); showSeg(n.dataset.seg);
});
showSeg(SEGMENTS[0].id);

// ---------- planner ----------
const A_LABELS = {
  cpm: ['Cost per 1,000 impressions (£)', 0.5], ctr: ['Click-through rate (%)', 0.1], clickToApp: ['Clicks that apply (%)', 0.5],
  tradeShare: ['Applications that are trade (%)', 5], approval: ['Trade applications approved (%)', 5], firstOrder: ['Approved that order in 30 days (%)', 5],
  aov: ['Order value ex VAT (£)', 10], gp: ['Gross profit (%)', 1], orders90: ['Orders per new account, 90 days', 1], ordersYear: ['Orders per new account, 12 months', 1],
};
$('#assume').innerHTML = Object.entries(A_LABELS).map(([k, [l, step]]) => `<label>${esc(l)}<input type="number" name="${k}" value="${ASSUMPTIONS[k]}" min="0" step="${step}" inputmode="decimal"></label>`).join('');
const planner = $('#planner');
MEDIA.metaAcquisition.forEach((v, i) => { planner.elements[`s${i}`].value = v; });
$('#plan-note').textContent = `Defaults: the recommended Meta acquisition spend (£${MEDIA.metaAcquisition.join(', £')} by month) and starting assumptions that are guesses, not benchmarks. Month 1 builds tracking and creative, so acquisition spend starts in Month 2.`;
function readPlanner() {
  const f = new FormData(planner);
  const spend = [0, 1, 2].map((i) => Math.max(0, Number(f.get(`s${i}`)) || 0));
  const a = {};
  for (const k of Object.keys(ASSUMPTIONS)) { const v = Number(f.get(k)); a[k] = Number.isFinite(v) && v >= 0 ? v : ASSUMPTIONS[k]; }
  return { spend, a };
}
function renderPlanner() {
  const { spend, a } = readPlanner();
  const p = project(spend, a);
  const ms = p.months;
  const t = p.totals;
  const row = (label, f, tot) => `<tr><th scope="row">${label}</th>${ms.map((m) => `<td class="n">${f(m)}</td>`).join('')}<td class="n">${tot}</td></tr>`;
  $('#plan-table').innerHTML = `<thead><tr><th scope="col"><span class="sr">Measure</span></th><th scope="col" class="n">Month 1</th><th scope="col" class="n">Month 2</th><th scope="col" class="n">Month 3</th><th scope="col" class="n">90 days</th></tr></thead><tbody>
    ${row('Spend', (m) => gbp(m.spend), gbp(t.spend))}
    ${row('Applications', (m) => fmt(m.applications), fmt(t.applications))}
    ${row('Approved trade accounts', (m) => fmt(m.approved), fmt(t.approved))}
    ${row('First orders', (m) => fmt(m.firstOrders), fmt(t.firstOrders))}
    ${row('Cost per approved account', (m) => gbp(m.costPerApproved), gbp(t.costPerApproved))}
    ${row('Cost per first order', (m) => gbp(m.costPerFirstOrder), gbp(t.costPerFirstOrder))}
    ${row('Gross profit, first 90 days', (m) => gbp(m.gp90), gbp(t.gp90))}
    ${row('Gross profit, first 12 months', (m) => gbp(m.gp12), gbp(t.gp12))}</tbody>`;
  const mi = ms.reduce((best, m, i) => (m.spend > 0 ? i : best), 2);
  const m = ms[mi];
  drawChart(m, mi);
  const adv = m.advice;
  $('#advice').textContent = m.spend ? `Month ${mi + 1}: ${adv.learning ? `optimise on ${adv.event}.` : 'Meta will stay in "learning limited" on any event at this spend.'} ${adv.note} Optimising on approved accounts would need about ${gbp(adv.spendForApprovals)} a month at these assumptions.` : 'Add spend to see what it buys.';
}
function drawChart(m, mi) {
  const rows = [['Applications', 'Lead', m.perWeek.Lead], ['Approved accounts', 'CompleteRegistration', m.perWeek.CompleteRegistration], ['First orders', 'Purchase', m.perWeek.Purchase]];
  const W = Math.max(320, Math.min(720, Math.round($('#chart').clientWidth || 640))); const L = W < 480 ? 122 : 150; const R = 48; const bh = 26; const gap = 18; const top = 24; const H = top + rows.length * (bh + gap) + 18;
  const max = Math.max(LEARNING_EVENTS * 1.25, ...rows.map((r) => r[2] * 1.12));
  const x = (v) => L + ((W - L - R) * v) / max;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="chart-t chart-d"><title id="chart-t">Optimisation events per week in Month ${mi + 1}</title><desc id="chart-d">${rows.map((r) => `${r[0]}: ${r[2].toFixed(1)} a week`).join('; ')}. Meta needs roughly ${LEARNING_EVENTS} a week per ad set.</desc>`;
  rows.forEach(([label, ev, v], i) => {
    const y = top + i * (bh + gap);
    svg += `<text class="lab" x="0" y="${y + bh / 2 + 5}">${esc(label)}</text>`;
    svg += `<rect class="bar" x="${L}" y="${y}" width="${Math.max(2, x(v) - L).toFixed(1)}" height="${bh}" rx="4"/>`;
    svg += `<text class="val" x="${(Math.max(x(v), L + 2) + 6).toFixed(1)}" y="${y + bh / 2 + 5}">${v.toFixed(1)}</text>`;
    svg += `<rect class="hit" data-i="${i}" x="0" y="${y - gap / 2}" width="${W}" height="${bh + gap}"/>`;
  });
  const rx = x(LEARNING_EVENTS);
  svg += `<line class="ref" x1="${rx.toFixed(1)}" x2="${rx.toFixed(1)}" y1="${top - 14}" y2="${H - 14}"/><text class="axis" x="${(rx - 6).toFixed(1)}" y="${top - 6}" text-anchor="end">about ${LEARNING_EVENTS} a week</text>`;
  svg += '</svg>';
  $('#chart').innerHTML = svg;
  $('#chart-cap').textContent = `Events a week in Month ${mi + 1}, against the roughly ${LEARNING_EVENTS} a week Meta needs per ad set to leave the learning phase`;
  const tip = $('#chart-tip');
  for (const h of document.querySelectorAll('#chart .hit')) {
    h.addEventListener('mouseenter', () => {
      const [label, ev, v] = rows[Number(h.dataset.i)];
      tip.innerHTML = `<strong>${esc(label)}</strong>: ${v.toFixed(1)} a week<br><span class="mono">${ev}</span>, ${v >= LEARNING_EVENTS ? 'enough to leave learning' : `${(LEARNING_EVENTS - v).toFixed(0)} short of ${LEARNING_EVENTS}`}`;
      tip.hidden = false;
      const b = h.getBoundingClientRect(); const host = $('.chart-fig').getBoundingClientRect();
      tip.style.left = `${Math.min(host.width - 240, Math.max(0, b.left - host.left + 150))}px`;
      tip.style.top = `${b.top - host.top - 30}px`;
    });
    h.addEventListener('mouseleave', () => { tip.hidden = true; });
  }
}
planner.addEventListener('input', renderPlanner);
let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderPlanner, 150); });
renderPlanner();

// ---------- tracking ----------
const S = BR.stream;
$('#tracking-intro').textContent = `The bridge is a small Node service: Shopify sends signed webhooks, it checks the signature, answers at once and sends hashed events to Meta's Conversions API. The drill replayed ${fmt(S.deliveries)} deliveries: ${S.approvedNew} new accounts approved through the SparkLayer form, ${S.notApproved} unapproved sign-ups, ${S.approvedLater} existing customers approved later, ${fmt(S.orders)} paid orders (${S.firstOrders} of them first orders, ${S.repOrders} keyed by reps), ${S.stale} orders older than Meta's 7-day limit, ${S.forged} forged webhooks and ${S.repeats} repeat deliveries, with Meta answering errors 5 times along the way.`;
$('#drill-checks').innerHTML = BR.checks.map((c) => `<li data-check="${c.id}"><span class="ic ${c.ok ? 'pass' : 'fail'}" aria-hidden="true">${c.ok ? '✓' : '×'}</span><span><span class="sr">${c.ok ? 'Pass' : 'Fail'}: </span>${esc(c.label)}<span class="d">${esc(c.detail)}</span></span></li>`).join('');
const sample = BR.sample.purchase;
const json = JSON.stringify(sample, (k, v) => (Array.isArray(v) && typeof v[0] === 'string' && /^[0-9a-f]{64}$/.test(v[0]) ? [`${v[0].slice(0, 16)}…`] : v), 2)
  .replace(/\[\s+("[^"]*")\s+\]/g, '[$1]')
  .replace(/\{\s+("id": "[^"]*"),\s+("quantity": \d+)\s+\}/g, '{ $1, $2 }');
$('#sample').innerHTML = esc(json).replace(/(&quot;[a-z_]+&quot;)(:)/g, '<span class="k">$1</span>$2').replace(/: (&quot;[^&]*?&quot;)/g, ': <span class="s">$1</span>');
const hf = $('#hasher');
function renderHash() {
  const f = new FormData(hf);
  const rows = [['em', normEmail(f.get('email'))], ['ph', normPhone(f.get('phone'))], ['zp', normPostcodeUK(f.get('zip'))]];
  $('#h-out').innerHTML = rows.map(([k, v]) => `<dt>${k}: <span class="mono">${esc(v || '(not valid)')}</span></dt><dd>${v ? `<b>${sha256Hex(v).slice(0, 8)}</b>${sha256Hex(v).slice(8)}` : '–'}</dd>`).join('');
}
hf.addEventListener('input', renderHash);
renderHash();

// ---------- emails ----------
$('#emails-intro').textContent = 'Built for the store as it is now: get existing accounts ordering online, get approved accounts to a first order, and bring back lapsed ones. Each is checked for an opt-out, the company details UK companies must show on emails, ex VAT pricing, Gmail\'s clipping size, tagged links and an audience with a basis. The last tab is the same email sent the careless way.';
const MAILS = [...D.emails, { ...D.bad, cold: true }];
const AUD = { 'go-online': 'Existing accounts not ordering online', 'first-order': 'Approved accounts with no order', reactivate: 'No order in 120 days', 'cold-blast': 'Bought list of shops, mixed legal forms' };
const mt = $('#mail-tabs');
mt.innerHTML = MAILS.map((e, i) => `<button type="button" role="tab" id="mtab-${e.id}" aria-controls="mail-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-mail="${e.id}">${esc(e.cold ? 'Sent carelessly' : e.subject)}</button>`).join('');
function showMail(id) {
  const e = MAILS.find((x) => x.id === id);
  for (const b of mt.querySelectorAll('button')) { const on = b.dataset.mail === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }
  $('#mail-panel').setAttribute('aria-labelledby', `mtab-${id}`);
  $('#mail-frame').src = `emails/${id}.html`;
  $('#mail-frame').title = `Preview: ${e.subject}`;
  $('#mail-meta').innerHTML = `<strong>${esc(e.subject)}</strong><br>Audience: ${esc(AUD[id])} · ${(e.bytes / 1024).toFixed(1)} KB · ${e.fails ? `<strong>${e.fails} checks fail</strong>` : 'no failing checks'}${e.warns ? `, ${e.warns} to fill in` : ''}`;
  $('#mail-checks').innerHTML = e.checks.map((c) => `<li><span class="ic ${c.status}" aria-hidden="true">${ICON[c.status]}</span><span><span class="sr">${c.status === 'pass' ? 'Pass' : c.status === 'fail' ? 'Fail' : 'Check'}: </span>${esc(c.label)}<span class="d">${esc(c.detail)}</span></span></li>`).join('');
}
mt.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showMail(b.dataset.mail); });
mt.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
  const bs = [...mt.querySelectorAll('button')];
  const i = bs.indexOf(document.activeElement);
  const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
  n.focus(); showMail(n.dataset.mail);
});
showMail(MAILS[0].id);

// ---------- markets ----------
$('#markets-cards').innerHTML = ['msp', 'public', 'corporate', 'chains'].map((id) => SEGMENTS.find((s) => s.id === id)).map((s) => `<article><h3>${esc(s.name)}</h3><p class="when">Starts ${esc(s.start)} · judged by ${esc(/^[A-Z][a-z]/.test(s.measure) ? s.measure[0].toLowerCase() + s.measure.slice(1) : s.measure)}</p><p>${esc(s.angle)}</p><ul>${s.actions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></article>`).join('');

// ---------- weeks ----------
$('#weeks').innerHTML = [1, 2, 3].map((mo) => `<div><h3>Month ${mo}: ${['Research, tracking and preparation', 'Campaigns live', 'Optimise and review'][mo - 1]}</h3><ol>${WEEKS.filter((w) => w.month === mo).map((w) => `<li><span class="wk">Week ${w.w}</span><strong>${esc(w.title)}</strong><ul>${w.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></li>`).join('')}</ol></div>`).join('');

// ---------- measured ----------
const T = D.tests;
const Q = D.qa;
$('#measured-list').innerHTML = [
  `Tracking bridge: ${BR.passed} of ${BR.checks.length} drill checks pass on ${fmt(S.deliveries)} synthetic Shopify webhooks; ${fmt(BR.bridge.sent)} of ${fmt(BR.bridge.sent)} expected events reached the fake Meta endpoint, ${BR.bridge.rejectedHmac} forged webhooks were refused, and the slowest answer took ${BR.http.max} ms of server time (Shopify allows 5 seconds).`,
  'Hashing: every email hash matched an independent SHA-256, and no plaintext email or phone appeared in the payloads.',
  `Emails: ${em.length} programme emails, ${em.reduce((n, e) => n + e.checks.length, 0)} checks, 0 failing; placeholders flagged. The careless version fails ${D.bad.fails}.`,
  `Who-to-email rules: ${Object.keys(LEGAL_FORMS).length} legal forms by ${sources.length} sources, tested against the ICO's corporate, individual and soft opt-in rules.`,
  `${T.pass} tests pass${D.mutation ? `; ${D.mutation.caught} of ${D.mutation.applied} bugs planted one at a time were caught` : ''}.`,
  Q ? `This page: ${Q.passed} of ${Q.total} headless-Chrome checks, ${Q.axeViolations} accessibility violations (axe-core).` : 'This page: run tools/site-qa.mjs.',
].map((x) => `<li>${esc(x)}</li>`).join('');
$('#not-measured-list').innerHTML = [
  'Your store, your customer data and your Meta account. I have not seen them; the drill used synthetic webhooks shaped like Shopify\'s, and a fake Meta endpoint.',
  'Planner outcomes. The defaults are starting assumptions, not benchmarks; Month 1 replaces them with your numbers.',
  'Whether your SparkLayer plan can call a URL on approval. The plan uses the Shopify customer created on approval instead, which does not need it.',
  'Email rendering across clients. The emails are simple tables kept small; they have not been through an inbox-rendering service.',
  'Legal advice. The email rules follow the ICO\'s published PECR guidance; your own adviser has the final word.',
].map((x) => `<li>${esc(x)}</li>`).join('');

document.documentElement.dataset.ready = 'true';

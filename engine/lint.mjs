// Pre-send checks for a B2B marketing email from a UK company.
//   PECR: identify the sender and give a way to opt out in every message; send only to audiences with a basis.
//   Trading disclosures: registered name, place of registration, registered number and registered office.
//   Trade pricing: every £ figure says ex VAT (or + VAT).
//   Gmail clips HTML over about 102KB.
import { PROGRAMME_AUDIENCES } from './pecr.mjs';

export const GMAIL_CLIP_BYTES = 102 * 1024;
export const WARN_BYTES = 90 * 1024;

const visibleText = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&pound;/g, '£').replace(/&#163;/g, '£')
  .replace(/\s+/g, ' ').trim();

const links = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: m[1], text: visibleText(m[2]) }));

export function lintEmail({ html, text = '', programme, audienceBases = [] }) {
  const checks = [];
  const add = (id, label, status, detail) => checks.push({ id, label, status, detail });
  const bytes = new TextEncoder().encode(html).length;
  const body = visibleText(html);
  const ls = links(html);

  add('size', 'Under Gmail\'s clipping size', bytes > GMAIL_CLIP_BYTES ? 'fail' : bytes > WARN_BYTES ? 'warn' : 'pass', `${(bytes / 1024).toFixed(1)} KB of HTML (Gmail clips at about 102 KB)`);

  const unsub = ls.find((l) => /unsubscribe|opt out/i.test(l.text));
  add('opt-out', 'Opt-out link in the email', unsub ? 'pass' : 'fail', unsub ? `"${unsub.text}"` : 'No unsubscribe or opt-out link found');

  const sender = /Genuine Solutions/.test(body) && /Registered office|registered office/.test(body);
  add('sender', 'Sender named, with a postal address', sender ? 'pass' : 'fail', sender ? 'Company name and registered office in the footer' : 'Footer must name the sender and give an address');

  const disc = {
    place: /Registered in (England and Wales|England & Wales|Scotland|Northern Ireland)/.test(body),
    number: /Company (No\.|number):?\s*(\d{8}|[A-Z]{2}\d{6}|\[[^\]]+\])/.test(body),
    office: /Registered office:?\s*\S/.test(body),
  };
  const missing = Object.entries(disc).filter(([, v]) => !v).map(([k]) => k);
  add('disclosures', 'Company disclosures (place, number, registered office)', missing.length ? 'fail' : 'pass', missing.length ? `Missing: ${missing.join(', ')}` : 'All three present');

  const placeholders = [...new Set(body.match(/\[[^\]]{2,40}\]/g) || [])];
  add('placeholders', 'No unfilled placeholders', placeholders.length ? 'warn' : 'pass', placeholders.length ? `To fill before sending: ${placeholders.join(', ')}` : 'None');

  const prices = [...body.matchAll(/£\s?(?:\d[\d,]*(?:\.\d{2})?|\[[^\]]*\])/g)];
  const unlabelled = prices.filter((m) => !/^.{0,24}?(ex\.? VAT|\+ ?VAT)/i.test(body.slice(m.index + m[0].length)));
  add('ex-vat', 'Every price says ex VAT', unlabelled.length ? 'fail' : 'pass', prices.length ? `${prices.length - unlabelled.length} of ${prices.length} prices labelled` : 'No prices in this email');

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt="[^"]+"/i.test(t));
  add('alt', 'Images have alt text', noAlt.length ? 'fail' : 'pass', imgs.length ? `${imgs.length - noAlt.length} of ${imgs.length} images` : 'No images: text-first email');

  const pre = html.match(/<div[^>]*data-preheader[^>]*>([\s\S]*?)<\/div>/i);
  const preText = pre ? visibleText(pre[1]) : '';
  add('preheader', 'Preview text set', preText && preText.length <= 140 ? 'pass' : 'warn', preText ? `${preText.length} characters` : 'No preview text');

  const textOk = text.trim().length > 0 && unsub && text.includes(unsub.href);
  add('text-part', 'Plain-text version with the opt-out link', textOk ? 'pass' : 'fail', textOk ? `${text.trim().split(/\s+/).length} words` : 'Missing, or no opt-out link in it');

  const campaign = ls.filter((l) => /^https?:/i.test(l.href) && l !== unsub && !/unsubscribe|preferences/i.test(l.href));
  const insecure = ls.filter((l) => /^http:/i.test(l.href));
  const untagged = campaign.filter((l) => !/[?&]utm_source=email\b/.test(l.href) || !/[?&]utm_campaign=/.test(l.href));
  add('links', 'Links are https and tagged for reporting', insecure.length || untagged.length ? 'fail' : 'pass', `${campaign.length - untagged.length} of ${campaign.length} links tagged${insecure.length ? `; ${insecure.length} not https` : ''}`);

  const rule = PROGRAMME_AUDIENCES[programme];
  const bad = rule ? audienceBases.filter((b) => !rule.allowed.includes(b)) : ['unknown programme'];
  add('audience', 'Audience has a basis to receive it', !audienceBases.length || bad.length ? 'fail' : 'pass', bad.length ? `Not allowed for this email: ${bad.join(', ')}` : `${rule.label}: ${audienceBases.join(', ')}`);

  const fails = checks.filter((c) => c.status === 'fail').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  return { checks, bytes, fails, warns, words: body.split(/\s+/).length };
}

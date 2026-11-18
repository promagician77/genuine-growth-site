// Shopify (with SparkLayer) webhook payloads -> Meta Conversions API events.
//   customers/create or customers/update carrying the approval tag -> CompleteRegistration (an approved trade account)
//   orders/paid                                                    -> Purchase, ex VAT, first_order flagged
// SparkLayer Forms creates the Shopify customer, with its tags, when an application is approved.
// The application itself is a browser event (Lead) fired by the pixel on the form's success state.
import { userData } from './capi.mjs';

export const DEFAULTS = {
  approvedTag: 'b2b-approved',
  segmentPrefix: 'segment:',
  repOrderTag: 'rep-order',
  currency: 'GBP',
  shopUrl: 'https://genuinesolutions.co.uk',
  maxAgeSeconds: 7 * 86400,
};

export const tagsOf = (s) => String(s ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
const secs = (iso) => Math.floor(Date.parse(iso) / 1000);
const money = (x) => Math.round(Number(x || 0) * 100) / 100;

function noteAttr(order, name) {
  const a = (order.note_attributes || []).find((n) => n.name === name);
  return a ? String(a.value) : undefined;
}

function segmentOf(tags, cfg) {
  const t = tags.find((x) => x.startsWith(cfg.segmentPrefix));
  return t ? t.slice(cfg.segmentPrefix.length) : 'unassigned';
}

function stale(eventTime, nowSec, cfg) {
  return nowSec - eventTime > cfg.maxAgeSeconds;
}

/** customers/create and customers/update. Returns {event} or {skip: reason}. */
export function fromCustomer(customer, { now = Date.now(), config = {} } = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const tags = tagsOf(customer.tags);
  if (!tags.includes(cfg.approvedTag)) return { skip: 'not-approved' };
  const t = secs(customer.updated_at || customer.created_at);
  if (stale(t, Math.floor(now / 1000), cfg)) return { skip: 'stale' };
  const a = customer.default_address || {};
  return {
    event: {
      event_name: 'CompleteRegistration',
      event_time: t,
      event_id: `approved-${customer.id}`,
      action_source: 'system_generated',
      user_data: userData({
        email: customer.email, phone: customer.phone || a.phone, firstName: customer.first_name, lastName: customer.last_name,
        city: a.city, zip: a.zip, country: a.country_code, customerId: customer.id,
      }),
      custom_data: { status: 'approved', segment: segmentOf(tags, cfg), content_name: 'trade_account' },
    },
  };
}

/** orders/paid. ctx.hasOrdered(customerId) tells whether this account has ordered before. */
export function fromOrder(order, { now = Date.now(), config = {}, hasOrdered = () => false } = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const c = order.customer || {};
  if (!c.id) return { skip: 'no-customer' };
  const t = secs(order.processed_at || order.created_at);
  if (stale(t, Math.floor(now / 1000), cfg)) return { skip: 'stale' };
  const tags = tagsOf(c.tags);
  const orderTags = tagsOf(order.tags);
  const rep = order.source_name === 'shopify_draft_order' || orderTags.includes(cfg.repOrderTag);
  const subtotal = Number(order.current_subtotal_price ?? order.subtotal_price ?? 0);
  const tax = order.taxes_included ? Number(order.current_total_tax ?? order.total_tax ?? 0) : 0;
  const a = order.billing_address || c.default_address || {};
  const first = !hasOrdered(c.id);
  const ev = {
    event_name: 'Purchase',
    event_time: t,
    event_id: `order-${order.id}`,
    action_source: rep ? 'system_generated' : 'website',
    user_data: userData({
      email: order.email || c.email, phone: order.phone || c.phone || a.phone, firstName: c.first_name || a.first_name,
      lastName: c.last_name || a.last_name, city: a.city, zip: a.zip, country: a.country_code, customerId: c.id,
      fbp: noteAttr(order, '_fbp'), fbc: noteAttr(order, '_fbc'),
      ip: order.client_details?.browser_ip, userAgent: order.client_details?.user_agent,
    }),
    custom_data: {
      currency: order.currency || cfg.currency,
      value: money(subtotal - tax),
      order_id: String(order.id),
      first_order: first,
      segment: segmentOf(tags, cfg),
      num_items: (order.line_items || []).reduce((n, li) => n + Number(li.quantity || 0), 0),
      contents: (order.line_items || []).map((li) => ({ id: li.sku || String(li.product_id), quantity: Number(li.quantity || 0) })),
    },
  };
  if (!rep) ev.event_source_url = `${cfg.shopUrl}/checkouts`;
  // Orders keyed in by a sales rep still count for reporting, but Meta should not optimise ad delivery on them.
  if (rep) ev.opt_out = true;
  return { event: ev, first };
}

/** Route any supported topic. */
export function toEvent(topic, payload, ctx = {}) {
  if (topic === 'customers/create' || topic === 'customers/update') return fromCustomer(payload, ctx);
  if (topic === 'orders/paid') return fromOrder(payload, ctx);
  return { skip: 'topic-not-used' };
}

/** The browser half: what the pixel sends when a trade application is submitted. */
export function leadSnippet(eventId = 'app-<uuid>') {
  return `fbq('track', 'Lead', { content_category: 'trade_application' }, { eventID: '${eventId}' });`;
}

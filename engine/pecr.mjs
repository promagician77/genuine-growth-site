// Who Genuine Solutions can send marketing email to, under PECR as the ICO describes it.
// Corporate subscribers (companies, LLPs, Scottish partnerships, public bodies) can be emailed without consent,
// with the sender identified and an opt-out in every message. Individual subscribers (sole traders and
// ordinary partnerships, as well as consumers) need consent or the soft opt-in.
// This is a planning aid, not legal advice.

export const LEGAL_FORMS = {
  ltd: { label: 'Limited company (Ltd)', subscriber: 'corporate' },
  plc: { label: 'Public limited company (PLC)', subscriber: 'corporate' },
  llp: { label: 'Limited liability partnership (LLP)', subscriber: 'corporate' },
  'scottish-partnership': { label: 'Scottish partnership', subscriber: 'corporate' },
  'public-body': { label: 'Public body (council, NHS trust, school)', subscriber: 'corporate' },
  'sole-trader': { label: 'Sole trader', subscriber: 'individual' },
  partnership: { label: 'Ordinary partnership (England, Wales or NI)', subscriber: 'individual' },
  unknown: { label: 'Not known yet', subscriber: 'individual' },
};

export const SOURCES = {
  customer: { label: 'Has bought from Genuine Solutions', negotiation: true },
  applicant: { label: 'Applied for a trade account, not ordered yet', negotiation: true },
  enquiry: { label: 'Asked for trade prices or a quote', negotiation: true },
  newsletter: { label: 'Signed up for trade emails on the site', negotiation: false },
  event: { label: 'Badge scan or card at a trade event', negotiation: false },
  'public-web': { label: "Found on the business's own website", negotiation: false },
  'bought-list': { label: 'Bought or rented list', negotiation: false },
};

/**
 * @param {object} c
 * @param {keyof LEGAL_FORMS} c.legalForm
 * @param {keyof SOURCES} c.source
 * @param {boolean} [c.consent]        specific, recorded consent to email marketing from Genuine Solutions
 * @param {boolean} [c.optOutOffered]  a clear chance to refuse marketing was given when the details were collected
 * @param {boolean} [c.optedOut]       they have asked to stop
 * @param {boolean} [c.namedPerson]    the address belongs to a named person (jo@shop.co.uk), not info@
 * @param {'own'|'partner'} [c.content] own similar products, or marketing on behalf of another organisation
 */
export function emailBasis(c) {
  const form = LEGAL_FORMS[c.legalForm] || LEGAL_FORMS.unknown;
  const source = SOURCES[c.source] || SOURCES['bought-list'];
  const content = c.content || 'own';
  const needs = [];
  const out = (allowed, basis, why) => ({ allowed, basis, why, needs, subscriber: form.subscriber, legalForm: form.label });

  if (c.optedOut) return out(false, 'suppressed', 'They asked to stop. Keep the address on the suppression list so it is never re-imported.');

  if (form.subscriber === 'corporate') {
    needs.push('Say who is sending and give a working way to opt out in every email.');
    if (c.namedPerson) needs.push('A named person\'s work address is personal data: record a legitimate interests assessment and link the privacy notice.');
    return out(true, 'corporate', `${form.label} is a corporate subscriber, so marketing email does not need prior consent.`);
  }

  if (c.legalForm === 'unknown') needs.push('Check Companies House: if it is a company or LLP, it becomes a corporate subscriber.');

  if (c.consent) {
    needs.push('Keep the record: when, where and the wording they agreed to.');
    needs.push('Opt-out link in every email.');
    return out(true, 'consent', 'Individual subscriber with recorded consent.');
  }

  if (source.negotiation) {
    if (content !== 'own') {
      return out(false, 'none', 'The soft opt-in only covers your own similar products, not marketing for another organisation.');
    }
    if (!c.optOutOffered) {
      return out(false, 'none', 'Details came from a sale or trade enquiry, but there was no chance to refuse marketing when they were collected, so the soft opt-in does not apply.');
    }
    needs.push('Opt-out link in every email.');
    needs.push('Only your own similar products: accessories they buy or asked about.');
    return out(true, 'soft-opt-in', `${form.label} is treated as an individual; the soft opt-in applies because the details came from a sale or trade enquiry and they could refuse marketing at the time.`);
  }

  const reach = 'Reach them with Meta or LinkedIn ads, post, or a call screened against TPS and CTPS, and ask for consent there. An email asking for consent is itself marketing.';
  needs.push(reach);
  return out(false, 'none', `${form.label} is treated as an individual, and "${source.label.toLowerCase()}" is not a sale or a trade enquiry, so email needs their consent first.`);
}

// The audiences each email programme may use, checked by the email lint.
export const PROGRAMME_AUDIENCES = {
  'go-online': { label: 'Existing accounts that still order by phone, email or rep', allowed: ['corporate', 'soft-opt-in', 'consent'] },
  'first-order': { label: 'Approved trade accounts with no order yet', allowed: ['corporate', 'soft-opt-in', 'consent'] },
  reactivate: { label: 'Accounts with no order in 120 days', allowed: ['corporate', 'soft-opt-in', 'consent'] },
  prospects: { label: 'New businesses that have never bought', allowed: ['corporate', 'consent'] },
};

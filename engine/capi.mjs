// Normalising and hashing customer information for Meta's Conversions API, following Meta's
// customer information parameter rules (lowercase, trimmed, phone with country code and no leading
// zeros, UK postcodes in area-district-sector form, two-letter country code), then SHA-256.
import { sha256Hex } from './sha256.mjs';

export const normEmail = (s) => String(s ?? '').trim().toLowerCase();

// UK numbers: 07700 900123, +44 (0)7700 900123, 0044 7700 900123 -> 447700900123
export function normPhone(s, countryCode = '44') {
  let d = String(s ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith(countryCode + '0')) d = countryCode + d.slice(countryCode.length + 1);
  else if (d.startsWith('0')) d = countryCode + d.replace(/^0+/, '');
  else if (!d.startsWith(countryCode) && d.length <= 10) d = countryCode + d;
  return d;
}

const letters = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const normName = (s) => letters(String(s ?? '').trim());
export const normCity = (s) => letters(s);

// "KT9 1SJ" -> "kt91" (outward code plus the sector digit)
export function normPostcodeUK(s) {
  const p = String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(p)) return '';
  return (p.slice(0, -3) + p.slice(-3, -2)).toLowerCase();
}

export const normCountry = (s) => {
  const c = String(s ?? '').trim().toLowerCase();
  if (c === 'uk' || c === 'united kingdom' || c === 'great britain') return 'gb';
  return /^[a-z]{2}$/.test(c) ? c : '';
};

const h = (v) => (v ? sha256Hex(v) : undefined);

/** Build Meta user_data from a Shopify customer (and optional address). Only hashed values leave this function, plus fbp/fbc which Meta wants unhashed. */
export function userData({ email, phone, firstName, lastName, city, zip, country, customerId, fbp, fbc, ip, userAgent }) {
  const ud = {
    em: h(normEmail(email)),
    ph: h(normPhone(phone)),
    fn: h(normName(firstName)),
    ln: h(normName(lastName)),
    ct: h(normCity(city)),
    zp: h(normCountry(country) === 'gb' || !country ? normPostcodeUK(zip) : ''),
    country: h(normCountry(country || 'gb')),
    external_id: customerId != null ? h(`shopify-customer-${customerId}`) : undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    client_ip_address: ip || undefined,
    client_user_agent: userAgent || undefined,
  };
  for (const k of Object.keys(ud)) if (ud[k] === undefined) delete ud[k];
  // Meta expects hashed values as lists or strings; lists keep the door open for multiple emails.
  for (const k of ['em', 'ph', 'fn', 'ln', 'ct', 'zp', 'country', 'external_id']) if (ud[k]) ud[k] = [ud[k]];
  return ud;
}

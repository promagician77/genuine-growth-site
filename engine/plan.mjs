// The 90-day plan: what happens each week and what is delivered. Fee and media figures live here too,
// so the proposal, answers and site read from one place.

export const WEEKS = [
  { w: 1, month: 1, title: 'Access and data', items: ['Access to Shopify, SparkLayer, Meta Business Manager, the email platform and analytics, each as my own login', 'Customer export sorted by segment, last order and channel (online, phone, rep)', 'Each contact given an email basis: company, soft opt-in, consent or none'] },
  { w: 2, month: 1, title: 'Tracking', items: ['Pixel Lead on the trade application form', 'Conversions API: approved accounts and paid orders from Shopify, first orders flagged', 'UTM rules for every channel; one weekly report built from Shopify and Meta'] },
  { w: 3, month: 1, title: 'Plan and creative', items: ['Marketing plan with priorities and 90-day targets by segment', 'Ads and landing copy for repair shops, independents and online resellers', 'Registration form reviewed: company number, VAT number and segment questions'] },
  { w: 4, month: 1, title: 'Existing customers first', items: ['Go-online email series and customer-list ads start', 'First-order and reactivation emails built and checked', 'Trade press list and first story pitched'] },
  { w: 5, month: 2, title: 'Acquisition launch', items: ['Meta acquisition live for the three core segments', 'First-order emails switch on for newly approved accounts'] },
  { w: 6, month: 2, title: 'LinkedIn test', items: ['LinkedIn test for IT resellers and MSPs', 'Reactivation email to lapsed accounts'] },
  { w: 7, month: 2, title: 'First read', items: ['Cost per approved account and first orders by segment', 'Weak ads and audiences cut; second creative round'] },
  { w: 8, month: 2, title: 'Month 2 report', items: ['Month 2 report: accounts, first orders, online share of orders, gross profit by channel'] },
  { w: 9, month: 3, title: 'Scale what works', items: ['Budget moved to the segments with the lowest cost per first order'] },
  { w: 10, month: 3, title: 'New markets groundwork', items: ['Central Digital Platform registration and notice alerts', 'MSP outreach through reseller stock platforms and trade press'] },
  { w: 11, month: 3, title: 'Search and site', items: ['Trade category pages and conversion fixes from the site review'] },
  { w: 12, month: 3, title: 'Third creative round', items: ['New ads from the best-performing angles'] },
  { w: 13, month: 3, title: '90-day review', items: ['Review: what produced trading accounts, what did not, and a 6-month plan with budgets'] },
];

export const FEE = {
  rate: 25,
  currency: 'USD',
  months: [
    { month: 1, hours: 112, label: 'Research, tracking, plan, creative and email builds; existing-customer campaign live' },
    { month: 2, hours: 96, label: 'Meta and email launch, LinkedIn test, PR, weekly reports' },
    { month: 3, hours: 80, label: 'Optimisation, new-market groundwork, 90-day review and 6-month plan' },
  ],
};
FEE.hours = FEE.months.reduce((n, m) => n + m.hours, 0);
FEE.total = FEE.hours * FEE.rate;

// Recommended media, paid by Genuine Solutions directly to the platforms (GBP).
export const MEDIA = {
  metaAcquisition: [0, 2000, 2600],
  metaExisting: [600, 500, 400],
  linkedin: [0, 1000, 1000],
};
MEDIA.total = Object.values(MEDIA).filter(Array.isArray).flat().reduce((a, b) => a + b, 0);

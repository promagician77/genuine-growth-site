// 90-day Meta acquisition planner: from spend to applications, approved accounts, first orders and gross profit,
// and whether each optimisation event happens often enough for Meta to learn from it.
// Every input is an assumption to replace with Month 1 data; none of the defaults is a benchmark.

export const ASSUMPTIONS = {
  cpm: 8, // £ per 1,000 impressions
  ctr: 0.9, // % of impressions that click
  clickToApp: 3, // % of clicks that submit a trade application
  tradeShare: 50, // % of applications that are real trade buyers (the rest are consumers or not a fit)
  approval: 80, // % of real trade applications approved
  firstOrder: 40, // % of approved accounts that order within 30 days
  aov: 300, // £ ex VAT per order
  gp: 22, // gross profit %
  orders90: 2, // orders per new account inside the first 90 days, including the first
  ordersYear: 6, // orders per new account in its first 12 months
};

export const WEEKS_PER_MONTH = 52 / 12;
export const LEARNING_EVENTS = 50; // roughly what Meta needs per ad set in 7 days to leave the learning phase

const r1 = (x) => Math.round(x * 10) / 10;

export function projectMonth(spend, a = ASSUMPTIONS) {
  const impressions = (spend / a.cpm) * 1000;
  const clicks = impressions * (a.ctr / 100);
  const applications = clicks * (a.clickToApp / 100);
  const approved = applications * (a.tradeShare / 100) * (a.approval / 100);
  const firstOrders = approved * (a.firstOrder / 100);
  const gpPerOrder = a.aov * (a.gp / 100);
  const gp90 = firstOrders * gpPerOrder * a.orders90;
  const gp12 = firstOrders * gpPerOrder * a.ordersYear;
  const perWeek = { Lead: applications / WEEKS_PER_MONTH, CompleteRegistration: approved / WEEKS_PER_MONTH, Purchase: firstOrders / WEEKS_PER_MONTH };
  return {
    spend, impressions, clicks, applications, approved, firstOrders, gp90, gp12, perWeek,
    costPerApplication: applications ? spend / applications : null,
    costPerApproved: approved ? spend / approved : null,
    costPerFirstOrder: firstOrders ? spend / firstOrders : null,
  };
}

/** Which event Meta can optimise for at this spend, and what it would take to optimise on approvals. */
export function optimisationAdvice(m, a = ASSUMPTIONS) {
  const order = ['Purchase', 'CompleteRegistration', 'Lead'];
  const ok = order.find((e) => m.perWeek[e] >= LEARNING_EVENTS);
  const spendForApprovals = m.costPerApproved ? m.costPerApproved * LEARNING_EVENTS * WEEKS_PER_MONTH : null;
  if (ok === 'Purchase') return { event: 'Purchase', learning: true, note: 'First orders are frequent enough to optimise on directly.', spendForApprovals };
  if (ok === 'CompleteRegistration') return { event: 'CompleteRegistration', learning: true, note: 'Optimise on approved trade accounts, sent from Shopify through the Conversions API.', spendForApprovals };
  if (ok === 'Lead') return { event: 'Lead', learning: true, note: 'Optimise on applications, and send approvals so Meta can build audiences from real trade accounts.', spendForApprovals };
  return {
    event: 'Lead', learning: false,
    note: `Below ${LEARNING_EVENTS} of any event a week: one consolidated ad set on applications, with approvals sent for audiences and reporting.`,
    spendForApprovals,
  };
}

export function project(spendByMonth, a = ASSUMPTIONS) {
  const months = spendByMonth.map((s) => ({ ...projectMonth(s, a), advice: null }));
  for (const m of months) m.advice = optimisationAdvice(m, a);
  const sum = (k) => months.reduce((n, m) => n + m[k], 0);
  const spend = sum('spend');
  const totals = {
    spend, applications: sum('applications'), approved: sum('approved'), firstOrders: sum('firstOrders'), gp90: sum('gp90'), gp12: sum('gp12'),
  };
  totals.costPerApproved = totals.approved ? spend / totals.approved : null;
  totals.costPerFirstOrder = totals.firstOrders ? spend / totals.firstOrders : null;
  totals.gpReturn12 = spend ? totals.gp12 / spend : null;
  return { months, totals, round: r1 };
}

# Genuine Solutions: 90-day trade growth plan

Prepared by Santiago.

A static, single-page demo of a 90-day plan to get more businesses trading online with Genuine Solutions on the new Shopify and SparkLayer store. It has:

- an email-basis checker for each contact (PECR: companies vs sole traders and partnerships, the soft opt-in, consent);
- the plan for eight trade segments;
- a Meta budget planner that shows which optimisation event Meta can learn from at a given spend;
- the results of a drill of the Shopify-to-Meta Conversions API bridge;
- three programme emails with pre-send checks;
- the new-market plan (IT resellers and MSPs, corporate, public sector);
- the week-by-week 90 days.

Deploy the folder as-is (Vercel: framework none, no build, output `.`). `vercel.json` sends `X-Robots-Tag: noindex, nofollow`, and the page has a robots noindex tag. Nothing on the page connects to Shopify or Meta.

## Measured

- **Tracking bridge drill:** 744 synthetic Shopify webhook deliveries went through the real bridge into a fake Meta endpoint, and all 12 checks passed.
  - The deliveries were:
    - 300 accounts approved through the SparkLayer form
    - 90 unapproved sign-ups
    - 40 existing customers approved later
    - 189 paid orders, 136 of them first orders and 21 keyed by reps
    - 12 orders past Meta's 7-day limit
    - 25 forged webhooks
    - 48 repeat deliveries
  - 529 of 529 expected events reached Meta (340 CompleteRegistration, 189 Purchase). None were missing, unexpected or sent twice.
  - Forged webhooks: 25 of 25 refused with 401.
  - Repeats: 48 of 48 skipped by webhook ID.
  - Unapproved sign-ups: 90 of 90 kept out.
  - Stale orders: 12 of 12 dropped.
  - Hashing: 529 of 529 email hashes matched an independent SHA-256. No plaintext email or phone appeared in 456 KB of payloads.
  - Orders:
    - first-order flags and ex-VAT values were correct on all 189 orders;
    - all 21 rep orders were sent with `opt_out`;
    - all 168 web orders were sent with `event_source_url`.
  - Meta errors: 5 injected 500 and 429 responses were retried, and nothing went to the dead-letter list.
  - Response time: the slowest webhook took 4.3 ms of server time to answer. Shopify allows 5 seconds.
- **Emails:** three programme emails (go online, first order, reactivate) pass all 11 checks. The only warnings are for placeholders still to fill: registered number, registered office, minimum order and delivery promise. The same email sent carelessly fails 7 checks. Each email is 3.4–3.7 KB of HTML; Gmail clips at about 102 KB.
- **Who-to-email rules:** 8 legal forms by 7 sources, tested against the ICO's corporate, individual and soft opt-in rules.
- **Planner arithmetic:** at the default assumptions and £2,000 / £2,600 in Months 2 and 3, Meta would see about 16–20 applications a week. That is under the roughly 50 a week it needs to leave the learning phase, so the plan uses one consolidated ad set optimised on applications, with approvals sent back.
- **Tests:** 16 tests pass (Node). 30 of 30 bugs planted one at a time were caught.
- **This page:** 37 of 37 headless-Chrome checks pass, with 0 axe-core violations on desktop and mobile and no sideways scroll at 390 px.

## Not measured

- **Genuine Solutions' own systems:** I haven't seen the store, the customer data, the Meta account or the email platform. The drill used synthetic webhooks shaped like Shopify's and a fake Meta endpoint.
- **Planner outcomes:** the default rates (CPM, click-through, application, approval, first order, order value, margin) are starting assumptions, not benchmarks.
- **SparkLayer automations:** I haven't tested whether the SparkLayer plan can call a URL on approval. The bridge uses the Shopify customer that SparkLayer creates on approval, so it doesn't need that.
- **Email rendering:** the emails haven't been through an inbox-rendering service.
- **Legal advice:** the email rules follow the ICO's published PECR guidance, and Genuine Solutions' adviser has the final word.

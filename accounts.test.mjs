// fallaccount · accounts.test.mjs — the accounting engine, every rule falsifiable, money hand-checked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RATES_2026_27, validTxn, ledger, vatReturn, soleTraderTax, vatThresholdCheck } from './accounts.mjs';

const income = (net, vat, category = 'sales', date = '2025-06-01') => ({ date, kind: 'income', category, netPence: net, ...(vat !== undefined ? { vatPence: vat } : {}) });
const expense = (net, vat, category = 'materials', date = '2025-06-01') => ({ date, kind: 'expense', category, netPence: net, ...(vat !== undefined ? { vatPence: vat } : {}) });

test('THE LEDGER SUMS EXACTLY IN PENCE — income, expenses by category, net profit', () => {
  const r = ledger([income(100000), expense(30000, undefined, 'materials'), expense(5000, undefined, 'travel')]);
  assert.equal(r.ok, true);
  assert.equal(r.incomePence, 100000);
  assert.equal(r.expensePence, 35000);
  assert.equal(r.netProfitPence, 65000);
  assert.deepEqual(r.expensesByCategory, { materials: 30000, travel: 5000 });
  // one bad line refuses the whole set — never silently dropped
  assert.match(ledger([income(100000), { date: 'x', kind: 'expense', category: 'm', netPence: 1 }]).why, /real ISO date/);
  assert.match(ledger([income(1.5)]).why, /non-negative integer pence/);
});

test('THE VAT RETURN BOXES — box5 = box1 − box4, sales/purchases ex-VAT, VAT taken as stated', () => {
  const r = vatReturn([income(100000, 20000), expense(50000, 10000)]);
  assert.equal(r.ok, true);
  assert.equal(r.box1, 20000);   // VAT due on sales
  assert.equal(r.box4, 10000);   // VAT reclaimed
  assert.equal(r.box5, 10000);   // net
  assert.equal(r.box6, 100000);  // sales ex-VAT
  assert.equal(r.box7, 50000);   // purchases ex-VAT
  assert.equal(r.payablePence, 10000);
  // a reclaim position: box5 negative
  assert.equal(vatReturn([income(10000, 2000), expense(50000, 10000)]).box5, -8000);
});

test('SOLE-TRADER TAX · £30k profit — the everyday case, hand-checked to the penny', () => {
  const t = soleTraderTax(3000000, 0);
  assert.equal(t.ok, true);
  assert.equal(t.personalAllowancePence, 1257000);
  assert.equal(t.taxableIncomePence, 1743000);
  assert.equal(t.incomeTaxPence, 348600, '(30000−12570) × 20% = £3,486.00');
  assert.equal(t.class4Pence, 104580, '(30000−12570) × 6% = £1,045.80');
  assert.equal(t.class2Pence, 0);
  assert.equal(t.totalDuePence, 453180, 'total £4,531.80');
  assert.equal(t.estimate, true);
});

test('SOLE-TRADER TAX · £110k — the personal-allowance TAPER (the 60% marginal band)', () => {
  const t = soleTraderTax(11000000, 0);
  assert.equal(t.personalAllowancePence, 757000, 'PA tapered: 12570 − (10000/2) = £7,570');
  assert.equal(t.taxableIncomePence, 10243000);
  assert.equal(t.incomeTaxPence, 3343200, '20% on 37700 + 40% on 64730 = £33,432.00');
  assert.equal(t.class4Pence, 345660, '6% on 37700 + 2% on 59730 = £3,456.60');
  assert.equal(t.totalDuePence, 3688860);
});

test('SOLE-TRADER TAX · £150k — the 45% band with the allowance fully gone', () => {
  const t = soleTraderTax(15000000, 0);
  assert.equal(t.personalAllowancePence, 0, 'PA gone above £125,140');
  assert.equal(t.incomeTaxPence, 5370300, '20/40/45 bands = £53,703.00');
  assert.equal(t.class4Pence, 425660);
  assert.equal(t.totalDuePence, 5795960);
});

test('SOLE-TRADER TAX · below the allowance — no tax, no NIC, no phantom charge', () => {
  const t = soleTraderTax(1000000, 0);   // £10,000
  assert.equal(t.taxableIncomePence, 0);
  assert.equal(t.incomeTaxPence, 0);
  assert.equal(t.class4Pence, 0, 'below the Class 4 lower limit');
  assert.equal(t.totalDuePence, 0);
});

test('OTHER INCOME STACKS UNDER THE BANDS — but Class 4 is on trading profit only', () => {
  // £20k profit + £20k other = £40k total income; Class 4 only on the £20k profit
  const t = soleTraderTax(2000000, 2000000);
  assert.equal(t.totalIncomePence, 4000000);
  assert.equal(t.taxableIncomePence, 2743000, '40000 − 12570 = £27,430');
  assert.equal(t.incomeTaxPence, 548600, '£27,430 × 20% = £5,486.00');
  assert.equal(t.class4Pence, 44580, '(20000 − 12570) × 6% = £445.80 — profit only, not the other income');
});

test('THE VAT REGISTRATION THRESHOLD — over, under, and the exact boundary', () => {
  assert.equal(vatThresholdCheck(9500000).mustRegister, true);
  assert.equal(vatThresholdCheck(8000000).mustRegister, false);
  assert.equal(vatThresholdCheck(9000000).mustRegister, true, '£90,000 exactly requires registration (inclusive)');
  assert.equal(vatThresholdCheck(8000000).marginPence, 1000000, '£10,000 of headroom');
});

test('THE RATES ARE A DATED, RE-CITABLE CONFIG — and the result carries the cite', () => {
  assert.equal(RATES_2026_27.taxYear, '2026-27');
  assert.match(RATES_2026_27.cite, /CONFIRM current thresholds/);
  assert.match(soleTraderTax(3000000, 0).cite, /CONFIRM current thresholds/);
  // a caller can pass a different year's rates — the engine is not wedded to one year
  const custom = { ...RATES_2026_27, personalAllowancePence: 1300000, taxYear: '2099-00' };
  assert.equal(soleTraderTax(2000000, 0, custom).taxYear, '2099-00');
  assert.equal(soleTraderTax(2000000, 0, custom).personalAllowancePence, 1300000);
});

test('VALIDTXN refuses the malformed with the reason', () => {
  assert.match(validTxn({ date: '2025-06-01', kind: 'sale', category: 'x', netPence: 1 }).why, /income or expense/);
  assert.match(validTxn({ date: '2025-06-01', kind: 'income', category: '', netPence: 1 }).why, /needs a category/);
  assert.match(validTxn({ date: '2025-13-01', kind: 'income', category: 'x', netPence: 1 }).why, /real ISO date/);
  assert.match(validTxn({ date: '2025-06-01', kind: 'income', category: 'x', netPence: -1 }).why, /non-negative integer/);
  assert.match(validTxn({ date: '2025-06-01', kind: 'income', category: 'x', netPence: 100, vatPence: 1.5 }).why, /non-negative integer pence/);
  assert.equal(validTxn({ date: '2025-06-01', kind: 'income', category: 'x', netPence: 100 }).ok, true);
});

// ─── round two: the gate found the boundaries — money maths lives and dies at them ───

test('HALF-UP ROUNDING IS EXACT — a half-penny rounds UP, at income tax AND Class 4', () => {
  // profit £12,570.25 → taxable 25p, Class-4 band 25p. 25 × 20% = 5.00p exact; 25 × 6% = 1.5p → 2p.
  const t = soleTraderTax(1257025, 0);
  assert.equal(t.taxableIncomePence, 25);
  assert.equal(t.incomeTaxPence, 5, '25p × 20% = 5.00p, exact');
  assert.equal(t.class4Pence, 2, '25p × 6% = 1.50p → rounds up to 2p');
});

test('VALIDDATE HOLDS AT EVERY EDGE — leap day, month and day bounds, short months', () => {
  const T = (date) => validTxn({ date, kind: 'income', category: 'x', netPence: 1 }).ok;
  assert.equal(T('2024-02-29'), true, '2024 is a leap year');
  assert.equal(T('2025-02-29'), false, '2025 is not');
  assert.equal(T('2000-02-29'), true, '2000: divisible by 400, leap');
  assert.equal(T('2025-00-15'), false, 'month 0');
  assert.equal(T('2025-13-15'), false, 'month 13');
  assert.equal(T('2025-06-00'), false, 'day 0');
  assert.equal(T('2025-01-31'), true);
  assert.equal(T('2025-01-32'), false, 'January has 31 days');
  assert.equal(T('2025-04-31'), false, 'April has 30');
  assert.equal(T('2025-04-30'), true);
  assert.equal(T('2025-12-15'), true, 'December is month 12 — a valid month');
});

test('A NON-OBJECT IS NOT A TRANSACTION — a number or an array is refused as such, not mis-parsed', () => {
  // guards the obj() helper: arrays and primitives must be rejected up front, not walked as records
  assert.match(validTxn(7).why, /not a transaction/);
  assert.match(validTxn([{ date: '2025-06-01', kind: 'income', category: 'x', netPence: 1 }]).why, /not a transaction/);
});

test('ZERO IS A VALID AMOUNT — a zero line, zero VAT, zero profit, zero turnover all pass', () => {
  assert.equal(validTxn({ date: '2025-06-01', kind: 'income', category: 'x', netPence: 0 }).ok, true);
  assert.equal(validTxn({ date: '2025-06-01', kind: 'income', category: 'x', netPence: 100, vatPence: 0 }).ok, true);
  assert.equal(soleTraderTax(0, 0).ok, true, 'zero profit is valid, not a refusal');
  assert.equal(soleTraderTax(0, 0).totalDuePence, 0);
  assert.equal(vatThresholdCheck(0).ok, true);
});

test('NEGATIVE OTHER INCOME AND FRACTIONAL TURNOVER ARE REFUSED — the guards are real', () => {
  assert.match(soleTraderTax(1000000, -500).why, /non-negative integer pence/);
  assert.match(vatThresholdCheck(1.5).why, /non-negative integer pence/);
  assert.match(vatThresholdCheck(-1).why, /non-negative integer pence/);
});

test('THE PA TAPER AT ITS EXACT BOUNDARIES — full at £100k, gone at £125,140', () => {
  assert.equal(soleTraderTax(10000000, 0).personalAllowancePence, 1257000, 'full PA at exactly £100,000');
  assert.equal(soleTraderTax(12514000, 0).personalAllowancePence, 0, 'PA fully gone at exactly £125,140');
  assert.equal(soleTraderTax(11000000, 0).personalAllowancePence, 757000, 'and tapered in between');
});

test('FUZZ: total on garbage', () => {
  ledger(null); ledger('x'); ledger([null]); vatReturn(7); soleTraderTax(null); soleTraderTax('x', 'y');
  vatThresholdCheck(-1); vatThresholdCheck(1.5); validTxn(null); validTxn(7);
  assert.match(soleTraderTax(1.5, 0).why, /non-negative integer pence/);
  assert.match(ledger([null]).why, /not a transaction/);
  assert.equal(soleTraderTax(3000000, undefined).ok, true, 'undefined other income defaults to zero');
  assert.ok(true);
});

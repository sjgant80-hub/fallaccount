// fallaccount · accounts.mjs — the accounting engine for a UK sole trader. The real backend:
// the maths a sole trader cannot afford to get wrong, gated so it can't drift.
//
// Everything is INTEGER PENCE — no float ever touches money, because 3 × 0.335 is not what a
// float says it is. Every rate/threshold is an INPUT (the RATES config), dated and flagged for
// re-checking, never hard-coded-and-forgotten — an accounting tool citing last year's bands is
// worse than none. Pure and total: garbage in returns { ok:false }, never a wrong number.
//
// HONEST WIRE (on the page too): this ESTIMATES. It is not a filing, not tax advice, and the
// figures are the 2025-26 rates as known at build — confirm the current thresholds with HMRC or
// an accountant before you rely on a number or file a return.

const isPence = (v) => Number.isInteger(v) && Number.isFinite(v);
const str = (v) => typeof v === 'string' ? v : '';
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
const halfUp = (num, den) => { const r = Math.floor(num / den); return (2 * (num - r * den) >= den) ? r + 1 : r; };
const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  (() => { const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return m >= 1 && m <= 12 && d >= 1 && d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; })();

// ── the rates: a DATED, RE-CITABLE config, not a buried constant. All money in PENCE. ──
export const RATES_2025_26 = Object.freeze({
  taxYear: '2025-26',
  cite: 'UK sole-trader rates as known at build (2025-26). CONFIRM current thresholds with HMRC/gov.uk before relying on or filing.',
  personalAllowancePence: 1257000,          // £12,570
  paTaperStartPence: 10000000,              // £100,000 — PA reduced £1 per £2 above
  paGoneAtPence: 12514000,                  // £125,140 — PA fully tapered
  basicBandWidthPence: 3770000,             // £37,700 taxed at basic
  additionalThresholdPence: 12514000,       // £125,140 taxable → additional rate
  basicRatePpm: 200000, higherRatePpm: 400000, additionalRatePpm: 450000,  // 20% / 40% / 45%, parts-per-million
  class4LowerPence: 1257000, class4UpperPence: 5027000,   // £12,570 / £50,270
  class4MainPpm: 60000, class4UpperPpm: 20000,            // 6% / 2%
  class2MandatoryPence: 0,                  // 2024-25+: no mandatory Class 2 above the small-profits threshold
  tradingAllowancePence: 100000,            // £1,000
  vatRegThresholdPence: 9000000,            // £90,000
  vatStandardPpm: 200000,                   // 20%
});

/** A transaction: date, kind (income|expense), category, net pence, optional VAT pence. */
export function validTxn(t) {
  const o = obj(t);
  if (!o) return { ok: false, why: 'not a transaction' };
  if (!validDate(o.date)) return { ok: false, why: 'a transaction needs a real ISO date' };
  if (o.kind !== 'income' && o.kind !== 'expense') return { ok: false, why: 'kind must be income or expense' };
  if (!str(o.category).trim()) return { ok: false, why: 'a transaction needs a category' };
  if (!isPence(o.netPence) || o.netPence < 0) return { ok: false, why: 'net must be a non-negative integer pence' };
  if (o.vatPence !== undefined && (!isPence(o.vatPence) || o.vatPence < 0)) return { ok: false, why: 'VAT, if present, is non-negative integer pence' };
  return { ok: true, why: 'ok' };
}

/**
 * The books. Income, expenses (totalled AND by category), and net profit — all integer pence,
 * summing exactly. One bad transaction refuses the whole set: a ledger that silently drops a
 * line is the defect this exists to prevent (the trial balance that agreed because both sides
 * were dropped — money-shelf).
 */
export function ledger(txns) {
  if (!Array.isArray(txns)) return { ok: false, why: 'the books are a list of transactions' };
  let incomePence = 0, expensePence = 0;
  const byCategory = {};
  for (const t of txns) {
    const v = validTxn(t);
    if (!v.ok) return v;
    if (t.kind === 'income') incomePence += t.netPence;
    else { expensePence += t.netPence; byCategory[t.category] = (byCategory[t.category] || 0) + t.netPence; }
  }
  return { ok: true, incomePence, expensePence, netProfitPence: incomePence - expensePence, expensesByCategory: byCategory, count: txns.length };
}

/**
 * The VAT return, standard accrual scheme. The boxes HMRC's MTD wants:
 *   box1 = VAT due on sales · box4 = VAT reclaimed on purchases · box5 = net VAT (box1 - box4,
 *   the amount payable or, if negative, reclaimable) · box6 = total sales ex-VAT · box7 = total
 *   purchases ex-VAT. VAT is taken from each transaction's stated vatPence (not recomputed from a
 *   rate — a stated VAT figure is the source of truth on a real invoice).
 */
export function vatReturn(txns) {
  if (!Array.isArray(txns)) return { ok: false, why: 'a VAT return is computed over a list of transactions' };
  let box1 = 0, box4 = 0, box6 = 0, box7 = 0;
  for (const t of txns) {
    const v = validTxn(t);
    if (!v.ok) return v;
    const vat = t.vatPence || 0;
    if (t.kind === 'income') { box1 += vat; box6 += t.netPence; }
    else { box4 += vat; box7 += t.netPence; }
  }
  return { ok: true, box1, box4, box5: box1 - box4, box6, box7, payablePence: box1 - box4 };
}

/** Taper the personal allowance: reduced £1 per £2 of income over the taper start, gone by the cap. */
function taperedPA(incomePence, r) {
  if (incomePence <= r.paTaperStartPence) return r.personalAllowancePence;
  if (incomePence >= r.paGoneAtPence) return 0;
  const over = incomePence - r.paTaperStartPence;
  return Math.max(0, r.personalAllowancePence - Math.floor(over / 2));
}

/**
 * The sole-trader tax estimate: income tax (with the tapered personal allowance and the 20/40/45
 * bands on TAXABLE income) + Class 4 NIC + Class 2. `profitPence` is trading profit; `otherIncomePence`
 * is other taxable income stacked underneath (so the bands see total income). Returns every
 * component so nothing is a black box. An ESTIMATE — the honest wire rides in the result.
 */
export function soleTraderTax(profitPence, otherIncomePence, rates) {
  const r = obj(rates) || RATES_2025_26;
  const profit = isPence(profitPence) && profitPence >= 0 ? profitPence : null;
  const other = otherIncomePence === undefined ? 0 : (isPence(otherIncomePence) && otherIncomePence >= 0 ? otherIncomePence : null);
  if (profit === null || other === null) return { ok: false, why: 'profit and other income must be non-negative integer pence' };

  const totalIncome = profit + other;
  const pa = taperedPA(totalIncome, r);
  const taxable = Math.max(0, totalIncome - pa);

  const band20 = Math.min(taxable, r.basicBandWidthPence);
  const band40 = Math.max(0, Math.min(taxable, r.additionalThresholdPence) - r.basicBandWidthPence);
  const band45 = Math.max(0, taxable - r.additionalThresholdPence);
  const incomeTaxPence =
    halfUp(band20 * r.basicRatePpm, 1000000) +
    halfUp(band40 * r.higherRatePpm, 1000000) +
    halfUp(band45 * r.additionalRatePpm, 1000000);

  // Class 4 NIC on trading profit only (not other income)
  const c4main = Math.max(0, Math.min(profit, r.class4UpperPence) - r.class4LowerPence);
  const c4upper = Math.max(0, profit - r.class4UpperPence);
  const class4Pence = halfUp(c4main * r.class4MainPpm, 1000000) + halfUp(c4upper * r.class4UpperPpm, 1000000);
  const class2Pence = r.class2MandatoryPence;

  return {
    ok: true, taxYear: r.taxYear,
    totalIncomePence: totalIncome, personalAllowancePence: pa, taxableIncomePence: taxable,
    incomeTaxPence, class4Pence, class2Pence,
    totalDuePence: incomeTaxPence + class4Pence + class2Pence,
    estimate: true, cite: r.cite,
  };
}

/** Is the trader over the VAT registration threshold on rolling turnover? A yes/no with the gap. */
export function vatThresholdCheck(turnoverPence, rates) {
  const r = obj(rates) || RATES_2025_26;
  if (!isPence(turnoverPence) || turnoverPence < 0) return { ok: false, why: 'turnover must be non-negative integer pence' };
  const over = turnoverPence >= r.vatRegThresholdPence;
  return { ok: true, mustRegister: over, thresholdPence: r.vatRegThresholdPence,
    marginPence: r.vatRegThresholdPence - turnoverPence,
    why: over ? 'over the VAT registration threshold — you must register' : 'under the VAT registration threshold' };
}

export default soleTraderTax;

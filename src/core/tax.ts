/**
 * เครื่องคำนวณภาษีเงินได้บุคคลธรรมดา (เงินได้ประเภท 40(1) เงินเดือน)
 * เป็น pure function ทั้งหมด — หน่วยเป็น "บาท" (ฟอร์มภาษีกรอกเป็นบาท)
 * ตาราง/เพดานแยกเป็น config ต่อปีภาษี อัปเดตปีถัดไปโดยไม่แตะตรรกะ
 */

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface TaxYearConfig {
  year: number; // พ.ศ.
  brackets: TaxBracket[];
  expenseRate: number; // หักค่าใช้จ่ายเหมา
  expenseCap: number;
  personalAllowance: number;
  socialSecurityCap: number;
  lifeInsuranceCap: number;
  healthInsuranceCap: number;
  lifeHealthCombinedCap: number;
  ssfRate: number;
  ssfCap: number;
  rmfRate: number;
  rmfCap: number;
  pvdRate: number;
  retirementCombinedCap: number; // SSF + RMF + PVD รวมกัน
  tesgRate: number;
  tesgCap: number;
  homeLoanCap: number;
  donationRate: number; // % ของเงินได้หลังหักทุกอย่าง
}

/** ปีภาษี 2568 (รายได้ปี 2568 ยื่นต้นปี 2569) */
export const TAX_YEAR_2568: TaxYearConfig = {
  year: 2568,
  brackets: [
    { min: 0, max: 150_000, rate: 0 },
    { min: 150_000, max: 300_000, rate: 0.05 },
    { min: 300_000, max: 500_000, rate: 0.1 },
    { min: 500_000, max: 750_000, rate: 0.15 },
    { min: 750_000, max: 1_000_000, rate: 0.2 },
    { min: 1_000_000, max: 2_000_000, rate: 0.25 },
    { min: 2_000_000, max: 5_000_000, rate: 0.3 },
    { min: 5_000_000, max: Infinity, rate: 0.35 },
  ],
  expenseRate: 0.5,
  expenseCap: 100_000,
  personalAllowance: 60_000,
  socialSecurityCap: 9_000,
  lifeInsuranceCap: 100_000,
  healthInsuranceCap: 25_000,
  lifeHealthCombinedCap: 100_000,
  ssfRate: 0.3,
  ssfCap: 200_000,
  rmfRate: 0.3,
  rmfCap: 500_000,
  pvdRate: 0.15,
  retirementCombinedCap: 500_000,
  tesgRate: 0.3,
  tesgCap: 300_000,
  homeLoanCap: 100_000,
  donationRate: 0.1,
};

export interface Deductions {
  socialSecurity?: number;
  lifeInsurance?: number;
  healthInsurance?: number;
  pvd?: number;
  ssf?: number;
  rmf?: number;
  tesg?: number;
  homeLoan?: number;
  donation?: number;
}

export interface TaxInput {
  totalIncome: number;
  wht?: number;
  deductions?: Deductions;
}

export interface BracketDetail extends TaxBracket {
  taxed: number; // เงินได้ในขั้นนี้
  tax: number;
}

export interface TaxResult {
  expenseDeduction: number;
  allowanceTotal: number;
  applied: Required<Deductions> & { personal: number };
  donationApplied: number;
  taxableIncome: number;
  byBracket: BracketDetail[];
  totalTax: number;
  /** ภาษีที่ต้องจ่ายเพิ่มหลังหัก ณ ที่จ่าย (≥ 0) */
  finalTax: number;
  /** เงินคืนภาษี (≥ 0) — แยก field ไม่ใช้ค่าติดลบ */
  taxRefund: number;
  effectiveRate: number; // ต่อเงินได้ทั้งหมด
  notes: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function progressiveTax(
  taxable: number,
  brackets: TaxBracket[],
): { total: number; byBracket: BracketDetail[] } {
  let total = 0;
  const byBracket = brackets.map((b) => {
    const taxed = Math.max(0, Math.min(taxable, b.max) - b.min);
    const tax = round2(taxed * b.rate);
    total += tax;
    return { ...b, taxed, tax };
  });
  return { total: round2(total), byBracket };
}

export function calcThaiTax(
  input: TaxInput,
  config: TaxYearConfig = TAX_YEAR_2568,
): TaxResult {
  const notes: string[] = [];
  const income = Math.max(0, input.totalIncome);
  const d = input.deductions ?? {};
  const cap = (
    value: number | undefined,
    limit: number,
    label: string,
  ): number => {
    const v = Math.max(0, value ?? 0);
    if (v > limit) {
      notes.push(`${label} ใช้ได้สูงสุด ${limit.toLocaleString()} บาท`);
      return limit;
    }
    return v;
  };

  // 1) หักค่าใช้จ่ายเหมา 50% ไม่เกิน 100,000
  const expenseDeduction = Math.min(
    income * config.expenseRate,
    config.expenseCap,
  );

  // 2) ค่าลดหย่อน (ตามเพดานรายตัว)
  const personal = config.personalAllowance;
  const socialSecurity = cap(
    d.socialSecurity,
    config.socialSecurityCap,
    "ประกันสังคม",
  );

  let lifeInsurance = cap(
    d.lifeInsurance,
    config.lifeInsuranceCap,
    "เบี้ยประกันชีวิต",
  );
  let healthInsurance = cap(
    d.healthInsurance,
    config.healthInsuranceCap,
    "เบี้ยประกันสุขภาพ",
  );
  if (lifeInsurance + healthInsurance > config.lifeHealthCombinedCap) {
    notes.push(
      `ประกันชีวิต+สุขภาพ รวมใช้ได้ไม่เกิน ${config.lifeHealthCombinedCap.toLocaleString()} บาท`,
    );
    healthInsurance = Math.max(
      0,
      config.lifeHealthCombinedCap - lifeInsurance,
    );
  }

  // กลุ่มเกษียณ: เพดานรายตัว (% ของเงินได้ + เพดานเงิน) แล้วคุมเพดานรวม
  let ssf = cap(
    d.ssf,
    Math.min(income * config.ssfRate, config.ssfCap),
    "SSF",
  );
  let rmf = cap(
    d.rmf,
    Math.min(income * config.rmfRate, config.rmfCap),
    "RMF",
  );
  let pvd = cap(d.pvd, income * config.pvdRate, "กองทุนสำรองเลี้ยงชีพ");
  const retireTotal = ssf + rmf + pvd;
  if (retireTotal > config.retirementCombinedCap) {
    notes.push(
      `กลุ่มเกษียณ (SSF+RMF+PVD) รวมใช้ได้ไม่เกิน ${config.retirementCombinedCap.toLocaleString()} บาท`,
    );
    // ตัดเกินตามลำดับ pvd → rmf → ssf (ตัดตัวท้ายของฟอร์มก่อน เพื่อให้ deterministic)
    let excess = retireTotal - config.retirementCombinedCap;
    const trim = (v: number) => {
      const t = Math.min(v, excess);
      excess -= t;
      return v - t;
    };
    pvd = trim(pvd);
    rmf = trim(rmf);
    ssf = trim(ssf);
  }

  const tesg = cap(
    d.tesg,
    Math.min(income * config.tesgRate, config.tesgCap),
    "Thai ESG",
  );
  const homeLoan = cap(d.homeLoan, config.homeLoanCap, "ดอกเบี้ยบ้าน");

  const allowanceTotal =
    personal +
    socialSecurity +
    lifeInsurance +
    healthInsurance +
    ssf +
    rmf +
    pvd +
    tesg +
    homeLoan;

  // 3) เงินบริจาค — ไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่ายและค่าลดหย่อน
  const baseAfterAllowance = Math.max(
    0,
    income - expenseDeduction - allowanceTotal,
  );
  const donationApplied = cap(
    d.donation,
    round2(baseAfterAllowance * config.donationRate),
    "เงินบริจาค (10% ของเงินได้หลังหักลดหย่อน)",
  );

  // 4) เงินได้สุทธิ → ภาษีขั้นบันได
  const taxableIncome = Math.max(0, baseAfterAllowance - donationApplied);
  const { total: totalTax, byBracket } = progressiveTax(
    taxableIncome,
    config.brackets,
  );

  // 5) หักภาษี ณ ที่จ่าย
  const wht = Math.max(0, input.wht ?? 0);
  const diff = round2(totalTax - wht);
  const finalTax = Math.max(0, diff);
  const taxRefund = Math.max(0, -diff);

  return {
    expenseDeduction,
    allowanceTotal,
    applied: {
      personal,
      socialSecurity,
      lifeInsurance,
      healthInsurance,
      pvd,
      ssf,
      rmf,
      tesg,
      homeLoan,
      donation: donationApplied,
    },
    donationApplied,
    taxableIncome,
    byBracket,
    totalTax,
    finalTax,
    taxRefund,
    effectiveRate: income > 0 ? totalTax / income : 0,
    notes,
  };
}

/** อัตราภาษีส่วนเพิ่ม (marginal rate) ณ เงินได้สุทธิปัจจุบัน */
export function marginalRate(
  taxable: number,
  config: TaxYearConfig = TAX_YEAR_2568,
): number {
  const b = config.brackets.find((x) => taxable > x.min && taxable <= x.max);
  return b ? b.rate : taxable <= 0 ? 0 : 0.35;
}

/** ซื้อลดหย่อนเพิ่ม X บาท ประหยัดภาษีเท่าไร (เทียบจาก taxable ปัจจุบัน) */
export function savingIfDeductMore(
  currentTaxable: number,
  extraDeduction: number,
  config: TaxYearConfig = TAX_YEAR_2568,
): number {
  const before = progressiveTax(currentTaxable, config.brackets).total;
  const after = progressiveTax(
    Math.max(0, currentTaxable - extraDeduction),
    config.brackets,
  ).total;
  return round2(before - after);
}

export const CREDIT_TERMS = [6, 12, 24] as const;
export type CreditTerm = (typeof CREDIT_TERMS)[number];

const ANNUAL_RATE: Record<CreditTerm, number> = { 6: 0.08, 12: 0.12, 24: 0.16 };

export function calculateCredit(
  price: number,
  downPayment: number,
  months: CreditTerm,
) {
  const principal = price - downPayment;
  const monthlyRate = ANNUAL_RATE[months] / 12;

  const monthlyPayment =
    principal <= 0
      ? 0
      : Math.round(
          (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months)),
        );

  const totalPaid = downPayment + monthlyPayment * months;

  return {
    months,
    annualRate: ANNUAL_RATE[months],
    downPayment,
    monthlyPayment,
    totalPaid,
    overpayment: totalPaid - price,
  };
}

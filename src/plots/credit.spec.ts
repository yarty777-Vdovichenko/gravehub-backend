import { calculateCredit } from './credit';

describe('calculateCredit', () => {
  it('calculates the monthly payment and total cost', () => {
    expect(calculateCredit(1200, 200, 12)).toEqual({
      months: 12,
      annualRate: 0.12,
      downPayment: 200,
      monthlyPayment: 89,
      totalPaid: 1268,
      overpayment: 68,
    });
  });

  it('does not charge monthly payments when the down payment covers the price', () => {
    expect(calculateCredit(1200, 1200, 12)).toEqual({
      months: 12,
      annualRate: 0.12,
      downPayment: 1200,
      monthlyPayment: 0,
      totalPaid: 1200,
      overpayment: 0,
    });
  });
});

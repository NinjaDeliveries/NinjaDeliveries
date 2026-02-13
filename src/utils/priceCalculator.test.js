/**
 * Tests for Price Calculator Utility Functions
 */

import {
  calculateServicePrice,
  calculatePackagePrice,
  getBestOffer,
  formatPrice,
  calculateDiscountPercent
} from './priceCalculator';

describe('calculateServicePrice', () => {
  test('calculates price without offers', () => {
    const result = calculateServicePrice(100, 2, []);
    expect(result.totalPrice).toBe(200);
    expect(result.hasOffer).toBe(false);
  });

  test('applies percentage discount', () => {
    const offers = [
      { minQuantity: 3, discountType: 'percentage', discountValue: 10, isActive: true }
    ];
    const result = calculateServicePrice(100, 3, offers);
    expect(result.pricePerUnit).toBe(90);
    expect(result.totalPrice).toBe(270);
    expect(result.hasOffer).toBe(true);
  });

  test('applies fixed discount', () => {
    const offers = [
      { minQuantity: 2, discountType: 'fixed', discountValue: 20, isActive: true }
    ];
    const result = calculateServicePrice(100, 2, offers);
    expect(result.pricePerUnit).toBe(80);
    expect(result.totalPrice).toBe(160);
  });

  test('applies new price', () => {
    const offers = [
      { minQuantity: 5, newPricePerUnit: 75, isActive: true }
    ];
    const result = calculateServicePrice(100, 5, offers);
    expect(result.pricePerUnit).toBe(75);
    expect(result.totalPrice).toBe(375);
  });

  test('selects best offer for quantity', () => {
    const offers = [
      { minQuantity: 3, discountType: 'percentage', discountValue: 10, isActive: true },
      { minQuantity: 5, discountType: 'percentage', discountValue: 20, isActive: true }
    ];
    const result = calculateServicePrice(100, 5, offers);
    expect(result.pricePerUnit).toBe(80); // 20% discount
  });

  test('ignores inactive offers', () => {
    const offers = [
      { minQuantity: 2, discountType: 'percentage', discountValue: 50, isActive: false }
    ];
    const result = calculateServicePrice(100, 2, offers);
    expect(result.hasOffer).toBe(false);
    expect(result.totalPrice).toBe(200);
  });
});

describe('getBestOffer', () => {
  test('returns null when no offers', () => {
    const result = getBestOffer(5, []);
    expect(result).toBeNull();
  });

  test('returns correct offer for quantity', () => {
    const offers = [
      { minQuantity: 3, discountValue: 10, isActive: true },
      { minQuantity: 5, discountValue: 20, isActive: true }
    ];
    const result = getBestOffer(5, offers);
    expect(result.discountValue).toBe(20);
  });

  test('respects maxQuantity', () => {
    const offers = [
      { minQuantity: 3, maxQuantity: 5, discountValue: 10, isActive: true },
      { minQuantity: 6, discountValue: 20, isActive: true }
    ];
    const result = getBestOffer(4, offers);
    expect(result.discountValue).toBe(10);
  });
});

describe('formatPrice', () => {
  test('formats price with default currency', () => {
    const result = formatPrice(1000);
    expect(result).toBe('₹1,000.00');
  });

  test('formats price with custom currency', () => {
    const result = formatPrice(1000, '$');
    expect(result).toBe('$1,000.00');
  });
});

describe('calculateDiscountPercent', () => {
  test('calculates discount percentage', () => {
    const result = calculateDiscountPercent(100, 80);
    expect(result).toBe(20);
  });

  test('returns 0 for zero original price', () => {
    const result = calculateDiscountPercent(0, 50);
    expect(result).toBe(0);
  });
});

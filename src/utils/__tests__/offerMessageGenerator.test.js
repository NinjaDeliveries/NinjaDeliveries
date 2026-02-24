import { generateOfferMessage, addMessagesToOffers } from '../offerMessageGenerator';

describe('offerMessageGenerator', () => {
  describe('generateOfferMessage', () => {
    test('generates message for percentage discount', () => {
      const offer = {
        minQuantity: 3,
        discountType: 'percentage',
        discountValue: 50
      };
      expect(generateOfferMessage(offer)).toBe('Buy 3+ → 50% OFF');
    });

    test('generates message for fixed discount', () => {
      const offer = {
        minQuantity: 5,
        discountType: 'fixed',
        discountValue: 100
      };
      expect(generateOfferMessage(offer)).toBe('Buy 5+ → ₹100 OFF');
    });

    test('generates message for new price', () => {
      const offer = {
        minQuantity: 4,
        discountType: 'newPrice',
        discountValue: 50
      };
      expect(generateOfferMessage(offer)).toBe('Buy 4+ → at ₹50 per unit');
    });

    test('generates message for absolute discount', () => {
      const offer = {
        minQuantity: 4,
        discountType: 'absolute',
        discountValue: 50
      };
      expect(generateOfferMessage(offer)).toBe('Buy 4+ → at ₹50 per unit');
    });

    test('generates message with max quantity', () => {
      const offer = {
        minQuantity: 3,
        maxQuantity: 10,
        discountType: 'percentage',
        discountValue: 20
      };
      expect(generateOfferMessage(offer)).toBe('Buy 3-10 → 20% OFF');
    });

    test('returns empty string for invalid offer', () => {
      expect(generateOfferMessage(null)).toBe('');
      expect(generateOfferMessage({})).toBe('');
      expect(generateOfferMessage({ minQuantity: 3 })).toBe('');
    });
  });

  describe('addMessagesToOffers', () => {
    test('adds messages to array of offers', () => {
      const offers = [
        {
          minQuantity: 3,
          discountType: 'percentage',
          discountValue: 50
        },
        {
          minQuantity: 5,
          discountType: 'fixed',
          discountValue: 100
        }
      ];

      const result = addMessagesToOffers(offers);
      
      expect(result[0].message).toBe('Buy 3+ → 50% OFF');
      expect(result[1].message).toBe('Buy 5+ → ₹100 OFF');
    });

    test('preserves existing messages', () => {
      const offers = [
        {
          minQuantity: 3,
          discountType: 'percentage',
          discountValue: 50,
          message: 'Custom Message'
        }
      ];

      const result = addMessagesToOffers(offers);
      expect(result[0].message).toBe('Custom Message');
    });

    test('handles empty array', () => {
      expect(addMessagesToOffers([])).toEqual([]);
    });

    test('handles non-array input', () => {
      expect(addMessagesToOffers(null)).toEqual([]);
      expect(addMessagesToOffers(undefined)).toEqual([]);
    });
  });
});

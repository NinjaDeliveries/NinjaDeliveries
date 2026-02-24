/**
 * Generate user-friendly message from offer details
 * @param {Object} offer - The offer object containing minQuantity, discountType, discountValue
 * @returns {string} - Formatted message like "Buy 3+ → 50% OFF" or "Buy 4+ units, at ₹50 per unit"
 */
export const generateOfferMessage = (offer) => {
  if (!offer || !offer.minQuantity || !offer.discountValue) {
    return '';
  }

  const { minQuantity, discountType, discountValue, maxQuantity } = offer;
  
  // Format quantity range
  let quantityText = `Buy ${minQuantity}+`;
  if (maxQuantity) {
    quantityText = `Buy ${minQuantity}-${maxQuantity}`;
  }

  // Format discount based on type
  let discountText = '';
  switch (discountType) {
    case 'percentage':
      discountText = `${discountValue}% OFF`;
      break;
    case 'fixed':
      discountText = `₹${discountValue} OFF`;
      break;
    case 'newPrice':
      discountText = `at ₹${discountValue} per unit`;
      break;
    case 'absolute':
      discountText = `at ₹${discountValue} per unit`;
      break;
    default:
      discountText = `${discountValue}% OFF`;
  }

  // Combine into final message
  return `${quantityText} → ${discountText}`;
};

/**
 * Generate message for all offers in an array
 * @param {Array} offers - Array of offer objects
 * @returns {Array} - Array of offers with message field added
 */
export const addMessagesToOffers = (offers) => {
  if (!Array.isArray(offers)) {
    return [];
  }

  return offers.map(offer => ({
    ...offer,
    message: offer.message || generateOfferMessage(offer)
  }));
};

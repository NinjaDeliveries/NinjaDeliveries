/**
 * Calculate price with quantity-based discounts
 * @param {number} basePrice - Base price per unit
 * @param {number} quantity - Selected quantity
 * @param {Array} quantityOffers - Array of quantity-based offers
 * @returns {Object} - { finalPrice, appliedOffer, savings }
 */
export const calculateServicePrice = (basePrice, quantity, quantityOffers = []) => {
  // Find applicable offer (highest minQuantity that user qualifies for)
  const applicableOffer = quantityOffers
    .filter(offer => offer.isActive && quantity >= offer.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];

  if (!applicableOffer) {
    // No offer applies
    return {
      pricePerUnit: basePrice,
      totalPrice: basePrice * quantity,
      appliedOffer: null,
      savings: 0
    };
  }

  let discountedPricePerUnit = basePrice;

  // Calculate discounted price based on type
  switch (applicableOffer.discountType) {
    case "percentage":
      discountedPricePerUnit = basePrice - (basePrice * applicableOffer.discountValue / 100);
      break;
    
    case "fixed":
      discountedPricePerUnit = basePrice - applicableOffer.discountValue;
      break;
    
    case "newPrice":
      discountedPricePerUnit = applicableOffer.newPricePerUnit;
      break;
    
    default:
      discountedPricePerUnit = basePrice;
  }

  // Ensure price doesn't go negative
  discountedPricePerUnit = Math.max(0, discountedPricePerUnit);

  const totalPrice = discountedPricePerUnit * quantity;
  const originalTotal = basePrice * quantity;
  const savings = originalTotal - totalPrice;

  return {
    pricePerUnit: discountedPricePerUnit,
    totalPrice,
    appliedOffer,
    savings,
    originalPricePerUnit: basePrice,
    originalTotal
  };
};

/**
 * Format offer description for display
 */
export const formatOfferDescription = (offer) => {
  if (!offer) return "";

  const { minQuantity, discountType, discountValue, newPricePerUnit } = offer;

  switch (discountType) {
    case "percentage":
      return `${discountValue}% off on ${minQuantity}+ units`;
    
    case "fixed":
      return `₹${discountValue} off per unit on ${minQuantity}+ units`;
    
    case "newPrice":
      return `₹${newPricePerUnit} per unit on ${minQuantity}+ units`;
    
    default:
      return "";
  }
};

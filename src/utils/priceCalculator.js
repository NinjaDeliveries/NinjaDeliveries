/**
 * Price Calculator Utility Functions
 * Handles pricing calculations for services and packages with quantity-based offers
 */

/**
 * Calculate price for a service with quantity offers
 * @param {number} basePrice - Base price per unit
 * @param {number} quantity - Number of units
 * @param {Array} quantityOffers - Array of quantity-based offers
 * @returns {Object} Price calculation result
 */
export const calculateServicePrice = (basePrice, quantity, quantityOffers = []) => {
  const price = parseFloat(basePrice) || 0;
  const qty = parseInt(quantity) || 1;

  // Find applicable offer
  let applicableOffer = null;
  if (quantityOffers && quantityOffers.length > 0) {
    const sortedOffers = [...quantityOffers]
      .filter(offer => offer.isActive !== false)
      .sort((a, b) => b.minQuantity - a.minQuantity);

    for (const offer of sortedOffers) {
      if (qty >= offer.minQuantity) {
        if (!offer.maxQuantity || qty <= offer.maxQuantity) {
          applicableOffer = offer;
          break;
        }
      }
    }
  }

  let pricePerUnit = price;
  
  if (applicableOffer) {
    if (applicableOffer.newPricePerUnit && applicableOffer.newPricePerUnit > 0) {
      pricePerUnit = applicableOffer.newPricePerUnit;
    } else {
      switch (applicableOffer.discountType) {
        case 'percentage':
          pricePerUnit = price - (price * applicableOffer.discountValue / 100);
          break;
        case 'fixed':
          pricePerUnit = price - applicableOffer.discountValue;
          break;
        default:
          break;
      }
    }
  }

  const totalPrice = pricePerUnit * qty;
  const originalTotal = price * qty;
  const savings = originalTotal - totalPrice;
  const savingsPercent = originalTotal > 0 ? ((savings / originalTotal) * 100).toFixed(0) : 0;

  return {
    quantity: qty,
    basePrice: price,
    pricePerUnit,
    totalPrice,
    originalTotal,
    savings,
    savingsPercent,
    hasOffer: !!applicableOffer,
    offer: applicableOffer
  };
};

/**
 * Calculate price for a package with quantity offers
 * @param {Object} packageData - Package data with price and offers
 * @param {number} quantity - Number of packages
 * @returns {Object} Price calculation result
 */
export const calculatePackagePrice = (packageData, quantity) => {
  if (!packageData) return null;

  const basePrice = parseFloat(packageData.price) || 0;
  const qty = parseInt(quantity) || 1;

  return calculateServicePrice(basePrice, qty, packageData.quantityOffers || []);
};

/**
 * Get the best offer for a given quantity
 * @param {number} quantity - Number of units
 * @param {Array} quantityOffers - Array of quantity-based offers
 * @returns {Object|null} Best applicable offer or null
 */
export const getBestOffer = (quantity, quantityOffers = []) => {
  const qty = parseInt(quantity) || 1;
  
  if (!quantityOffers || quantityOffers.length === 0) return null;

  const sortedOffers = [...quantityOffers]
    .filter(offer => offer.isActive !== false)
    .sort((a, b) => b.minQuantity - a.minQuantity);

  for (const offer of sortedOffers) {
    if (qty >= offer.minQuantity) {
      if (!offer.maxQuantity || qty <= offer.maxQuantity) {
        return offer;
      }
    }
  }

  return null;
};

/**
 * Format price with currency symbol
 * @param {number} price - Price to format
 * @param {string} currency - Currency symbol (default: ₹)
 * @returns {string} Formatted price
 */
export const formatPrice = (price, currency = '₹') => {
  const amount = parseFloat(price) || 0;
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Calculate discount percentage
 * @param {number} originalPrice - Original price
 * @param {number} discountedPrice - Discounted price
 * @returns {number} Discount percentage
 */
export const calculateDiscountPercent = (originalPrice, discountedPrice) => {
  const original = parseFloat(originalPrice) || 0;
  const discounted = parseFloat(discountedPrice) || 0;
  
  if (original === 0) return 0;
  
  return Math.round(((original - discounted) / original) * 100);
};

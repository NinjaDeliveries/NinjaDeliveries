// ✅ FIXED PAYMENT CALCULATION FOR PACKAGES
// Use this in your payment/revenue calculation logic

/**
 * Gets the correct price for a booking
 * 
 * IMPORTANT: For package bookings:
 * - Each individual booking in a package shows ₹0 (included in package)
 * - The packagePrice field contains the TOTAL price for the entire package
 * - Only show packagePrice in the package group header, not on individual bookings
 * 
 * @param {Object} booking - The booking object
 * @returns {number} The price to display for this individual booking
 */
const getBookingPrice = (booking) => {
  // If it's a package booking (identified by packageType or isPackageBooking flag)
  // Return 0 because the price is already paid as part of the package
  if (booking.packageType || booking.isPackageBooking || booking.isPackageSlot) {
    return 0; // Package bookings show ₹0 - price is in package total
  }
  
  // Regular service booking - use normal pricing
  return booking.totalPrice || booking.price || booking.amount || booking.finalAmount || 0;
};

// ✅ FIXED REVENUE CALCULATION
/**
 * Calculates total revenue from bookings
 * For package bookings: Counts the full package price only ONCE per package
 * For regular bookings: Counts each booking's price
 * 
 * @param {Array} bookings - Array of booking objects
 * @returns {number} Total revenue
 */
const calculateRevenue = (bookings) => {
  // Track unique packages to avoid counting them multiple times
  const packageGroups = new Map();
  let regularRevenue = 0;
  
  bookings.forEach((booking) => {
    // Only count completed bookings
    if (booking.status !== 'completed') {
      return;
    }
    
    // Check if this is a package booking
    if (booking.packageType || booking.isPackageBooking) {
      // Create a unique key for this package
      const packageKey = booking.packageId || `${booking.customerPhone}_${booking.serviceName}_${booking.packageType}`;
      
      // Only add package price once per unique package
      if (!packageGroups.has(packageKey)) {
        packageGroups.set(packageKey, booking.packagePrice || 0);
      }
    } else {
      // Regular booking - add its price
      regularRevenue += getBookingPrice(booking);
    }
  });
  
  // Sum up all package revenues
  const packageRevenue = Array.from(packageGroups.values()).reduce((sum, price) => sum + price, 0);
  
  return packageRevenue + regularRevenue;
};

// ✅ FIXED INVOICE TOTAL CALCULATION
const calculateInvoiceTotal = (bookings) => {
  const packageBookings = bookings.filter(b => b.isPackageBooking);
  const regularBookings = bookings.filter(b => !b.isPackageBooking && !b.isPackageSlot);
  
  // Sum package bookings (use package price)
  const packageTotal = packageBookings.reduce((sum, booking) => {
    return sum + getBookingPrice(booking);
  }, 0);
  
  // Sum regular bookings
  const regularTotal = regularBookings.reduce((sum, booking) => {
    return sum + getBookingPrice(booking);
  }, 0);
  
  return {
    total: packageTotal + regularTotal,
    packageTotal,
    regularTotal,
    packageCount: packageBookings.length,
    regularCount: regularBookings.length
  };
};

export { getBookingPrice, calculateRevenue, calculateInvoiceTotal };

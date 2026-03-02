// 🎯 PACKAGE PRICING FIX - REVENUE & PAYMENT CALCULATIONS
// Use these functions to ensure correct package pricing throughout your app

/**
 * Get Correct Booking Price
 * 🎯 KEY: Package bookings use package price, daily slots use ₹0, regular bookings use normal price
 * @param {Object} booking - Booking document
 * @returns {number} Correct price for this booking
 */
const getBookingPrice = (booking) => {
  // 🎯 PACKAGE BOOKING: Use package price only (never multiplied)
  if (booking.isPackageBooking && booking.packagePrice) {
    return booking.packagePrice;
  }
  
  // 🎯 PACKAGE SLOT: Use 0 (no individual pricing for calendar slots)
  if (booking.isPackageSlot) {
    return 0;
  }
  
  // 🎯 REGULAR SERVICE BOOKING: Use normal pricing
  return booking.totalPrice || booking.price || booking.amount || booking.finalAmount || 0;
};

/**
 * 🎯 FIXED REVENUE CALCULATION
 * Ensures package bookings only count once, regardless of completed days
 * @param {Array} bookings - Array of booking documents
 * @returns {number} Total revenue
 */
const calculateRevenue = (bookings) => {
  return bookings.reduce((total, booking) => {
    // Only count completed bookings
    if (booking.status !== 'completed') {
      return total;
    }
    
    // 🎯 Use correct pricing (package price for packages, normal for regular)
    const price = getBookingPrice(booking);
    return total + price;
  }, 0);
};

/**
 * 🎯 FIXED INVOICE TOTAL CALCULATION
 * Separates package and regular bookings for clear billing
 * @param {Array} bookings - Array of booking documents
 * @returns {Object} Detailed invoice breakdown
 */
const calculateInvoiceTotal = (bookings) => {
  const packageBookings = bookings.filter(b => b.isPackageBooking);
  const regularBookings = bookings.filter(b => !b.isPackageBooking && !b.isPackageSlot);
  
  // 🎯 Sum package bookings (use package price only once)
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
    regularCount: regularBookings.length,
    breakdown: {
      packages: packageBookings.map(b => ({
        id: b.id,
        serviceName: b.serviceName,
        customerName: b.customerName,
        packageType: b.packageType,
        price: getBookingPrice(b),
        completedDays: bookings.filter(slot => 
          slot.parentPackageBooking === b.id && slot.status === 'completed'
        ).length
      })),
      regular: regularBookings.map(b => ({
        id: b.id,
        serviceName: b.serviceName,
        customerName: b.customerName,
        price: getBookingPrice(b)
      }))
    }
  };
};

/**
 * 🎯 DASHBOARD STATS CALCULATION
 * Ensures package revenue is calculated correctly in dashboard
 * @param {Array} bookings - Array of booking documents
 * @returns {Object} Dashboard statistics
 */
const calculateDashboardStats = (bookings) => {
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const packageBookings = bookings.filter(b => b.isPackageBooking);
  
  // 🎯 Revenue calculation (packages counted once only)
  const totalRevenue = calculateRevenue(completedBookings);
  const packageRevenue = packageBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, booking) => sum + getBookingPrice(booking), 0);
  const regularRevenue = completedBookings
    .filter(b => !b.isPackageBooking && !b.isPackageSlot)
    .reduce((sum, booking) => sum + getBookingPrice(booking), 0);
  
  return {
    totalRevenue,
    packageRevenue,
    regularRevenue,
    totalBookings: bookings.length,
    completedBookings: completedBookings.length,
    pendingBookings: pendingBookings.length,
    packageBookings: packageBookings.length,
    completionRate: bookings.length > 0 ? 
      Math.round((completedBookings.length / bookings.length) * 100) : 0
  };
};

/**
 * 🎯 PAYMENT PROCESSING FIX
 * Ensures payment amount is correct for package bookings
 * @param {Object} booking - Booking document
 * @returns {number} Correct payment amount
 */
const getPaymentAmount = (booking) => {
  return getBookingPrice(booking);
};

/**
 * 🎯 NOTIFICATION TRIGGER CONDITION
 * Determines if notification should be sent for this booking
 * @param {Object} booking - Booking document
 * @returns {boolean} Whether to send notification
 */
const shouldSendNotification = (booking) => {
  // 🎯 Only send notification for main package bookings, not daily slots
  if (booking.isPackageSlot) {
    return false;
  }
  
  // Send for all other bookings (regular services + main package bookings)
  return true;
};

export { 
  getBookingPrice, 
  calculateRevenue, 
  calculateInvoiceTotal, 
  calculateDashboardStats,
  getPaymentAmount,
  shouldSendNotification
};

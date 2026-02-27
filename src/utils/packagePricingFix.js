// ✅ FIXED PAYMENT CALCULATION FOR PACKAGES
// Use this in your payment/revenue calculation logic

const getBookingPrice = (booking) => {
  // If it's a package booking, use package price only
  if (booking.isPackageBooking && booking.packagePrice) {
    return booking.packagePrice;
  }
  
  // If it's a package slot, use 0 (no individual pricing)
  if (booking.isPackageSlot) {
    return 0;
  }
  
  // Regular service booking - use normal pricing
  return booking.totalPrice || booking.price || booking.amount || booking.finalAmount || 0;
};

// ✅ FIXED REVENUE CALCULATION
const calculateRevenue = (bookings) => {
  return bookings.reduce((total, booking) => {
    // Only count completed bookings
    if (booking.status !== 'completed') {
      return total;
    }
    
    // Use package price for package bookings
    const price = getBookingPrice(booking);
    return total + price;
  }, 0);
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

// 🎯 COMPLETE PACKAGE BOOKING FIX - PRODUCTION READY
// Use this function to create package bookings correctly

import { 
  collection, 
  addDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../../context/Firebase";
import { auth } from "../../context/Firebase";

/**
 * Create Package Booking with Correct Pricing
 * @param {Object} bookingData - Basic booking information
 * @param {Object} selectedPackage - Selected package with pricing
 * @returns {Object} Result with success status and details
 */
const createPackageBooking = async (bookingData, selectedPackage) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // 1. CREATE MAIN PACKAGE BOOKING (THE ONE THAT GETS PAID)
    const mainBookingData = {
      companyId: user.uid,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      serviceName: bookingData.serviceName,
      workName: bookingData.workName || bookingData.serviceName,
      
      // PACKAGE IDENTIFICATION
      isPackageBooking: true,                    // 🎯 KEY FLAG
      packageId: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      packageType: selectedPackage.unit,         // 'monthly', 'weekly', 'daily'
      packageDuration: selectedPackage.duration,
      packageUnit: selectedPackage.unit,
      packagePrice: selectedPackage.price,       // 🎯 ACTUAL PACKAGE PRICE (₹1)
      totalDays: selectedPackage.totalDays || 30,
      packageStartDate: bookingData.date,
      packageEndDate: calculateEndDate(bookingData.date, selectedPackage),
      
      // 🎯 PRICING - USE PACKAGE PRICE ONLY (NO MULTIPLICATION)
      price: selectedPackage.price,
      totalPrice: selectedPackage.price,         // 🎯 SAME AS PACKAGE PRICE
      amount: selectedPackage.price,
      finalAmount: selectedPackage.price,
      
      // BOOKING DETAILS
      status: "pending",
      date: bookingData.date,                     // Start date
      time: bookingData.time || "09:00",
      address: bookingData.address,
      notes: bookingData.notes,
      
      // SERVICE DETAILS
      categoryName: bookingData.categoryName,
      workerAssigned: false,
      workerId: null,
      workerName: null,
      startOtp: null,
      otpVerified: false,
      
      // METADATA
      createdAt: serverTimestamp(),
      parentPackageBooking: null,                // Main booking has no parent
    };

    // Create main package booking document
    const packageBookingRef = await addDoc(
      collection(db, "service_bookings"), 
      mainBookingData
    );

    const packageBookingId = packageBookingRef.id;
    console.log("✅ Main package booking created:", packageBookingId);

    // 2. CREATE DAILY SLOT ENTRIES (FOR CALENDAR VISIBILITY ONLY - NO PRICING)
    const dailySlots = [];
    const startDate = new Date(bookingData.date);
    const totalDays = selectedPackage.totalDays || 30;

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dailySlotData = {
        companyId: user.uid,
        customerName: bookingData.customerName,
        customerPhone: bookingData.customerPhone,
        serviceName: bookingData.serviceName,
        workName: bookingData.workName || bookingData.serviceName,
        
        // DATE FOR THIS SPECIFIC DAY
        date: currentDate.toISOString().split('T')[0],
        time: bookingData.time || "09:00",
        
        // 🎯 IMPORTANT: NO PRICING FOR DAILY SLOTS
        price: 0,
        totalPrice: 0,
        amount: 0,
        finalAmount: 0,
        
        // 🎯 PACKAGE REFERENCES (LINK TO MAIN BOOKING)
        isPackageSlot: true,                      // 🎯 KEY FLAG
        parentPackageBooking: packageBookingId,   // 🎯 LINK TO MAIN BOOKING
        packageId: mainBookingData.packageId,
        packageType: selectedPackage.unit,
        
        // STATUS (SPECIAL FOR SLOTS)
        status: "package_slot",                   // 🎯 SPECIAL STATUS
        
        // METADATA
        slotIndex: i + 1,
        totalSlots: totalDays,
        createdAt: serverTimestamp(),
        
        // SERVICE DETAILS
        categoryName: bookingData.categoryName,
        workerAssigned: false,
        workerId: null,
        workerName: null,
        startOtp: null,
        otpVerified: false,
      };

      dailySlots.push(dailySlotData);
    }

    // Batch create daily slots
    const batchPromises = dailySlots.map(slotData => 
      addDoc(collection(db, "service_bookings"), slotData)
    );

    await Promise.all(batchPromises);
    console.log(`✅ Created ${dailySlots.length} daily slots for package`);

    // 3. SEND SINGLE NOTIFICATION (FOR MAIN PACKAGE BOOKING ONLY)
    await sendPackageNotification(mainBookingData, packageBookingId);

    return {
      success: true,
      packageBookingId,
      dailySlotsCount: dailySlots.length,
      totalPrice: selectedPackage.price,
      message: `Package booking created successfully! Total: ₹${selectedPackage.price}`
    };

  } catch (error) {
    console.error("❌ Error creating package booking:", error);
    return {
      success: false,
      error: error.message,
      message: "Failed to create package booking"
    };
  }
};

// Helper function to calculate end date
const calculateEndDate = (startDate, packageInfo) => {
  const start = new Date(startDate);
  const totalDays = packageInfo.totalDays || 30;
  const end = new Date(start);
  end.setDate(start.getDate() + totalDays - 1);
  return end.toISOString().split('T')[0];
};

// 🎯 SINGLE NOTIFICATION FOR PACKAGE (NOT FOR EACH DAILY SLOT)
const sendPackageNotification = async (bookingData, bookingId) => {
  try {
    // 🎯 ONLY SEND NOTIFICATION FOR MAIN PACKAGE BOOKING
    const notificationData = {
      type: "package_booking_created",
      companyId: bookingData.companyId,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      serviceName: bookingData.serviceName,
      packageType: bookingData.packageType,
      packagePrice: bookingData.packagePrice,      // 🎯 USE PACKAGE PRICE
      totalDays: bookingData.totalDays,
      bookingId: bookingId,
      message: `📦 New package booking: ${bookingData.serviceName} - ${bookingData.packageType} (₹${bookingData.packagePrice})`,
      createdAt: new Date(),
      
      // 🎯 PREVENT DUPLICATE NOTIFICATIONS
      isPackageNotification: true,
      packageId: bookingData.packageId,
    };

    // Add to notifications collection
    await addDoc(collection(db, "service_notifications"), notificationData);
    
    console.log("✅ Package notification sent:", notificationData);
  } catch (error) {
    console.error("❌ Error sending package notification:", error);
  }
};

export { createPackageBooking, calculateEndDate, sendPackageNotification };

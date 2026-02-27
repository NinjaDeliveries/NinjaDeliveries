// ✅ FIXED PACKAGE BOOKING CREATION
// Use this function to create package bookings correctly

import { 
  collection, 
  addDoc, 
  doc, 
  setDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../../context/Firebase";

const createPackageBooking = async (bookingData, selectedPackage) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    // 1. CREATE MAIN PACKAGE BOOKING
    const mainBookingData = {
      companyId: user.uid,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      serviceName: bookingData.serviceName,
      workName: bookingData.workName || bookingData.serviceName,
      
      // PACKAGE INFO
      packageType: selectedPackage.unit, // 'monthly', 'weekly', 'daily'
      packageDuration: selectedPackage.duration,
      packageUnit: selectedPackage.unit,
      packagePrice: selectedPackage.price, // ACTUAL PACKAGE PRICE
      totalDays: selectedPackage.totalDays || 30,
      packageStartDate: bookingData.date,
      packageEndDate: calculateEndDate(bookingData.date, selectedPackage),
      
      // PRICING (FIXED - USE PACKAGE PRICE ONLY)
      price: selectedPackage.price,
      totalPrice: selectedPackage.price, // SAME AS PACKAGE PRICE
      amount: selectedPackage.price,
      finalAmount: selectedPackage.price,
      
      // BOOKING DETAILS
      status: "pending",
      date: bookingData.date, // Start date
      time: bookingData.time || "09:00",
      address: bookingData.address,
      notes: bookingData.notes,
      
      // METADATA
      isPackageBooking: true,
      packageId: `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: serverTimestamp(),
      
      // SERVICE DETAILS
      categoryName: bookingData.categoryName,
      workerAssigned: false,
      workerId: null,
      workerName: null,
      startOtp: null,
      otpVerified: false
    };

    // Create main package booking
    const packageBookingRef = await addDoc(
      collection(db, "service_bookings"), 
      mainBookingData
    );

    const packageBookingId = packageBookingRef.id;
    console.log("✅ Main package booking created:", packageBookingId);

    // 2. CREATE DAILY SLOT ENTRIES (for calendar visibility only)
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
        
        // IMPORTANT: NO PRICING FOR DAILY SLOTS
        price: 0,
        totalPrice: 0,
        amount: 0,
        finalAmount: 0,
        
        // PACKAGE REFERENCES
        isPackageSlot: true,
        parentPackageBooking: packageBookingId,
        packageId: mainBookingData.packageId,
        packageType: selectedPackage.unit,
        
        // STATUS (SPECIAL)
        status: "package_slot", // Special status for calendar slots
        
        // METADATA
        slotIndex: i + 1,
        totalSlots: totalDays,
        createdAt: serverTimestamp()
      };

      dailySlots.push(dailySlotData);
    }

    // Batch create daily slots
    const batchPromises = dailySlots.map(slotData => 
      addDoc(collection(db, "service_bookings"), slotData)
    );

    await Promise.all(batchPromises);
    console.log(`✅ Created ${dailySlots.length} daily slots for package`);

    // 3. SEND SINGLE NOTIFICATION (for main package booking only)
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

// Helper function to send single notification for package
const sendPackageNotification = async (bookingData, bookingId) => {
  try {
    // Send to your notification system
    const notificationData = {
      type: "package_booking_created",
      companyId: bookingData.companyId,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      serviceName: bookingData.serviceName,
      packageType: bookingData.packageType,
      packagePrice: bookingData.packagePrice,
      totalDays: bookingData.totalDays,
      bookingId: bookingId,
      message: `New package booking: ${bookingData.serviceName} - ${bookingData.packageType} (₹${bookingData.packagePrice})`,
      createdAt: new Date()
    };

    // Add to your notifications collection
    await addDoc(collection(db, "service_notifications"), notificationData);
    
    console.log("✅ Package notification sent:", notificationData);
  } catch (error) {
    console.error("❌ Error sending package notification:", error);
  }
};

export { createPackageBooking, calculateEndDate, sendPackageNotification };

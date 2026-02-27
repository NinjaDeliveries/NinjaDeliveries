// 🎯 NOTIFICATION SYSTEM FIX - PACKAGE BOOKINGS
// Use this to ensure only 1 notification per package booking

import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../context/Firebase";
import { shouldSendNotification } from "./packagePricingFixUpdated";

/**
 * 🎯 FIXED NOTIFICATION TRIGGER
 * Only sends notifications for legitimate bookings (not package slots)
 * @param {Object} bookingData - Booking data
 * @param {string} bookingId - Booking document ID
 * @returns {Promise<void>}
 */
const sendBookingNotification = async (bookingData, bookingId) => {
  try {
    // 🎯 CHECK IF NOTIFICATION SHOULD BE SENT
    if (!shouldSendNotification(bookingData)) {
      console.log("🔇 Notification skipped for package slot:", bookingId);
      return;
    }

    // 🎯 BUILD NOTIFICATION DATA
    const notificationData = {
      type: bookingData.isPackageBooking ? "package_booking_created" : "booking_created",
      companyId: bookingData.companyId,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      serviceName: bookingData.serviceName,
      workName: bookingData.workName,
      bookingId: bookingId,
      date: bookingData.date,
      time: bookingData.time,
      address: bookingData.address,
      
      // 🎯 PRICING (USE CORRECT PACKAGE PRICE IF APPLICABLE)
      amount: bookingData.isPackageBooking ? 
        bookingData.packagePrice : 
        (bookingData.totalPrice || bookingData.price || bookingData.amount || 0),
      
      // 🎯 PACKAGE SPECIFIC FIELDS
      ...(bookingData.isPackageBooking && {
        packageType: bookingData.packageType,
        packageDuration: bookingData.packageDuration,
        packagePrice: bookingData.packagePrice,
        totalDays: bookingData.totalDays,
        packageId: bookingData.packageId,
      }),
      
      // MESSAGE
      message: bookingData.isPackageBooking ? 
        `📦 New package booking: ${bookingData.serviceName} - ${bookingData.packageType} (₹${bookingData.packagePrice})` :
        `🎯 New booking: ${bookingData.serviceName} for ${bookingData.customerName}`,
      
      createdAt: new Date(),
      status: "unread",
      
      // 🎯 PREVENT DUPLICATES
      isPackageNotification: bookingData.isPackageBooking || false,
      packageId: bookingData.packageId || null,
    };

    // Add to notifications collection
    await addDoc(collection(db, "service_notifications"), notificationData);
    
    console.log("✅ Notification sent:", notificationData.type, bookingId);
    
    // 🎯 SEND WHATSAPP NOTIFICATION (IF ENABLED)
    await sendWhatsAppNotification(bookingData, bookingId);
    
  } catch (error) {
    console.error("❌ Error sending notification:", error);
  }
};

/**
 * 🎯 WHATSAPP NOTIFICATION (SINGLE PER PACKAGE)
 * @param {Object} bookingData - Booking data
 * @param {string} bookingId - Booking document ID
 */
const sendWhatsAppNotification = async (bookingData, bookingId) => {
  try {
    // 🎯 SKIP FOR PACKAGE SLOTS
    if (bookingData.isPackageSlot) {
      console.log("🔇 WhatsApp notification skipped for package slot");
      return;
    }

    const whatsappData = {
      bookingId: bookingId,
      companyName: bookingData.companyName || "Service Company",
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      service: bookingData.workName || bookingData.serviceName,
      
      // 🎯 USE CORRECT PRICING
      amount: bookingData.isPackageBooking ? 
        bookingData.packagePrice : 
        (bookingData.totalPrice || bookingData.price || bookingData.amount || 0),
      
      date: bookingData.date,
      time: bookingData.time,
      address: bookingData.address,
      
      // 🎯 PACKAGE INFO
      ...(bookingData.isPackageBooking && {
        packageType: bookingData.packageType,
        packagePrice: bookingData.packagePrice,
        totalDays: bookingData.totalDays,
      }),
    };

    // Send to your WhatsApp Cloud Function
    const response = await fetch(
      "https://us-central1-ninjadeliveries-91007.cloudfunctions.net/sendWhatsAppMessage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappData),
      }
    );

    console.log("✅ WhatsApp notification sent for:", bookingId);
    
  } catch (error) {
    console.error("❌ Error sending WhatsApp notification:", error);
    // Don't fail the whole operation if WhatsApp fails
  }
};

/**
 * 🎯 REAL-TIME NOTIFICATION LISTENER
 * Automatically triggers notifications for new bookings (with package fix)
 */
const setupNotificationListener = () => {
  const bookingsQuery = collection(db, "service_bookings");
  
  const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const bookingData = change.doc.data();
        const bookingId = change.doc.id;
        
        // 🎯 AUTOMATICALLY SEND NOTIFICATION (WITH PACKAGE LOGIC)
        sendBookingNotification(bookingData, bookingId);
      }
    });
  });
  
  return unsubscribe;
};

/**
 * 🎯 MANUAL NOTIFICATION TRIGGER (for existing bookings)
 * Use this to send notifications for bookings created before the fix
 */
const triggerNotificationForBooking = async (bookingId) => {
  try {
    const bookingDoc = await doc(db, "service_bookings", bookingId);
    const bookingSnap = await getDoc(bookingDoc);
    
    if (bookingSnap.exists()) {
      const bookingData = bookingSnap.data();
      await sendBookingNotification(bookingData, bookingId);
      console.log("✅ Manual notification triggered for:", bookingId);
    } else {
      console.error("❌ Booking not found:", bookingId);
    }
  } catch (error) {
    console.error("❌ Error triggering manual notification:", error);
  }
};

export { 
  sendBookingNotification, 
  sendWhatsAppNotification, 
  setupNotificationListener,
  triggerNotificationForBooking 
};

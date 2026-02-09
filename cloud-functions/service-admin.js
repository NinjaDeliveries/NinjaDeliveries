// Cloud Functions for Service Admin
// ========================================

// 1. Update Company Metrics
exports.updateCompanyMetrics = functions.firestore
  .document('bookings/{bookingId}')
  .onWrite(async (change, context) => {
    const booking = change.after.data();
    if (!booking) return null;

    const companyId = booking.companyId;
    const companyRef = db.collection('companies').doc(companyId);

    try {
      // Get all bookings for this company
      const bookingsSnapshot = await db.collection('bookings')
        .where('companyId', '==', companyId)
        .get();

      const bookings = bookingsSnapshot.docs.map(doc => doc.data());
      
      // Calculate metrics
      const totalBookings = bookings.length;
      const completedBookings = bookings.filter(b => b.status === 'completed').length;
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
      const totalRevenue = bookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      // Update company metrics
      await companyRef.update({
        'metrics.totalBookings': totalBookings,
        'metrics.completionRate': Math.round(completionRate),
        'billing.totalRevenue': totalRevenue,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Updated metrics for company ${companyId}`);
      return null;
    } catch (error) {
      console.error('Error updating company metrics:', error);
      return null;
    }
  });

// 2. Log User Activity
exports.logUserActivity = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { action, companyId, details = {} } = data;
  const userId = context.auth.uid;

  try {
    // Get user IP and device info
    const userAgent = context.rawRequest.headers['user-agent'] || '';
    const clientIP = context.rawRequest.ip || 'Unknown';

    const deviceInfo = {
      userAgent,
      ip: clientIP,
      ...parseUserAgent(userAgent)
    };

    const activityData = {
      companyId,
      userId,
      action,
      details,
      deviceInfo,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: determineActivityType(action)
    };

    await db.collection('activityLogs').add(activityData);
    return { success: true };
  } catch (error) {
    console.error('Error logging activity:', error);
    throw new functions.https.HttpsError('internal', 'Failed to log activity');
  }
});

// 3. Handle Category Deletion
exports.handleCategoryDeletion = functions.firestore
  .document('categories/{categoryId}')
  .onDelete(async (snap, context) => {
    const deletedCategory = snap.data();
    const categoryId = context.params.categoryId;

    try {
      // Find all services in this category
      const servicesSnapshot = await db.collection('services')
        .where('category', '==', deletedCategory.name)
        .get();

      const batch = db.batch();

      // Update services to "Uncategorized" or move to default category
      servicesSnapshot.docs.forEach(doc => {
        const serviceRef = db.collection('services').doc(doc.id);
        batch.update(serviceRef, {
          category: 'Uncategorized',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`Updated ${servicesSnapshot.size} services after category deletion`);
      return null;
    } catch (error) {
      console.error('Error handling category deletion:', error);
      return null;
    }
  });

// 4. Generate Daily Analytics
exports.generateDailyAnalytics = functions.pubsub
  .schedule('0 2 * * *') // Run daily at 2 AM
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format

    try {
      // Get companies data
      const companiesSnapshot = await db.collection('companies').get();
      const companies = companiesSnapshot.docs.map(doc => doc.data());

      // Get bookings data for yesterday
      const bookingsSnapshot = await db.collection('bookings')
        .where('bookingDate', '>=', yesterday)
        .where('bookingDate', '<', today)
        .get();

      const bookings = bookingsSnapshot.docs.map(doc => doc.data());

      // Calculate metrics
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.status === 'active').length;
      const newRegistrations = companies.filter(c => 
        c.createdAt && c.createdAt.toDate().toDateString() === yesterday.toDateString()
      ).length;
      const totalBookings = bookings.length;
      const totalRevenue = bookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      // Get top companies
      const companyBookings = {};
      bookings.forEach(booking => {
        if (!companyBookings[booking.companyId]) {
          companyBookings[booking.companyId] = {
            bookings: 0,
            revenue: 0
          };
        }
        companyBookings[booking.companyId].bookings++;
        if (booking.paymentStatus === 'paid') {
          companyBookings[booking.companyId].revenue += booking.amount || 0;
        }
      });

      const topCompanies = Object.entries(companyBookings)
        .map(([companyId, data]) => {
          const company = companies.find(c => c.id === companyId);
          return {
            companyId,
            companyName: company?.companyName || 'Unknown',
            ...data
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Store analytics
      await db.collection('analytics').doc('daily').collection(dateStr).set({
        date: dateStr,
        totalCompanies,
        activeCompanies,
        newRegistrations,
        totalBookings,
        totalRevenue,
        topCompanies,
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Generated daily analytics for ${dateStr}`);
      return null;
    } catch (error) {
      console.error('Error generating daily analytics:', error);
      return null;
    }
  });

// 5. Update Online Status
exports.updateOnlineStatus = functions.database
  .ref('onlineStatus/{companyId}')
  .onWrite(async (change, context) => {
    const companyId = context.params.companyId;
    const statusData = change.after.val();

    if (!statusData) return null;

    try {
      const companyRef = db.collection('companies').doc(companyId);
      await companyRef.update({
        isOnline: statusData.isOnline,
        lastSeen: statusData.lastSeen,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return null;
    } catch (error) {
      console.error('Error updating online status:', error);
      return null;
    }
  });

// 6. Export Data Function
exports.exportData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { type, filters = {} } = data;

  try {
    let query = db.collection(type);

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.dateFrom) {
      query = query.where('createdAt', '>=', new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      query = query.where('createdAt', '<=', new Date(filters.dateTo));
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: docs };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw new functions.https.HttpsError('internal', 'Failed to export data');
  }
});

// 7. Send Notification
exports.sendNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { companyId, title, message, type = 'info' } = data;

  try {
    // Store notification
    await db.collection('notifications').add({
      companyId,
      title,
      message,
      type,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send push notification if user has FCM token
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (fcmToken) {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title,
          body: message,
        },
        data: {
          type,
          companyId,
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let device = 'Desktop';
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    device = /tablet|ipad/i.test(ua) ? 'Tablet' : 'Mobile';
  }

  // Detect OS
  let os = 'Unknown';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  // Detect browser
  let browser = 'Unknown';
  if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opera/i.test(ua)) browser = 'Opera';

  return { device, os, browser };
}

function determineActivityType(action) {
  if (action.includes('login') || action.includes('logout')) return 'auth';
  if (action.includes('create') || action.includes('add')) return 'create';
  if (action.includes('update') || action.includes('edit')) return 'update';
  if (action.includes('delete') || action.includes('remove')) return 'delete';
  if (action.includes('booking')) return 'booking';
  if (action.includes('payment')) return 'payment';
  return 'other';
}

/**
 * Cloud Functions for Company Availability System
 * These functions automatically update company availability when bookings or workers change
 * Deploy these to Firebase Functions for automatic real-time updates
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Check if a worker is available at a specific time
 */
async function isWorkerAvailable(workerId, startTime, endTime) {
  try {
    console.log(`Checking availability for worker ${workerId}`);
    
    const bookingsQuery = db.collection('service_bookings')
      .where('assignedWorker', '==', workerId)
      .where('status', 'in', ['confirmed', 'in_progress', 'assigned']);

    const bookingsSnap = await bookingsQuery.get();
    
    for (const bookingDoc of bookingsSnap.docs) {
      const booking = bookingDoc.data();
      
      let bookingStart, bookingEnd;
      
      if (booking.scheduledDate && booking.scheduledTime) {
        bookingStart = new Date(`${booking.scheduledDate} ${booking.scheduledTime}`);
        bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60000);
      } else if (booking.startTime && booking.endTime) {
        bookingStart = booking.startTime.toDate();
        bookingEnd = booking.endTime.toDate();
      } else {
        continue;
      }

      // Check for time conflicts
      if (startTime < bookingEnd && endTime > bookingStart) {
        console.log(`Worker ${workerId} has conflict with booking ${bookingDoc.id}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking worker availability:', error);
    return false;
  }
}

/**
 * Update company availability status
 */
async function updateCompanyAvailability(companyId) {
  try {
    console.log(`Updating availability for company ${companyId}`);
    
    // Get all active workers for the company
    const workersQuery = db.collection('service_workers')
      .where('companyId', '==', companyId)
      .where('isActive', '==', true);

    const workersSnap = await workersQuery.get();
    const workers = workersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (workers.length === 0) {
      console.log(`No active workers found for company ${companyId}`);
      await updateAvailabilityRecord(companyId, false, 0, workers.length);
      return false;
    }

    // Check availability for the next 24 hours
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    let availableWorkers = 0;
    
    for (const worker of workers) {
      const isAvailable = await isWorkerAvailable(worker.id, now, next24Hours);
      if (isAvailable) {
        availableWorkers++;
      }
    }
    
    const isCompanyAvailable = availableWorkers > 0;
    
    // Update availability record
    await updateAvailabilityRecord(companyId, isCompanyAvailable, availableWorkers, workers.length);
    
    console.log(`Company ${companyId} availability updated: ${isCompanyAvailable ? 'Available' : 'Busy'} (${availableWorkers}/${workers.length} workers)`);
    
    return isCompanyAvailable;
  } catch (error) {
    console.error('Error updating company availability:', error);
    return false;
  }
}

/**
 * Update or create availability record
 */
async function updateAvailabilityRecord(companyId, isAvailable, availableWorkers, totalWorkers) {
  try {
    const availabilityData = {
      companyId: companyId,
      isAvailable: isAvailable,
      availableWorkers: availableWorkers,
      totalWorkers: totalWorkers,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      checkedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    // Check if record exists
    const availabilityQuery = db.collection('company_availability')
      .where('companyId', '==', companyId);
    
    const availabilitySnap = await availabilityQuery.get();
    
    if (availabilitySnap.empty) {
      // Create new record
      await db.collection('company_availability').add(availabilityData);
    } else {
      // Update existing record
      const docRef = availabilitySnap.docs[0].ref;
      await docRef.update(availabilityData);
    }
    
    console.log(`Availability record updated for company ${companyId}`);
  } catch (error) {
    console.error('Error updating availability record:', error);
  }
}

/**
 * Cloud Function: Triggered when a booking is created, updated, or deleted
 */
exports.onBookingChange = functions.firestore
  .document('service_bookings/{bookingId}')
  .onWrite(async (change, context) => {
    try {
      const bookingId = context.params.bookingId;
      console.log(`Booking change detected: ${bookingId}`);
      
      let companyId = null;
      
      if (change.after.exists) {
        // Document was created or updated
        const bookingData = change.after.data();
        companyId = bookingData.companyId;
      } else if (change.before.exists) {
        // Document was deleted
        const bookingData = change.before.data();
        companyId = bookingData.companyId;
      }
      
      if (companyId) {
        console.log(`Updating availability for company ${companyId} due to booking change`);
        await updateCompanyAvailability(companyId);
        
        // Also trigger update for any other companies if worker was reassigned
        if (change.before.exists && change.after.exists) {
          const beforeData = change.before.data();
          const afterData = change.after.data();
          
          if (beforeData.companyId !== afterData.companyId) {
            console.log(`Worker reassigned, updating both companies`);
            await updateCompanyAvailability(beforeData.companyId);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in onBookingChange:', error);
      return null;
    }
  });

/**
 * Cloud Function: Triggered when a worker is created, updated, or deleted
 */
exports.onWorkerChange = functions.firestore
  .document('service_workers/{workerId}')
  .onWrite(async (change, context) => {
    try {
      const workerId = context.params.workerId;
      console.log(`Worker change detected: ${workerId}`);
      
      let companyId = null;
      
      if (change.after.exists) {
        // Document was created or updated
        const workerData = change.after.data();
        companyId = workerData.companyId;
      } else if (change.before.exists) {
        // Document was deleted
        const workerData = change.before.data();
        companyId = workerData.companyId;
      }
      
      if (companyId) {
        console.log(`Updating availability for company ${companyId} due to worker change`);
        await updateCompanyAvailability(companyId);
      }
      
      return null;
    } catch (error) {
      console.error('Error in onWorkerChange:', error);
      return null;
    }
  });

/**
 * Cloud Function: HTTP endpoint for checking company availability (for mobile app)
 */
exports.checkCompanyAvailability = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }
    
    const { companyId, startTime, endTime } = req.query;
    
    if (!companyId || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: companyId, startTime, endTime'
      });
      return;
    }
    
    console.log(`API request: Checking availability for company ${companyId}`);
    
    // Update and get current availability
    const isAvailable = await updateCompanyAvailability(companyId);
    
    // Get availability record
    const availabilityQuery = db.collection('company_availability')
      .where('companyId', '==', companyId);
    
    const availabilitySnap = await availabilityQuery.get();
    let availabilityData = null;
    
    if (!availabilitySnap.empty) {
      availabilityData = availabilitySnap.docs[0].data();
    }
    
    const response = {
      success: true,
      companyId,
      isAvailable,
      availableWorkers: availabilityData?.availableWorkers || 0,
      totalWorkers: availabilityData?.totalWorkers || 0,
      lastUpdated: availabilityData?.lastUpdated?.toDate()?.toISOString() || new Date().toISOString(),
      timeSlot: {
        startTime,
        endTime
      }
    };
    
    console.log(`API response: Company ${companyId} availability: ${isAvailable}`);
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Error in checkCompanyAvailability API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cloud Function: HTTP endpoint for bulk availability check (for mobile app)
 */
exports.checkBulkAvailability = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }
    
    const { companyIds, startTime, endTime } = req.body;
    
    if (!companyIds || !Array.isArray(companyIds) || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: companyIds (array), startTime, endTime'
      });
      return;
    }
    
    console.log(`API request: Bulk availability check for ${companyIds.length} companies`);
    
    const results = {};
    
    // Process companies in parallel
    await Promise.all(
      companyIds.map(async (companyId) => {
        try {
          const isAvailable = await updateCompanyAvailability(companyId);
          
          // Get availability record
          const availabilityQuery = db.collection('company_availability')
            .where('companyId', '==', companyId);
          
          const availabilitySnap = await availabilityQuery.get();
          let availabilityData = null;
          
          if (!availabilitySnap.empty) {
            availabilityData = availabilitySnap.docs[0].data();
          }
          
          results[companyId] = {
            isAvailable,
            availableWorkers: availabilityData?.availableWorkers || 0,
            totalWorkers: availabilityData?.totalWorkers || 0,
            lastUpdated: availabilityData?.lastUpdated?.toDate()?.toISOString() || new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error checking availability for company ${companyId}:`, error);
          results[companyId] = {
            isAvailable: false,
            availableWorkers: 0,
            totalWorkers: 0,
            error: error.message
          };
        }
      })
    );
    
    const response = {
      success: true,
      checkedAt: new Date().toISOString(),
      timeSlot: { startTime, endTime },
      companies: results,
      summary: {
        total: companyIds.length,
        available: Object.values(results).filter(r => r.isAvailable).length,
        busy: Object.values(results).filter(r => !r.isAvailable).length
      }
    };
    
    console.log(`API response: Bulk check completed - ${response.summary.available}/${response.summary.total} available`);
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Error in checkBulkAvailability API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Scheduled function to clean up expired reservations and update availability
 */
exports.scheduledAvailabilityUpdate = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      console.log('Running scheduled availability update...');
      
      // Clean up expired reservations
      const now = new Date();
      const expiredReservationsQuery = db.collection('worker_reservations')
        .where('expiresAt', '<', now)
        .where('status', '==', 'reserved');
      
      const expiredSnap = await expiredReservationsQuery.get();
      
      const updatePromises = expiredSnap.docs.map(doc => 
        doc.ref.update({ status: 'expired' })
      );
      
      await Promise.all(updatePromises);
      
      if (expiredSnap.size > 0) {
        console.log(`Cleaned up ${expiredSnap.size} expired reservations`);
      }
      
      // Update availability for all companies (optional - can be resource intensive)
      // Uncomment if you want periodic updates for all companies
      /*
      const companiesQuery = db.collection('service_companies')
        .where('isActive', '==', true);
      
      const companiesSnap = await companiesQuery.get();
      
      const availabilityPromises = companiesSnap.docs.map(doc => 
        updateCompanyAvailability(doc.id)
      );
      
      await Promise.all(availabilityPromises);
      
      console.log(`Updated availability for ${companiesSnap.size} companies`);
      */
      
      return null;
    } catch (error) {
      console.error('Error in scheduled availability update:', error);
      return null;
    }
  });

// Export utility functions for testing
exports.updateCompanyAvailability = updateCompanyAvailability;
exports.isWorkerAvailable = isWorkerAvailable;
import { db } from "../context/Firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  addDoc 
} from "firebase/firestore";

/**
 * Real-time Worker Availability Checker
 */

export const checkWorkerAvailability = async (companyId, serviceId, requestedDate, requestedTime) => {
  try {
    console.log('🔍 Checking worker availability for:', {
      companyId,
      serviceId, 
      requestedDate,
      requestedTime
    });

    // 1️⃣ Get all workers for this company and service
    const workersQuery = query(
      collection(db, "service_technicians"),
      where("companyId", "==", companyId),
      where("isActive", "==", true),
      where("assignedServices", "array-contains", serviceId)
    );

    const workersSnapshot = await getDocs(workersQuery);
    
    if (workersSnapshot.empty) {
      console.log('❌ No workers found for this service');
      return {
        available: false,
        reason: 'NO_WORKERS_FOR_SERVICE',
        message: 'No workers available for this service',
        availableWorkers: 0,
        totalWorkers: 0
      };
    }

    const allWorkers = workersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('👥 Total workers for service:', allWorkers.length);

    // 2️⃣ Check each worker's availability for the requested time slot
    const availableWorkers = [];
    const busyWorkers = [];

    for (const worker of allWorkers) {
      const isAvailable = await checkSingleWorkerAvailability(
        worker.id, 
        requestedDate, 
        requestedTime
      );

      if (isAvailable.available) {
        availableWorkers.push({
          ...worker,
          availabilityDetails: isAvailable
        });
      } else {
        busyWorkers.push({
          ...worker,
          busyReason: isAvailable.reason,
          conflictingBooking: isAvailable.conflictingBooking
        });
      }
    }

    console.log('✅ Available workers:', availableWorkers.length);
    console.log('🚫 Busy workers:', busyWorkers.length);

    // 3️⃣ Update company availability status in real-time
    await updateCompanyAvailabilityStatus(companyId, serviceId, {
      totalWorkers: allWorkers.length,
      availableWorkers: availableWorkers.length,
      busyWorkers: busyWorkers.length,
      lastChecked: serverTimestamp(),
      requestedSlot: `${requestedDate} ${requestedTime}`
    });

    // 4️⃣ Return availability result
    return {
      available: availableWorkers.length > 0,
      reason: availableWorkers.length > 0 ? 'WORKERS_AVAILABLE' : 'ALL_WORKERS_BUSY',
      message: availableWorkers.length > 0 
        ? `${availableWorkers.length} workers available`
        : 'All workers are busy for this time slot',
      availableWorkers: availableWorkers.length,
      totalWorkers: allWorkers.length,
      availableWorkersList: availableWorkers,
      busyWorkersList: busyWorkers
    };

  } catch (error) {
    console.error('❌ Error checking worker availability:', error);
    return {
      available: false,
      reason: 'ERROR',
      message: 'Error checking availability',
      error: error.message
    };
  }
};

/**
 * Check single worker availability for specific time slot
 */
const checkSingleWorkerAvailability = async (workerId, requestedDate, requestedTime) => {
  try {
    // Parse requested time
    const [startTime, endTime] = requestedTime.split(' - ');
    const requestedStart = new Date(`${requestedDate} ${startTime}`);
    const requestedEnd = new Date(`${requestedDate} ${endTime}`);

    // Check for conflicting bookings
    const bookingsQuery = query(
      collection(db, "service_bookings"),
      where("assignedWorker", "==", workerId),
      where("status", "in", ["pending", "assigned", "in-progress"])
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = bookingDoc.data();
      
      // Parse booking time
      if (booking.selectedDate && booking.selectedTime) {
        const bookingDate = booking.selectedDate;
        const [bookingStart, bookingEnd] = booking.selectedTime.split(' - ');
        
        const bookingStartTime = new Date(`${bookingDate} ${bookingStart}`);
        const bookingEndTime = new Date(`${bookingDate} ${bookingEnd}`);

        // Check for time overlap
        const hasOverlap = (
          (requestedStart >= bookingStartTime && requestedStart < bookingEndTime) ||
          (requestedEnd > bookingStartTime && requestedEnd <= bookingEndTime) ||
          (requestedStart <= bookingStartTime && requestedEnd >= bookingEndTime)
        );

        if (hasOverlap) {
          return {
            available: false,
            reason: 'TIME_CONFLICT',
            conflictingBooking: {
              id: bookingDoc.id,
              date: bookingDate,
              time: booking.selectedTime,
              customer: booking.customerName,
              service: booking.serviceName
            }
          };
        }
      }
    }

    return {
      available: true,
      reason: 'FREE'
    };

  } catch (error) {
    console.error('❌ Error checking single worker:', error);
    return {
      available: false,
      reason: 'ERROR',
      error: error.message
    };
  }
};

/**
 * Update company availability status for app consumption
 */
const updateCompanyAvailabilityStatus = async (companyId, serviceId, availabilityData) => {
  try {
    // Create/Update availability record for this company-service combination
    const availabilityDoc = {
      companyId,
      serviceId,
      ...availabilityData,
      updatedAt: serverTimestamp()
    };

    // Store in service_availability collection for app to consume
    await addDoc(collection(db, "service_availability"), availabilityDoc);

    console.log('✅ Updated company availability status');

  } catch (error) {
    console.error('❌ Error updating availability status:', error);
  }
};

/**
 * Get company availability for app
 */
export const getCompanyAvailabilityForApp = async (companyId, serviceId, date, time) => {
  try {
    // Real-time check
    const availability = await checkWorkerAvailability(companyId, serviceId, date, time);
    
    // Return simplified result for app
    return {
      companyId,
      serviceId,
      available: availability.available,
      availableWorkers: availability.availableWorkers,
      totalWorkers: availability.totalWorkers,
      message: availability.message,
      canBook: availability.available,
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error getting availability for app:', error);
    return {
      companyId,
      serviceId,
      available: false,
      canBook: false,
      message: 'Unable to check availability',
      error: error.message
    };
  }
};

/**
 * Batch check availability for multiple companies (for app service listing)
 */
export const batchCheckCompanyAvailability = async (serviceId, date, time) => {
  try {
    console.log('🔍 Batch checking availability for service:', serviceId);

    // Get all companies providing this service
    const companiesQuery = query(
      collection(db, "service_services"),
      where("adminServiceId", "==", serviceId),
      where("isActive", "==", true)
    );

    const companiesSnapshot = await getDocs(companiesQuery);
    const availabilityResults = [];

    for (const companyDoc of companiesSnapshot.docs) {
      const companyService = companyDoc.data();
      const companyId = companyService.companyId;

      const availability = await getCompanyAvailabilityForApp(
        companyId, 
        serviceId, 
        date, 
        time
      );

      availabilityResults.push({
        ...availability,
        companyName: companyService.companyName || 'Service Provider',
        serviceName: companyService.name || 'Service'
      });
    }

    // Filter out companies with no available workers
    const availableCompanies = availabilityResults.filter(company => company.available);
    
    console.log(`✅ Found ${availableCompanies.length} companies with available workers`);

    return {
      totalCompanies: availabilityResults.length,
      availableCompanies: availableCompanies.length,
      companies: availabilityResults,
      availableOnly: availableCompanies
    };

  } catch (error) {
    console.error('❌ Error in batch availability check:', error);
    return {
      totalCompanies: 0,
      availableCompanies: 0,
      companies: [],
      availableOnly: [],
      error: error.message
    };
  }
};
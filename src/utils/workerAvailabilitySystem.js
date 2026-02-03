import { db } from "../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Worker Availability System
 * Tracks real-time worker availability for companies
 * Prevents overbooking and manages company visibility in app
 */

class WorkerAvailabilitySystem {
  constructor() {
    this.listeners = new Map();
    this.companyAvailability = new Map();
  }

  /**
   * Check if a worker is available at a specific time
   * @param {string} workerId - Worker ID
   * @param {Date} startTime - Booking start time
   * @param {Date} endTime - Booking end time
   * @returns {Promise<boolean>} - Worker availability status
   */
  async isWorkerAvailable(workerId, startTime, endTime) {
    try {
      console.log(`🔍 Checking availability for worker ${workerId}`);
      
      // Query for conflicting bookings
      const bookingsQuery = query(
        collection(db, "service_bookings"),
        where("assignedWorker", "==", workerId),
        where("status", "in", ["confirmed", "in_progress", "assigned"])
      );

      const bookingsSnap = await getDocs(bookingsQuery);
      
      for (const bookingDoc of bookingsSnap.docs) {
        const booking = bookingDoc.data();
        
        // Parse booking times
        let bookingStart, bookingEnd;
        
        if (booking.scheduledDate && booking.scheduledTime) {
          bookingStart = new Date(`${booking.scheduledDate} ${booking.scheduledTime}`);
          bookingEnd = new Date(bookingStart.getTime() + (booking.duration || 60) * 60000);
        } else if (booking.startTime && booking.endTime) {
          bookingStart = booking.startTime.toDate ? booking.startTime.toDate() : new Date(booking.startTime);
          bookingEnd = booking.endTime.toDate ? booking.endTime.toDate() : new Date(booking.endTime);
        } else {
          continue; // Skip if no valid time data
        }

        // Check for time conflicts
        if (this.hasTimeConflict(startTime, endTime, bookingStart, bookingEnd)) {
          console.log(`❌ Worker ${workerId} has conflict with booking ${bookingDoc.id}`);
          return false;
        }
      }

      console.log(`✅ Worker ${workerId} is available`);
      return true;
    } catch (error) {
      console.error("Error checking worker availability:", error);
      return false;
    }
  }

  /**
   * Check if two time ranges conflict
   */
  hasTimeConflict(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get all available workers for a company at a specific time
   * @param {string} companyId - Company ID
   * @param {Date} startTime - Booking start time
   * @param {Date} endTime - Booking end time
   * @param {string} serviceId - Service ID (optional)
   * @returns {Promise<Array>} - Available workers
   */
  async getAvailableWorkers(companyId, startTime, endTime, serviceId = null) {
    try {
      console.log(`🔍 Getting available workers for company ${companyId}`);
      
      // Get all active workers for the company
      let workersQuery = query(
        collection(db, "service_workers"),
        where("companyId", "==", companyId),
        where("isActive", "==", true)
      );

      const workersSnap = await getDocs(workersQuery);
      const availableWorkers = [];

      for (const workerDoc of workersSnap.docs) {
        const worker = { id: workerDoc.id, ...workerDoc.data() };
        
        // Check if worker can handle the service (if specified)
        if (serviceId && worker.assignedServices && !worker.assignedServices.includes(serviceId)) {
          continue;
        }

        // Check worker availability
        const isAvailable = await this.isWorkerAvailable(worker.id, startTime, endTime);
        
        if (isAvailable) {
          availableWorkers.push(worker);
        }
      }

      console.log(`✅ Found ${availableWorkers.length} available workers`);
      return availableWorkers;
    } catch (error) {
      console.error("Error getting available workers:", error);
      return [];
    }
  }

  /**
   * Check if a company has any available workers
   * @param {string} companyId - Company ID
   * @param {Date} startTime - Booking start time
   * @param {Date} endTime - Booking end time
   * @param {string} serviceId - Service ID (optional)
   * @returns {Promise<boolean>} - Company availability status
   */
  async isCompanyAvailable(companyId, startTime, endTime, serviceId = null) {
    try {
      const availableWorkers = await this.getAvailableWorkers(companyId, startTime, endTime, serviceId);
      return availableWorkers.length > 0;
    } catch (error) {
      console.error("Error checking company availability:", error);
      return false;
    }
  }

  /**
   * Update company availability status in real-time
   * @param {string} companyId - Company ID
   */
  async updateCompanyAvailabilityStatus(companyId) {
    try {
      console.log(`🔄 Updating availability status for company ${companyId}`);
      
      // Get current time and next 24 hours
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Check availability for the next 24 hours
      const isAvailable = await this.isCompanyAvailable(companyId, now, next24Hours);
      
      // Update company availability status
      const availabilityData = {
        companyId: companyId,
        isAvailable: isAvailable,
        lastUpdated: serverTimestamp(),
        checkedUntil: next24Hours,
        availableWorkers: isAvailable ? await this.getAvailableWorkers(companyId, now, next24Hours) : [],
      };

      // Store in company_availability collection
      const availabilityQuery = query(
        collection(db, "company_availability"),
        where("companyId", "==", companyId)
      );
      
      const availabilitySnap = await getDocs(availabilityQuery);
      
      if (availabilitySnap.empty) {
        // Create new availability record
        await addDoc(collection(db, "company_availability"), availabilityData);
      } else {
        // Update existing record
        const docRef = availabilitySnap.docs[0].ref;
        await updateDoc(docRef, availabilityData);
      }

      console.log(`✅ Company ${companyId} availability updated: ${isAvailable ? 'Available' : 'Busy'}`);
      
      // Cache the result
      this.companyAvailability.set(companyId, {
        isAvailable,
        lastUpdated: new Date(),
        availableWorkers: availabilityData.availableWorkers.length
      });

      return isAvailable;
    } catch (error) {
      console.error("Error updating company availability:", error);
      return false;
    }
  }

  /**
   * Set up real-time listener for company availability
   * @param {string} companyId - Company ID
   * @param {Function} callback - Callback function for availability changes
   */
  setupAvailabilityListener(companyId, callback) {
    console.log(`🔄 Setting up availability listener for company ${companyId}`);
    
    // Listen to bookings changes
    const bookingsQuery = query(
      collection(db, "service_bookings"),
      where("companyId", "==", companyId)
    );

    const workersQuery = query(
      collection(db, "service_workers"),
      where("companyId", "==", companyId)
    );

    // Bookings listener
    const unsubscribeBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      console.log(`📊 Bookings changed for company ${companyId}`);
      const isAvailable = await this.updateCompanyAvailabilityStatus(companyId);
      callback({ companyId, isAvailable, type: 'bookings_change' });
    });

    // Workers listener
    const unsubscribeWorkers = onSnapshot(workersQuery, async (snapshot) => {
      console.log(`👥 Workers changed for company ${companyId}`);
      const isAvailable = await this.updateCompanyAvailabilityStatus(companyId);
      callback({ companyId, isAvailable, type: 'workers_change' });
    });

    // Store listeners for cleanup
    this.listeners.set(companyId, {
      bookings: unsubscribeBookings,
      workers: unsubscribeWorkers
    });

    // Initial availability check
    this.updateCompanyAvailabilityStatus(companyId).then(isAvailable => {
      callback({ companyId, isAvailable, type: 'initial_check' });
    });

    return () => {
      unsubscribeBookings();
      unsubscribeWorkers();
      this.listeners.delete(companyId);
    };
  }

  /**
   * Get cached company availability
   * @param {string} companyId - Company ID
   * @returns {Object|null} - Cached availability data
   */
  getCachedAvailability(companyId) {
    return this.companyAvailability.get(companyId) || null;
  }

  /**
   * Get availability for multiple companies (for app integration)
   * @param {Array} companyIds - Array of company IDs
   * @param {Date} startTime - Booking start time
   * @param {Date} endTime - Booking end time
   * @returns {Promise<Object>} - Availability status for each company
   */
  async getBulkCompanyAvailability(companyIds, startTime, endTime) {
    try {
      console.log(`🔍 Checking bulk availability for ${companyIds.length} companies`);
      
      // Check availability for multiple companies (for app integration)
      const results = {};
      
      await Promise.all(
        companyIds.map(async (companyId) => {
          const isAvailable = await this.isCompanyAvailable(companyId, startTime, endTime);
          const availableWorkers = isAvailable ? await this.getAvailableWorkers(companyId, startTime, endTime) : [];
          
          results[companyId] = {
            isAvailable,
            availableWorkers: availableWorkers.length,
            workers: availableWorkers.map(w => ({
              id: w.id,
              name: w.name,
              assignedServices: w.assignedServices || []
            }))
          };
        })
      );

      console.log(`✅ Bulk availability check completed`);
      return results;
    } catch (error) {
      console.error("Error checking bulk company availability:", error);
      return {};
    }
  }

  /**
   * Reserve a worker for a booking (temporary hold)
   * @param {string} workerId - Worker ID
   * @param {Date} startTime - Booking start time
   * @param {Date} endTime - Booking end time
   * @param {string} bookingId - Booking ID
   * @returns {Promise<boolean>} - Reservation success
   */
  async reserveWorker(workerId, startTime, endTime, bookingId) {
    try {
      console.log(`🔒 Reserving worker ${workerId} for booking ${bookingId}`);
      
      // Check if worker is still available
      const isAvailable = await this.isWorkerAvailable(workerId, startTime, endTime);
      
      if (!isAvailable) {
        console.log(`❌ Worker ${workerId} is no longer available`);
        return false;
      }

      // Create temporary reservation
      const reservationData = {
        workerId,
        bookingId,
        startTime,
        endTime,
        status: 'reserved',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      };

      await addDoc(collection(db, "worker_reservations"), reservationData);
      
      console.log(`✅ Worker ${workerId} reserved successfully`);
      return true;
    } catch (error) {
      console.error("Error reserving worker:", error);
      return false;
    }
  }

  /**
   * Clean up expired reservations
   */
  async cleanupExpiredReservations() {
    try {
      const now = new Date();
      const reservationsQuery = query(
        collection(db, "worker_reservations"),
        where("expiresAt", "<", now)
      );

      const reservationsSnap = await getDocs(reservationsQuery);
      
      const deletePromises = reservationsSnap.docs.map(doc => 
        updateDoc(doc.ref, { status: 'expired' })
      );

      await Promise.all(deletePromises);
      
      console.log(`🧹 Cleaned up ${reservationsSnap.size} expired reservations`);
    } catch (error) {
      console.error("Error cleaning up reservations:", error);
    }
  }
}

// Create singleton instance
const workerAvailabilitySystem = new WorkerAvailabilitySystem();

// Export for use in components
export default workerAvailabilitySystem;

// Export individual functions for API endpoints
export const {
  isWorkerAvailable,
  getAvailableWorkers,
  isCompanyAvailable,
  updateCompanyAvailabilityStatus,
  setupAvailabilityListener,
  getBulkCompanyAvailability,
  reserveWorker,
  cleanupExpiredReservations
} = workerAvailabilitySystem;
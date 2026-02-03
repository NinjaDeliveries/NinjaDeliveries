import workerAvailabilitySystem from '../utils/workerAvailabilitySystem.js';
import { db } from '../context/Firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * API Endpoints for Company Availability
 * These functions can be called by your mobile app
 */

/**
 * Check if a single company is available for booking
 * @param {string} companyId - Company ID
 * @param {string} startTime - ISO string of booking start time
 * @param {string} endTime - ISO string of booking end time
 * @param {string} serviceId - Optional service ID
 * @returns {Promise<Object>} - Availability response
 */
export const checkCompanyAvailability = async (companyId, startTime, endTime, serviceId = null) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    console.log(`🔍 API: Checking availability for company ${companyId}`);
    
    const isAvailable = await workerAvailabilitySystem.isCompanyAvailable(companyId, start, end, serviceId);
    const availableWorkers = isAvailable ? await workerAvailabilitySystem.getAvailableWorkers(companyId, start, end, serviceId) : [];
    
    const response = {
      success: true,
      companyId,
      isAvailable,
      availableWorkers: availableWorkers.length,
      workers: availableWorkers.map(worker => ({
        id: worker.id,
        name: worker.name,
        assignedServices: worker.assignedServices || [],
        completedJobs: worker.completedJobs || 0
      })),
      checkedAt: new Date().toISOString(),
      timeSlot: {
        startTime,
        endTime
      }
    };
    
    console.log(`✅ API: Company ${companyId} availability: ${isAvailable}`);
    return response;
    
  } catch (error) {
    console.error('API Error checking company availability:', error);
    return {
      success: false,
      error: error.message,
      companyId,
      isAvailable: false
    };
  }
};

/**
 * Check availability for multiple companies (for app home screen)
 * @param {Array} companyIds - Array of company IDs
 * @param {string} startTime - ISO string of booking start time
 * @param {string} endTime - ISO string of booking end time
 * @returns {Promise<Object>} - Bulk availability response
 */
export const checkBulkCompanyAvailability = async (companyIds, startTime, endTime) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    console.log(`🔍 API: Checking bulk availability for ${companyIds.length} companies`);
    
    const results = await workerAvailabilitySystem.getBulkCompanyAvailability(companyIds, start, end);
    
    const response = {
      success: true,
      checkedAt: new Date().toISOString(),
      timeSlot: {
        startTime,
        endTime
      },
      companies: results,
      summary: {
        total: companyIds.length,
        available: Object.values(results).filter(r => r.isAvailable).length,
        busy: Object.values(results).filter(r => !r.isAvailable).length
      }
    };
    
    console.log(`✅ API: Bulk check completed - ${response.summary.available}/${response.summary.total} available`);
    return response;
    
  } catch (error) {
    console.error('API Error checking bulk availability:', error);
    return {
      success: false,
      error: error.message,
      companies: {}
    };
  }
};

/**
 * Get all available companies in a location/category
 * @param {string} location - Location filter (optional)
 * @param {string} categoryId - Category ID filter (optional)
 * @param {string} startTime - ISO string of booking start time
 * @param {string} endTime - ISO string of booking end time
 * @returns {Promise<Object>} - Available companies response
 */
export const getAvailableCompanies = async (location = null, categoryId = null, startTime, endTime) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    console.log(`🔍 API: Getting available companies for location: ${location}, category: ${categoryId}`);
    
    // Build query for companies
    let companiesQuery = collection(db, 'service_companies');
    const constraints = [where('isActive', '==', true)];
    
    if (location) {
      constraints.push(where('location', '==', location));
    }
    
    if (categoryId) {
      constraints.push(where('categories', 'array-contains', categoryId));
    }
    
    companiesQuery = query(companiesQuery, ...constraints);
    
    const companiesSnap = await getDocs(companiesQuery);
    const companies = companiesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Found ${companies.length} companies matching criteria`);
    
    // Check availability for each company
    const availableCompanies = [];
    
    for (const company of companies) {
      const isAvailable = await workerAvailabilitySystem.isCompanyAvailable(company.id, start, end);
      
      if (isAvailable) {
        const availableWorkers = await workerAvailabilitySystem.getAvailableWorkers(company.id, start, end);
        
        availableCompanies.push({
          ...company,
          availableWorkers: availableWorkers.length,
          workers: availableWorkers.map(w => ({
            id: w.id,
            name: w.name
          }))
        });
      }
    }
    
    const response = {
      success: true,
      checkedAt: new Date().toISOString(),
      timeSlot: { startTime, endTime },
      filters: { location, categoryId },
      companies: availableCompanies,
      summary: {
        totalCompanies: companies.length,
        availableCompanies: availableCompanies.length,
        busyCompanies: companies.length - availableCompanies.length
      }
    };
    
    console.log(`✅ API: Found ${availableCompanies.length}/${companies.length} available companies`);
    return response;
    
  } catch (error) {
    console.error('API Error getting available companies:', error);
    return {
      success: false,
      error: error.message,
      companies: []
    };
  }
};

/**
 * Reserve a worker for a booking (temporary hold)
 * @param {string} companyId - Company ID
 * @param {string} workerId - Worker ID
 * @param {string} startTime - ISO string of booking start time
 * @param {string} endTime - ISO string of booking end time
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Reservation response
 */
export const reserveWorkerForBooking = async (companyId, workerId, startTime, endTime, bookingId) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    console.log(`🔒 API: Reserving worker ${workerId} for booking ${bookingId}`);
    
    const success = await workerAvailabilitySystem.reserveWorker(workerId, start, end, bookingId);
    
    if (success) {
      // Update company availability after reservation
      await workerAvailabilitySystem.updateCompanyAvailabilityStatus(companyId);
    }
    
    const response = {
      success,
      workerId,
      bookingId,
      reserved: success,
      reservedAt: success ? new Date().toISOString() : null,
      expiresAt: success ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null, // 10 minutes
      message: success ? 'Worker reserved successfully' : 'Worker is no longer available'
    };
    
    console.log(`${success ? '✅' : '❌'} API: Worker reservation ${success ? 'successful' : 'failed'}`);
    return response;
    
  } catch (error) {
    console.error('API Error reserving worker:', error);
    return {
      success: false,
      error: error.message,
      reserved: false
    };
  }
};

/**
 * Get real-time availability status for companies (for app dashboard)
 * @param {Array} companyIds - Array of company IDs to monitor
 * @returns {Promise<Object>} - Real-time availability status
 */
export const getRealtimeAvailabilityStatus = async (companyIds) => {
  try {
    console.log(`🔄 API: Getting real-time status for ${companyIds.length} companies`);
    
    const statusMap = {};
    
    for (const companyId of companyIds) {
      const cached = workerAvailabilitySystem.getCachedAvailability(companyId);
      
      if (cached && (Date.now() - cached.lastUpdated.getTime()) < 5 * 60 * 1000) {
        // Use cached data if less than 5 minutes old
        statusMap[companyId] = {
          isAvailable: cached.isAvailable,
          availableWorkers: cached.availableWorkers,
          lastUpdated: cached.lastUpdated.toISOString(),
          source: 'cache'
        };
      } else {
        // Update availability status
        const isAvailable = await workerAvailabilitySystem.updateCompanyAvailabilityStatus(companyId);
        const updated = workerAvailabilitySystem.getCachedAvailability(companyId);
        
        statusMap[companyId] = {
          isAvailable,
          availableWorkers: updated?.availableWorkers || 0,
          lastUpdated: new Date().toISOString(),
          source: 'live'
        };
      }
    }
    
    const response = {
      success: true,
      checkedAt: new Date().toISOString(),
      companies: statusMap,
      summary: {
        total: companyIds.length,
        available: Object.values(statusMap).filter(s => s.isAvailable).length,
        busy: Object.values(statusMap).filter(s => !s.isAvailable).length
      }
    };
    
    console.log(`✅ API: Real-time status retrieved`);
    return response;
    
  } catch (error) {
    console.error('API Error getting real-time status:', error);
    return {
      success: false,
      error: error.message,
      companies: {}
    };
  }
};

// Export all API functions
export default {
  checkCompanyAvailability,
  checkBulkCompanyAvailability,
  getAvailableCompanies,
  reserveWorkerForBooking,
  getRealtimeAvailabilityStatus
};
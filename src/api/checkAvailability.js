import { 
  checkWorkerAvailability, 
  getCompanyAvailabilityForApp, 
  batchCheckCompanyAvailability 
} from '../utils/workerAvailabilityChecker.js';

/**
 * API Endpoints for App to check worker availability
 */

/**
 * Check availability for specific company and service
 * POST /api/check-availability
 * Body: { companyId, serviceId, date, time }
 */
export const checkCompanyAvailability = async (req, res) => {
  try {
    const { companyId, serviceId, date, time } = req.body;

    if (!companyId || !serviceId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: companyId, serviceId, date, time'
      });
    }

    console.log('📱 App requesting availability check:', {
      companyId,
      serviceId,
      date,
      time
    });

    const availability = await getCompanyAvailabilityForApp(
      companyId, 
      serviceId, 
      date, 
      time
    );

    return res.status(200).json({
      success: true,
      data: availability,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get all available companies for a service
 * POST /api/get-available-companies
 * Body: { serviceId, date, time }
 */
export const getAvailableCompanies = async (req, res) => {
  try {
    const { serviceId, date, time } = req.body;

    if (!serviceId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: serviceId, date, time'
      });
    }

    console.log('📱 App requesting available companies for:', {
      serviceId,
      date,
      time
    });

    const result = await batchCheckCompanyAvailability(serviceId, date, time);

    return res.status(200).json({
      success: true,
      data: {
        totalCompanies: result.totalCompanies,
        availableCompanies: result.availableCompanies,
        companies: result.availableOnly, // Only return available companies
        message: result.availableCompanies > 0 
          ? `${result.availableCompanies} companies available`
          : 'No companies available for this time slot'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Real-time availability webhook for app
 * This can be called when user selects date/time in app
 */
export const realtimeAvailabilityCheck = async (req, res) => {
  try {
    const { serviceId, date, time, location } = req.body;

    console.log('🔄 Real-time availability check requested:', {
      serviceId,
      date,
      time,
      location
    });

    // Get all companies in the area providing this service
    const result = await batchCheckCompanyAvailability(serviceId, date, time);

    // Filter companies based on location if provided
    let availableCompanies = result.availableOnly;
    
    if (location) {
      // Add location-based filtering logic here if needed
      console.log('📍 Location-based filtering for:', location);
    }

    // Return response for app
    return res.status(200).json({
      success: true,
      available: availableCompanies.length > 0,
      data: {
        canBook: availableCompanies.length > 0,
        availableProviders: availableCompanies.length,
        totalProviders: result.totalCompanies,
        companies: availableCompanies,
        message: availableCompanies.length > 0
          ? `${availableCompanies.length} service providers available`
          : 'No service providers available for selected time slot',
        suggestions: availableCompanies.length === 0 ? [
          'Try selecting a different time slot',
          'Check availability for tomorrow',
          'Contact service providers directly'
        ] : []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Real-time check error:', error);
    return res.status(500).json({
      success: false,
      available: false,
      message: 'Unable to check availability',
      error: error.message
    });
  }
};

/**
 * Usage Examples for App Integration:
 * 
 * 1. Check specific company availability:
 * POST /api/check-availability
 * {
 *   "companyId": "company123",
 *   "serviceId": "service456", 
 *   "date": "2026-02-04",
 *   "time": "10:00 AM - 12:00 PM"
 * }
 * 
 * 2. Get all available companies:
 * POST /api/get-available-companies
 * {
 *   "serviceId": "service456",
 *   "date": "2026-02-04", 
 *   "time": "10:00 AM - 12:00 PM"
 * }
 * 
 * 3. Real-time check when user selects time:
 * POST /api/realtime-availability
 * {
 *   "serviceId": "service456",
 *   "date": "2026-02-04",
 *   "time": "10:00 AM - 12:00 PM",
 *   "location": "Delhi"
 * }
 */
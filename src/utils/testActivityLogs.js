// Test Activity Logs Generator
// Use this to create sample activity logs in Firestore for testing

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../context/Firebase';
import { detectDevice } from './deviceDetection';

/**
 * Generate test activity logs in Firestore
 * This will create real activity logs with proper company names, devices, etc.
 */
export const generateTestActivityLogs = async (companies) => {
  if (!companies || companies.length === 0) {
    console.error('No companies provided. Please load companies first.');
    return;
  }

  const actions = [
    { action: 'login', description: 'Logged into dashboard' },
    { action: 'logout', description: 'Logged out from dashboard' },
    { action: 'service_created', description: 'Created new service' },
    { action: 'service_updated', description: 'Updated service details' },
    { action: 'service_deleted', description: 'Deleted a service' },
    { action: 'profile_updated', description: 'Updated company profile' },
    { action: 'booking_received', description: 'Received new booking' },
    { action: 'payment_received', description: 'Payment received from customer' },
    { action: 'worker_assigned', description: 'Assigned worker to booking' },
    { action: 'status_changed', description: 'Changed booking status' }
  ];

  const devices = [
    { device: 'Mobile', browser: 'Chrome', os: 'Android' },
    { device: 'Desktop', browser: 'Chrome', os: 'Windows' },
    { device: 'Mobile', browser: 'Safari', os: 'iOS' },
    { device: 'Desktop', browser: 'Firefox', os: 'macOS' },
    { device: 'Tablet', browser: 'Safari', os: 'iOS' },
    { device: 'Desktop', browser: 'Edge', os: 'Windows' }
  ];

  const statuses = ['success', 'success', 'success', 'failed']; // 75% success rate

  try {
    console.log('🚀 Generating test activity logs...');
    
    // Generate 20 test logs
    for (let i = 0; i < 20; i++) {
      const randomCompany = companies[Math.floor(Math.random() * companies.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      const randomDevice = devices[Math.floor(Math.random() * devices.length)];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Create timestamp going back in time
      const hoursAgo = i * 2; // 2 hours apart
      const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const activityData = {
        companyId: randomCompany.id,
        companyName: randomCompany.companyName || randomCompany.name || randomCompany.businessName || 'Test Company',
        userId: randomCompany.id,
        action: randomAction.action,
        details: {
          action: randomAction.description,
          timestamp: timestamp.toISOString()
        },
        deviceInfo: {
          device: randomDevice.device,
          browser: randomDevice.browser,
          os: randomDevice.os,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: navigator.userAgent
        },
        timestamp: serverTimestamp(),
        type: 'company',
        success: randomStatus === 'success'
      };

      await addDoc(collection(db, 'service_activity_logs'), activityData);
      console.log(`✅ Created activity log ${i + 1}/20:`, randomAction.description);
    }

    console.log('✅ Successfully generated 20 test activity logs!');
    return true;
  } catch (error) {
    console.error('❌ Failed to generate test activity logs:', error);
    return false;
  }
};

/**
 * Clear all activity logs (use with caution!)
 */
export const clearActivityLogs = async () => {
  console.warn('⚠️ This will delete all activity logs. Use with caution!');
  // Implementation would require batch delete
  // Not implemented for safety
};

/**
 * Log a single activity (use this in your app)
 */
export const logCompanyActivity = async (companyId, companyName, action, description, success = true) => {
  try {
    const deviceInfo = detectDevice(navigator.userAgent);
    
    const activityData = {
      companyId,
      companyName,
      userId: companyId,
      action,
      details: {
        action: description,
        timestamp: new Date().toISOString()
      },
      deviceInfo: {
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ip: '192.168.1.1', // Get from server
        userAgent: navigator.userAgent
      },
      timestamp: serverTimestamp(),
      type: 'company',
      success
    };

    const docRef = await addDoc(collection(db, 'service_activity_logs'), activityData);
    console.log('✅ Activity logged:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    throw error;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.generateTestActivityLogs = generateTestActivityLogs;
  window.logCompanyActivity = logCompanyActivity;
}

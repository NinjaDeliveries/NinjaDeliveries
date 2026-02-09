// Test Payment Activities Generator
// Use this to create sample payment activities in Firestore for testing weekly revenue

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../context/Firebase';
import { detectDevice } from './deviceDetection';

/**
 * Generate test payment activities for a company
 * This will create payment activities with amounts for testing weekly revenue
 */
export const generateTestPaymentActivities = async (companyId, companyName) => {
  if (!companyId || !companyName) {
    console.error('Company ID and name are required');
    return;
  }

  try {
    console.log('🚀 Generating test payment activities...');
    
    const deviceInfo = detectDevice(navigator.userAgent);
    
    // Generate 10 payment activities over the last 7 days
    const payments = [
      { amount: 5000, daysAgo: 0, description: 'Service payment received' },
      { amount: 3500, daysAgo: 1, description: 'Booking payment received' },
      { amount: 7500, daysAgo: 2, description: 'Service payment received' },
      { amount: 2000, daysAgo: 3, description: 'Advance payment received' },
      { amount: 4500, daysAgo: 4, description: 'Service payment received' },
      { amount: 6000, daysAgo: 5, description: 'Booking payment received' },
      { amount: 3000, daysAgo: 6, description: 'Service payment received' },
      { amount: 8000, daysAgo: 1, description: 'Premium service payment' },
      { amount: 2500, daysAgo: 2, description: 'Consultation payment' },
      { amount: 5500, daysAgo: 3, description: 'Service payment received' }
    ];

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      const timestamp = new Date(Date.now() - payment.daysAgo * 24 * 60 * 60 * 1000);

      const activityData = {
        companyId,
        companyName,
        userId: companyId,
        action: 'payment_received',
        details: {
          action: payment.description,
          timestamp: timestamp.toISOString(),
          amount: payment.amount
        },
        metadata: {
          amount: payment.amount,
          paymentMethod: 'UPI',
          transactionId: `TXN${Date.now()}${i}`
        },
        deviceInfo: {
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: navigator.userAgent
        },
        timestamp: serverTimestamp(),
        type: 'company',
        success: true
      };

      await addDoc(collection(db, 'service_activity_logs'), activityData);
      console.log(`✅ Created payment activity ${i + 1}/10: ₹${payment.amount}`);
    }

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    console.log(`✅ Successfully generated 10 payment activities!`);
    console.log(`💰 Total amount: ₹${totalAmount.toLocaleString('en-IN')}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to generate payment activities:', error);
    return false;
  }
};

/**
 * Generate mixed activities (payments + other actions)
 */
export const generateMixedActivities = async (companyId, companyName) => {
  if (!companyId || !companyName) {
    console.error('Company ID and name are required');
    return;
  }

  try {
    console.log('🚀 Generating mixed activities...');
    
    const deviceInfo = detectDevice(navigator.userAgent);
    
    const activities = [
      { action: 'login', description: 'Logged into dashboard', amount: 0, daysAgo: 0 },
      { action: 'payment_received', description: 'Service payment received', amount: 5000, daysAgo: 0 },
      { action: 'service_created', description: 'Created new service', amount: 0, daysAgo: 1 },
      { action: 'payment_received', description: 'Booking payment received', amount: 3500, daysAgo: 1 },
      { action: 'booking_received', description: 'New booking received', amount: 0, daysAgo: 2 },
      { action: 'payment_received', description: 'Service payment received', amount: 7500, daysAgo: 2 },
      { action: 'profile_updated', description: 'Updated company profile', amount: 0, daysAgo: 3 },
      { action: 'payment_received', description: 'Advance payment received', amount: 2000, daysAgo: 3 },
      { action: 'worker_assigned', description: 'Assigned worker to booking', amount: 0, daysAgo: 4 },
      { action: 'payment_received', description: 'Service payment received', amount: 4500, daysAgo: 4 },
      { action: 'logout', description: 'Logged out from dashboard', amount: 0, daysAgo: 5 },
      { action: 'payment_received', description: 'Booking payment received', amount: 6000, daysAgo: 5 },
      { action: 'login', description: 'Logged into dashboard', amount: 0, daysAgo: 6 },
      { action: 'payment_received', description: 'Service payment received', amount: 3000, daysAgo: 6 }
    ];

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const timestamp = new Date(Date.now() - activity.daysAgo * 24 * 60 * 60 * 1000);

      const activityData = {
        companyId,
        companyName,
        userId: companyId,
        action: activity.action,
        details: {
          action: activity.description,
          timestamp: timestamp.toISOString(),
          ...(activity.amount > 0 && { amount: activity.amount })
        },
        ...(activity.amount > 0 && {
          metadata: {
            amount: activity.amount,
            paymentMethod: 'UPI',
            transactionId: `TXN${Date.now()}${i}`
          }
        }),
        deviceInfo: {
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: navigator.userAgent
        },
        timestamp: serverTimestamp(),
        type: 'company',
        success: true
      };

      await addDoc(collection(db, 'service_activity_logs'), activityData);
      console.log(`✅ Created activity ${i + 1}/${activities.length}: ${activity.description}`);
    }

    const totalPayments = activities.filter(a => a.amount > 0).length;
    const totalAmount = activities.reduce((sum, a) => sum + a.amount, 0);
    console.log(`✅ Successfully generated ${activities.length} activities!`);
    console.log(`💰 ${totalPayments} payments totaling ₹${totalAmount.toLocaleString('en-IN')}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to generate mixed activities:', error);
    return false;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.generateTestPaymentActivities = generateTestPaymentActivities;
  window.generateMixedActivities = generateMixedActivities;
}

// Firebase Real-time Service
// ========================================

import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit, 
  where, 
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { getDatabase, ref, onValue, off, set, remove } from 'firebase/database';
import { db } from '../context/Firebase';

/**
 * Service for managing real-time Firebase operations
 */
class FirebaseRealtimeService {
  constructor() {
    this.listeners = new Map();
    this.realtimeListeners = new Map();
  }

  /**
   * Setup real-time listener for companies
   */
  listenToCompanies(callback, filters = {}) {
    const listenerKey = 'companies';
    
    // Cleanup existing listener
    this.cleanupListener(listenerKey);
    
    let q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.city && filters.city !== 'all') {
      q = query(q, where('city', '==', filters.city));
    }
    if (filters.category && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const companies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          lastLogin: doc.data().lastLogin?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }));
        
        callback({ success: true, data: companies });
      },
      (error) => {
        console.error('Companies listener error:', error);
        callback({ success: false, error: error.message });
      }
    );

    this.listeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Setup real-time listener for services
   */
  listenToServices(callback, filters = {}) {
    const listenerKey = 'services';
    
    this.cleanupListener(listenerKey);
    
    let q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    
    if (filters.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    if (filters.category && filters.category !== 'all') {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const services = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }));
        
        callback({ success: true, data: services });
      },
      (error) => {
        console.error('Services listener error:', error);
        callback({ success: false, error: error.message });
      }
    );

    this.listeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Setup real-time listener for categories
   */
  listenToCategories(callback) {
    const listenerKey = 'categories';
    
    this.cleanupListener(listenerKey);
    
    const q = query(
      collection(db, 'categories'),
      where('status', '==', 'active'),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const categories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }));
        
        callback({ success: true, data: categories });
      },
      (error) => {
        console.error('Categories listener error:', error);
        callback({ success: false, error: error.message });
      }
    );

    this.listeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Setup real-time listener for bookings
   */
  listenToBookings(callback, filters = {}) {
    const listenerKey = 'bookings';
    
    this.cleanupListener(listenerKey);
    
    let q = query(collection(db, 'bookings'), orderBy('bookingDate', 'desc'));
    
    if (filters.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    if (filters.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.dateFrom) {
      q = query(q, where('bookingDate', '>=', new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      q = query(q, where('bookingDate', '<=', new Date(filters.dateTo)));
    }
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          bookingDate: doc.data().bookingDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        }));
        
        callback({ success: true, data: bookings });
      },
      (error) => {
        console.error('Bookings listener error:', error);
        callback({ success: false, error: error.message });
      }
    );

    this.listeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Setup real-time listener for activity logs
   */
  listenToActivityLogs(callback, filters = {}) {
    const listenerKey = 'activityLogs';
    
    this.cleanupListener(listenerKey);
    
    let q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    if (filters.companyId) {
      q = query(q, where('companyId', '==', filters.companyId));
    }
    if (filters.type && filters.type !== 'all') {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.dateFrom) {
      q = query(q, where('timestamp', '>=', new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      q = query(q, where('timestamp', '<=', new Date(filters.dateTo)));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        
        callback({ success: true, data: logs });
      },
      (error) => {
        console.error('Activity logs listener error:', error);
        callback({ success: false, error: error.message });
      }
    );

    this.listeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Setup real-time listener for online status (using Realtime Database)
   */
  listenToOnlineStatus(callback) {
    const listenerKey = 'onlineStatus';
    
    this.cleanupRealtimeListener(listenerKey);
    
    const database = getDatabase();
    const onlineStatusRef = ref(database, 'onlineStatus');
    
    const unsubscribe = onValue(
      onlineStatusRef,
      (snapshot) => {
        const onlineData = snapshot.val() || {};
        const onlineSet = new Set();
        const onlineDetails = {};
        
        Object.keys(onlineData).forEach(companyId => {
          if (onlineData[companyId].isOnline) {
            onlineSet.add(companyId);
            onlineDetails[companyId] = onlineData[companyId];
          }
        });
        
        callback({ 
          success: true, 
          data: {
            onlineCompanies: onlineSet,
            onlineDetails,
            totalOnline: onlineSet.size
          }
        });
      },
      (error) => {
        console.error('Online status listener error:', error);
        callback({ success: false, error: error.message });
      }
    );

    this.realtimeListeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  /**
   * Update company online status
   */
  async updateOnlineStatus(companyId, isOnline, deviceInfo = {}) {
    try {
      const database = getDatabase();
      const onlineStatusRef = ref(database, `onlineStatus/${companyId}`);
      
      if (isOnline) {
        await set(onlineStatusRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
          deviceInfo: {
            ...deviceInfo,
            timestamp: serverTimestamp()
          }
        });
      } else {
        await remove(onlineStatusRef);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating online status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log activity
   */
  async logActivity(activityData) {
    try {
      const docRef = await addDoc(collection(db, 'activityLogs'), {
        ...activityData,
        timestamp: serverTimestamp()
      });
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update company status
   */
  async updateCompanyStatus(companyId, status, reason = '') {
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        status,
        statusReason: reason,
        updatedAt: serverTimestamp()
      });
      
      // Log the activity
      await this.logActivity({
        companyId,
        action: `status_changed_to_${status}`,
        details: { reason, previousStatus: status },
        type: 'update'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating company status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(companyId) {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);
      
      if (!companyDoc.exists()) {
        return { success: false, error: 'Company not found' };
      }
      
      const companyData = companyDoc.data();
      
      // Get bookings stats
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('companyId', '==', companyId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(doc => doc.data());
      
      // Calculate stats
      const totalBookings = bookings.length;
      const completedBookings = bookings.filter(b => b.status === 'completed').length;
      const pendingBookings = bookings.filter(b => b.status === 'pending').length;
      const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
      const totalRevenue = bookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.amount || 0), 0);
      
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
      
      return {
        success: true,
        data: {
          ...companyData,
          stats: {
            totalBookings,
            completedBookings,
            pendingBookings,
            cancelledBookings,
            totalRevenue,
            completionRate: Math.round(completionRate)
          }
        }
      };
    } catch (error) {
      console.error('Error getting company stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get dashboard analytics
   */
  async getDashboardAnalytics(timeRange = '7d') {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '1d':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      // Get companies
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companies = companiesSnapshot.docs.map(doc => doc.data());
      
      // Get bookings in date range
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('bookingDate', '>=', startDate),
        where('bookingDate', '<=', now)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(doc => doc.data());
      
      // Get activity logs in date range
      const activityQuery = query(
        collection(db, 'activityLogs'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', now)
      );
      const activitySnapshot = await getDocs(activityQuery);
      const activities = activitySnapshot.docs.map(doc => doc.data());
      
      // Calculate analytics
      const analytics = {
        totalCompanies: companies.length,
        activeCompanies: companies.filter(c => c.status === 'active').length,
        newRegistrations: companies.filter(c => 
          c.createdAt && c.createdAt.toDate() >= startDate
        ).length,
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        totalRevenue: bookings
          .filter(b => b.paymentStatus === 'paid')
          .reduce((sum, b) => sum + (b.amount || 0), 0),
        totalActivities: activities.length,
        topCompanies: this.getTopCompanies(companies, bookings),
        bookingsByDay: this.getBookingsByDay(bookings),
        revenueByDay: this.getRevenueByDay(bookings)
      };
      
      return { success: true, data: analytics };
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get top companies by revenue
   */
  getTopCompanies(companies, bookings, limit = 10) {
    const companyStats = {};
    
    bookings.forEach(booking => {
      if (!companyStats[booking.companyId]) {
        companyStats[booking.companyId] = {
          bookings: 0,
          revenue: 0
        };
      }
      companyStats[booking.companyId].bookings++;
      if (booking.paymentStatus === 'paid') {
        companyStats[booking.companyId].revenue += booking.amount || 0;
      }
    });
    
    return Object.entries(companyStats)
      .map(([companyId, stats]) => {
        const company = companies.find(c => c.id === companyId);
        return {
          companyId,
          companyName: company?.companyName || 'Unknown',
          ...stats
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Get bookings by day
   */
  getBookingsByDay(bookings) {
    const bookingsByDay = {};
    
    bookings.forEach(booking => {
      const day = booking.bookingDate.toDate().toDateString();
      bookingsByDay[day] = (bookingsByDay[day] || 0) + 1;
    });
    
    return bookingsByDay;
  }

  /**
   * Get revenue by day
   */
  getRevenueByDay(bookings) {
    const revenueByDay = {};
    
    bookings
      .filter(b => b.paymentStatus === 'paid')
      .forEach(booking => {
        const day = booking.bookingDate.toDate().toDateString();
        revenueByDay[day] = (revenueByDay[day] || 0) + (booking.amount || 0);
      });
    
    return revenueByDay;
  }

  /**
   * Cleanup a specific listener
   */
  cleanupListener(key) {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  /**
   * Cleanup a specific realtime listener
   */
  cleanupRealtimeListener(key) {
    const unsubscribe = this.realtimeListeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.realtimeListeners.delete(key);
    }
  }

  /**
   * Cleanup all listeners
   */
  cleanupAllListeners() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.realtimeListeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.realtimeListeners.clear();
  }
}

// Create singleton instance
const firebaseRealtimeService = new FirebaseRealtimeService();

export default firebaseRealtimeService;

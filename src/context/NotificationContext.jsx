import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from './Firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  orderBy,
  limit 
} from 'firebase/firestore';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [storedNotifications, setStoredNotifications] = useState(() => {
    // Load stored notifications from localStorage on initialization
    try {
      const saved = localStorage.getItem('ninja-stored-notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading stored notifications:', error);
      return [];
    }
  });
  const [notificationSettings, setNotificationSettings] = useState({
    newBookingAlerts: true,
    paymentNotifications: true,
    reviewAlerts: true,
    marketingEmails: false,
  });

  console.log('🔔 NotificationProvider loaded, notifications count:', notifications.length, 'stored count:', storedNotifications.length);

  // Helper function to safely format timestamps
  const formatTimestamp = (timestamp) => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      return date.toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Just now';
    }
  };

  // Save stored notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('ninja-stored-notifications', JSON.stringify(storedNotifications));
      console.log('💾 Saved stored notifications to localStorage:', storedNotifications.length);
    } catch (error) {
      console.error('Error saving stored notifications:', error);
    }
  }, [storedNotifications]);

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const ref = doc(db, "service_company", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          const settings = data.notifications || {};
          setNotificationSettings({
            newBookingAlerts: Boolean(settings.newBookingAlerts ?? true),
            paymentNotifications: Boolean(settings.paymentNotifications ?? true),
            reviewAlerts: Boolean(settings.reviewAlerts ?? true),
            marketingEmails: Boolean(settings.marketingEmails ?? false),
          });
        }
      } catch (error) {
        console.error("Error loading notification settings:", error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadSettings();
      }
    });

    return () => unsubscribe();
  }, []);

  // Simple booking listener with proper new booking detection
  useEffect(() => {
    let unsubscribe = null;
    let isInitialized = false;
    let initialBookingIds = new Set();

    const setupBookingListener = async () => {
      const user = auth.currentUser;
      
      if (!user) {
        console.log('❌ No user authenticated');
        return;
      }

      console.log('✅ Setting up booking listener for user:', user.uid);

      const q = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📊 Firestore snapshot received:', {
          size: snapshot.size,
          empty: snapshot.empty,
          changes: snapshot.docChanges().length,
          isInitialized
        });

        // First load - just store existing booking IDs, don't show notifications
        if (!isInitialized) {
          snapshot.docs.forEach(doc => {
            initialBookingIds.add(doc.id);
          });
          console.log('🔄 Initialized with', initialBookingIds.size, 'existing bookings');
          isInitialized = true;
          return;
        }

        // Process only new bookings (not in initial set)
        snapshot.docChanges().forEach((change) => {
          console.log('📋 Document change detected:', {
            type: change.type,
            id: change.doc.id,
            newIndex: change.newIndex,
            oldIndex: change.oldIndex
          });

          if (change.type === 'added' && !initialBookingIds.has(change.doc.id)) {
            // This is a truly new booking
            const bookingData = change.doc.data();
            const bookingId = change.doc.id;

            // Add to our tracking set
            initialBookingIds.add(bookingId);

            console.log('🔔 NEW BOOKING DETECTED:', {
              id: bookingId,
              serviceName: bookingData.serviceName,
              workName: bookingData.workName,
              customerName: bookingData.customerName,
              createdAt: bookingData.createdAt?.toDate?.()?.toLocaleString()
            });

            // Create detailed notification message
            const serviceName = bookingData.workName || bookingData.serviceName || 'Service Request';
            const categoryName = bookingData.serviceName && bookingData.workName ? bookingData.serviceName : '';
            const customerName = bookingData.customerName || 'Customer';
            const bookingTime = bookingData.time ? ` at ${bookingData.time}` : '';
            const bookingDate = bookingData.date ? ` on ${bookingData.date}` : '';

            // Create notification message with service and category details
            let notificationMessage = `${serviceName}`;
            if (categoryName && categoryName !== serviceName) {
              notificationMessage = `${serviceName} (${categoryName})`;
            }
            notificationMessage += ` - ${customerName}`;
            if (bookingTime) {
              notificationMessage += bookingTime;
            }

            // Show notification
            const notification = {
              id: `booking-${bookingId}-${Date.now()}`,
              type: 'booking',
              title: '🔔 New Slot Booking Received!',
              message: notificationMessage,
              timestamp: new Date().toISOString(), // Use ISO string for better serialization
              data: {
                ...bookingData,
                bookingId: bookingId,
                serviceName: serviceName,
                categoryName: categoryName,
                fullDetails: `${serviceName}${categoryName ? ` (Category: ${categoryName})` : ''} for ${customerName}${bookingDate}${bookingTime}`
              }
            };

            console.log('📢 Adding detailed notification:', notification);
            setNotifications(prev => {
              const newNotifications = [notification, ...prev.slice(0, 4)];
              console.log('📋 Updated notifications list:', newNotifications.length);
              return newNotifications;
            });

            // Store notification permanently
            setStoredNotifications(prev => {
              const newStored = [notification, ...prev];
              console.log('💾 Stored notifications count:', newStored.length);
              return newStored;
            });

            // Play sound
            console.log('🔊 Playing notification sound...');
            playNotificationSound();

            // Show enhanced browser notification
            showBrowserNotification(bookingData);

            // Auto remove after 5 seconds (increased for more detailed message)
            setTimeout(() => {
              console.log('⏰ Auto-removing notification:', notification.id);
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 5000);
          } else if (change.type === 'added' && initialBookingIds.has(change.doc.id)) {
            console.log('⏭️ Skipping existing booking on refresh:', change.doc.id);
          }
        });
      }, (error) => {
        console.error("❌ Firestore listener error:", error);
        isInitialized = false;
        initialBookingIds.clear();
      });
    };

    // Set up listener when auth changes
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      console.log('🔐 Auth state changed:', !!user);
      
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
        isInitialized = false;
        initialBookingIds.clear();
      }
      
      if (user) {
        setTimeout(() => {
          setupBookingListener();
        }, 1000);
      }
    });

    // Setup immediately if user exists
    if (auth.currentUser) {
      setupBookingListener();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      authUnsubscribe();
    };
  }, []);

  // Play notification sound - Final optimized version
  const playNotificationSound = async () => {
    try {
      console.log('🔊 Playing notification sound...');
      
      // Create audio element
      const audio = new Audio('/servicebeep.mp3');
      audio.volume = 0.7;
      audio.preload = 'auto';
      
      // Try to play
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('✅ Sound played successfully');
        }).catch((error) => {
          console.log('🔇 Sound blocked by browser, showing browser notification');
          
          // Show browser notification as alternative
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 New Slot Booking Received!', {
              body: 'You have a new service booking with detailed information',
              icon: '/favicon.ico',
              tag: 'booking-notification',
              requireInteraction: false,
              silent: false
            });
          } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('🔔 New Slot Booking Received!', {
                  body: 'You have a new service booking with detailed information',
                  icon: '/favicon.ico',
                  tag: 'booking-notification'
                });
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('❌ Audio error:', error);
    }
  };

  // Show enhanced browser notification with booking details
  const showBrowserNotification = (bookingData) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const serviceName = bookingData.workName || bookingData.serviceName || 'Service Request';
      const categoryName = bookingData.serviceName && bookingData.workName ? bookingData.serviceName : '';
      const customerName = bookingData.customerName || 'Customer';
      const bookingTime = bookingData.time ? ` at ${bookingData.time}` : '';
      const bookingDate = bookingData.date ? ` on ${bookingData.date}` : '';

      let notificationBody = `${serviceName}`;
      if (categoryName && categoryName !== serviceName) {
        notificationBody += ` (${categoryName})`;
      }
      notificationBody += ` - ${customerName}`;
      if (bookingDate) {
        notificationBody += bookingDate;
      }
      if (bookingTime) {
        notificationBody += bookingTime;
      }

      new Notification('🔔 New Slot Booking Received!', {
        body: notificationBody,
        icon: '/favicon.ico',
        tag: 'booking-notification',
        requireInteraction: true,
        silent: false,
        data: bookingData
      });
    }
  };

  // Show notification manually
  const showNotification = (notification) => {
    console.log('📢 Manual notification:', notification);
    
    // Ensure timestamp is properly formatted
    const formattedNotification = {
      ...notification,
      timestamp: notification.timestamp instanceof Date ? notification.timestamp.toISOString() : notification.timestamp
    };
    
    setNotifications(prev => [formattedNotification, ...prev.slice(0, 4)]);
    
    // Store notification permanently
    setStoredNotifications(prev => {
      const newStored = [formattedNotification, ...prev];
      console.log('💾 Manual notification stored, total count:', newStored.length);
      return newStored;
    });
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== formattedNotification.id));
    }, 3000);
  };

  // Remove notification (only from active notifications, not stored)
  const removeNotification = (id) => {
    console.log('🗑️ Removing active notification:', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all active notifications (not stored)
  const clearAllNotifications = () => {
    console.log('🧹 Clearing all active notifications');
    setNotifications([]);
  };

  // Remove notification from stored list
  const removeStoredNotification = (id) => {
    console.log('🗑️ removeStoredNotification called with id:', id);
    console.log('📊 Before removal - stored notifications:', storedNotifications.length);
    
    try {
      setStoredNotifications(prev => {
        const filtered = prev.filter(n => n.id !== id);
        console.log('📊 After removal - stored notifications:', filtered.length);
        console.log('🔍 Removed notification with id:', id);
        return filtered;
      });
    } catch (error) {
      console.error('❌ Error removing notification:', error);
    }
  };

  // Clear all stored notifications
  const clearAllStoredNotifications = () => {
    console.log('🧹 clearAllStoredNotifications called');
    console.log('📊 Before clear - stored notifications:', storedNotifications.length);
    
    try {
      setStoredNotifications([]);
      console.log('📊 After clear - stored notifications: 0');
      
      // Also clear from localStorage immediately
      localStorage.removeItem('ninja-stored-notifications');
      console.log('💾 Cleared localStorage');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  };

  // Get stored notification count
  const getStoredNotificationCount = () => {
    const count = storedNotifications.length;
    console.log('📊 Stored notification count:', count);
    return count;
  };

  // Get booking notification count
  const getBookingNotificationCount = () => {
    const count = notifications.filter(n => n.type === 'booking').length;
    console.log('📊 Booking notification count:', count);
    return count;
  };

  // Show payment notification
  const showPaymentNotification = (paymentData) => {
    if (!notificationSettings.paymentNotifications) return;

    const notification = {
      id: `payment-${Date.now()}`,
      type: 'payment',
      title: 'Payment Received!',
      message: `₹${paymentData.amount} from ${paymentData.customerName}`,
      timestamp: new Date(),
      data: paymentData
    };

    showNotification(notification);
  };

  // Show review notification
  const showReviewNotification = (reviewData) => {
    if (!notificationSettings.reviewAlerts) return;

    const notification = {
      id: `review-${Date.now()}`,
      type: 'review',
      title: 'New Review!',
      message: `${reviewData.rating} stars - ${reviewData.customerName}`,
      timestamp: new Date(),
      data: reviewData
    };

    showNotification(notification);
  };

  // Request notification permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
  }, []);

  const value = {
    notifications,
    storedNotifications,
    notificationSettings,
    showNotification,
    removeNotification,
    clearAllNotifications,
    removeStoredNotification,
    clearAllStoredNotifications,
    getStoredNotificationCount,
    showPaymentNotification,
    showReviewNotification,
    getBookingNotificationCount,
    showBrowserNotification,
    formatTimestamp,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
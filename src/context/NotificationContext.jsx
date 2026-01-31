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
  const [notificationSettings, setNotificationSettings] = useState({
    newBookingAlerts: true,
    paymentNotifications: true,
    reviewAlerts: true,
    marketingEmails: false,
  });

  console.log('🔔 NotificationProvider loaded, notifications count:', notifications.length);

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
              customerName: bookingData.customerName,
              createdAt: bookingData.createdAt?.toDate?.()?.toLocaleString()
            });

            // Show notification
            const notification = {
              id: `booking-${bookingId}-${Date.now()}`,
              type: 'booking',
              title: '🔔 New Booking Received!',
              message: `${bookingData.serviceName} - ${bookingData.customerName}`,
              timestamp: new Date(),
              data: bookingData
            };

            console.log('📢 Adding notification:', notification);
            setNotifications(prev => {
              const newNotifications = [notification, ...prev.slice(0, 4)];
              console.log('📋 Updated notifications list:', newNotifications.length);
              return newNotifications;
            });

            // Play sound
            console.log('🔊 Playing notification sound...');
            playNotificationSound();

            // Auto remove after 3 seconds
            setTimeout(() => {
              console.log('⏰ Auto-removing notification:', notification.id);
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            }, 3000);
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
            new Notification('🔔 New Booking Received!', {
              body: 'You have a new service booking',
              icon: '/favicon.ico',
              tag: 'booking-notification',
              requireInteraction: false,
              silent: false
            });
          } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('🔔 New Booking Received!', {
                  body: 'You have a new service booking',
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

  // Show notification manually
  const showNotification = (notification) => {
    console.log('📢 Manual notification:', notification);
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  // Remove notification
  const removeNotification = (id) => {
    console.log('🗑️ Removing notification:', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    console.log('🧹 Clearing all notifications');
    setNotifications([]);
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

    showNotification({
      id: `payment-${Date.now()}`,
      type: 'payment',
      title: 'Payment Received!',
      message: `₹${paymentData.amount} from ${paymentData.customerName}`,
      timestamp: new Date(),
      data: paymentData
    });
  };

  // Show review notification
  const showReviewNotification = (reviewData) => {
    if (!notificationSettings.reviewAlerts) return;

    showNotification({
      id: `review-${Date.now()}`,
      type: 'review',
      title: 'New Review!',
      message: `${reviewData.rating} stars - ${reviewData.customerName}`,
      timestamp: new Date(),
      data: reviewData
    });
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
    notificationSettings,
    showNotification,
    removeNotification,
    clearAllNotifications,
    showPaymentNotification,
    showReviewNotification,
    getBookingNotificationCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
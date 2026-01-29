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
  const [lastBookingCount, setLastBookingCount] = useState(0);

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

  // Listen for new bookings
  useEffect(() => {
    let unsubscribe = null;

    const setupBookingListener = () => {
      const user = auth.currentUser;
      if (!user || !notificationSettings.newBookingAlerts) {
        console.log('❌ Booking listener not set up:', { 
          user: !!user, 
          userUid: user?.uid,
          alerts: notificationSettings.newBookingAlerts 
        });
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
        console.log('📊 Booking snapshot received:', {
          docs: snapshot.docs.length,
          lastBookingCount,
          currentTime: new Date().toLocaleTimeString()
        });
        
        const currentBookings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Log first few bookings for debugging
        if (currentBookings.length > 0) {
          console.log('📋 Latest bookings:', currentBookings.slice(0, 3).map(b => ({
            id: b.id,
            serviceName: b.serviceName,
            customerName: b.customerName,
            createdAt: b.createdAt?.toDate?.()?.toLocaleString() || 'No timestamp'
          })));
        }

        // Initialize lastBookingCount if it's the first load
        if (lastBookingCount === 0) {
          console.log('🔄 Initializing booking count:', currentBookings.length);
          setLastBookingCount(currentBookings.length);
          return;
        }

        // Check for new bookings
        if (currentBookings.length > lastBookingCount) {
          const newBookingsCount = currentBookings.length - lastBookingCount;
          console.log('🔔 NEW BOOKINGS DETECTED:', {
            newCount: newBookingsCount,
            previousCount: lastBookingCount,
            currentCount: currentBookings.length
          });
          
          // Get the newest bookings
          const newBookings = currentBookings.slice(0, newBookingsCount);
          
          // Show notification for each new booking
          newBookings.forEach((booking, index) => {
            console.log('📢 Showing notification for booking:', booking.id);
            setTimeout(() => {
              showNotification({
                id: `booking-${booking.id}`,
                type: 'booking',
                title: 'New Booking Received!',
                message: `${booking.serviceName} - ${booking.customerName}`,
                timestamp: new Date(),
                data: booking
              });
            }, index * 500); // Stagger notifications by 500ms
          });

          // Play notification sound once
          console.log('🔊 Playing notification sound...');
          playNotificationSound();
        } else if (currentBookings.length < lastBookingCount) {
          console.log('📉 Booking count decreased:', {
            previousCount: lastBookingCount,
            currentCount: currentBookings.length
          });
        } else {
          console.log('📊 No new bookings, count unchanged:', currentBookings.length);
        }

        setLastBookingCount(currentBookings.length);
      }, (error) => {
        console.error("❌ Error listening to bookings:", error);
      });
    };

    // Set up listener when auth state changes
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      console.log('🔐 Auth state changed:', { 
        user: !!user, 
        uid: user?.uid,
        alerts: notificationSettings.newBookingAlerts 
      });
      
      if (user && notificationSettings.newBookingAlerts) {
        setupBookingListener();
      } else if (unsubscribe) {
        console.log('🔇 Removing booking listener');
        unsubscribe();
        unsubscribe = null;
      }
    });

    // Also set up immediately if user is already authenticated
    if (auth.currentUser && notificationSettings.newBookingAlerts) {
      console.log('🚀 Setting up immediate booking listener');
      setupBookingListener();
    }

    return () => {
      if (unsubscribe) {
        console.log('🧹 Cleaning up booking listener');
        unsubscribe();
      }
      authUnsubscribe();
    };
  }, [notificationSettings.newBookingAlerts, lastBookingCount]);

  // Show notification
  const showNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 notifications

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Play notification sound with file check
  const playNotificationSound = async () => {
    try {
      console.log('🔊 Attempting to play notification sound...');
      
      // Check if sound file exists
      const response = await fetch('/servicebeep.mp3', { method: 'HEAD' });
      
      if (!response.ok) {
        console.log('❌ Notification sound file not found in public folder');
        return;
      }
      
      console.log('✅ Sound file found, creating audio...');
      
      // File exists, play it
      const audio = new Audio('/servicebeep.mp3');
      audio.volume = 0.7;
      
      // Add event listeners for debugging
      audio.addEventListener('loadstart', () => console.log('🎵 Audio loading started'));
      audio.addEventListener('canplay', () => console.log('🎵 Audio can play'));
      audio.addEventListener('play', () => console.log('🎵 Audio started playing'));
      audio.addEventListener('ended', () => console.log('🎵 Audio finished playing'));
      audio.addEventListener('error', (e) => console.log('❌ Audio error:', e));
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('✅ Notification sound played successfully');
        }).catch(error => {
          console.log('❌ Could not play notification sound:', error);
          
          // Try alternative approach for browsers that block autoplay
          if (error.name === 'NotAllowedError') {
            console.log('🔇 Browser blocked autoplay - user interaction required');
            // Store that we need to play sound when user interacts
            sessionStorage.setItem('pendingSound', 'true');
          }
        });
      }
    } catch (error) {
      console.log('❌ Notification sound error:', error);
    }
  };

  // Handle pending sound on user interaction
  const handleUserInteraction = () => {
    if (sessionStorage.getItem('pendingSound') === 'true') {
      console.log('🔊 Playing pending notification sound after user interaction');
      sessionStorage.removeItem('pendingSound');
      playNotificationSound();
    }
  };

  // Add click listener to handle pending sounds
  useEffect(() => {
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

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

  const value = {
    notifications,
    notificationSettings,
    showNotification,
    removeNotification,
    clearAllNotifications,
    showPaymentNotification,
    showReviewNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
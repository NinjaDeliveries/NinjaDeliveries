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
    newBookingAlerts: true, // Always enabled by default
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
        if (!user) {
          console.log('❌ No user for loading notification settings');
          return;
        }

        console.log('📋 Loading notification settings for user:', user.uid);

        const ref = doc(db, "service_company", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          const settings = data.notifications || {};
          
          const loadedSettings = {
            newBookingAlerts: Boolean(settings.newBookingAlerts ?? true), // Default to true
            paymentNotifications: Boolean(settings.paymentNotifications ?? true),
            reviewAlerts: Boolean(settings.reviewAlerts ?? true),
            marketingEmails: Boolean(settings.marketingEmails ?? false),
          };
          
          console.log('✅ Loaded notification settings:', loadedSettings);
          setNotificationSettings(loadedSettings);
        } else {
          console.log('📋 No settings document found, using defaults');
          // Use defaults (already set in state)
        }
      } catch (error) {
        console.error("❌ Error loading notification settings:", error);
        // Keep default settings on error
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('🔐 User authenticated, loading settings');
        loadSettings();
      } else {
        console.log('🔐 User not authenticated, using default settings');
        // Reset to defaults when no user
        setNotificationSettings({
          newBookingAlerts: true,
          paymentNotifications: true,
          reviewAlerts: true,
          marketingEmails: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for new bookings
  useEffect(() => {
    let unsubscribe = null;

    const setupBookingListener = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log('❌ No authenticated user for booking listener');
        return;
      }

      if (!notificationSettings.newBookingAlerts) {
        console.log('❌ Booking alerts disabled in settings');
        return;
      }

      console.log('✅ Setting up real-time booking listener for user:', user.uid);

      try {
        const q = query(
          collection(db, "service_bookings"),
          where("companyId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(50)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          console.log('📊 Real-time booking snapshot received:', {
            docs: snapshot.docs.length,
            lastBookingCount,
            timestamp: new Date().toLocaleTimeString(),
            hasChanges: !snapshot.metadata.hasPendingWrites
          });
          
          const currentBookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Log first few bookings for debugging
          if (currentBookings.length > 0) {
            console.log('📋 Latest bookings:', currentBookings.slice(0, 2).map(b => ({
              id: b.id,
              serviceName: b.serviceName,
              customerName: b.customerName,
              createdAt: b.createdAt?.toDate?.()?.toLocaleString() || 'No timestamp',
              status: b.status
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
            console.log('🔔 NEW BOOKINGS DETECTED!', {
              newCount: newBookingsCount,
              previousCount: lastBookingCount,
              currentCount: currentBookings.length,
              timestamp: new Date().toLocaleString()
            });
            
            // Get the newest bookings
            const newBookings = currentBookings.slice(0, newBookingsCount);
            
            // Show notification for each new booking immediately
            newBookings.forEach((booking, index) => {
              console.log('📢 Processing new booking notification:', {
                id: booking.id,
                service: booking.serviceName,
                customer: booking.customerName
              });

              // Show notification immediately (no delay for first one)
              const delay = index * 300; // Reduced delay for faster notifications
              setTimeout(() => {
                console.log('🔔 Showing notification for booking:', booking.id);
                showNotification({
                  id: `booking-${booking.id}-${Date.now()}`, // Unique ID to prevent duplicates
                  type: 'booking',
                  title: '🔔 New Booking Received!',
                  message: `${booking.serviceName} - ${booking.customerName}`,
                  timestamp: new Date(),
                  data: booking
                });
              }, delay);
            });

            // Play notification sound immediately
            console.log('🔊 Playing notification sound for new bookings...');
            playNotificationSound();
            
            // Update count
            setLastBookingCount(currentBookings.length);
            
          } else if (currentBookings.length < lastBookingCount) {
            console.log('📉 Booking count decreased (booking deleted/cancelled):', {
              previousCount: lastBookingCount,
              currentCount: currentBookings.length
            });
            setLastBookingCount(currentBookings.length);
          } else {
            console.log('📊 No new bookings, count unchanged:', currentBookings.length);
          }

        }, (error) => {
          console.error("❌ Error in booking listener:", error);
          // Try to reconnect after error
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect booking listener...');
            setupBookingListener();
          }, 5000);
        });

      } catch (error) {
        console.error("❌ Error setting up booking listener:", error);
      }
    };

    // Set up listener immediately if user is authenticated
    if (auth.currentUser && notificationSettings.newBookingAlerts) {
      console.log('🚀 Setting up immediate booking listener');
      setupBookingListener();
    }

    // Also listen for auth state changes
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      console.log('🔐 Auth state changed:', { 
        user: !!user, 
        uid: user?.uid,
        alerts: notificationSettings.newBookingAlerts 
      });
      
      if (user && notificationSettings.newBookingAlerts) {
        setupBookingListener();
      } else if (unsubscribe) {
        console.log('🔇 Removing booking listener (no user or alerts disabled)');
        unsubscribe();
        unsubscribe = null;
      }
    });

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

  // Play notification sound with improved reliability
  const playNotificationSound = async () => {
    try {
      console.log('🔊 Attempting to play notification sound immediately...');
      
      // Create audio element
      const audio = new Audio('/servicebeep.mp3');
      audio.volume = 0.8; // Slightly higher volume
      audio.preload = 'auto'; // Preload the audio
      
      // Add event listeners for debugging
      audio.addEventListener('loadstart', () => console.log('🎵 Audio loading started'));
      audio.addEventListener('canplay', () => console.log('🎵 Audio ready to play'));
      audio.addEventListener('play', () => console.log('🎵 Audio started playing'));
      audio.addEventListener('ended', () => console.log('🎵 Audio finished playing'));
      audio.addEventListener('error', (e) => console.log('❌ Audio error:', e.error));
      
      // Try to play immediately
      try {
        await audio.play();
        console.log('✅ Notification sound played successfully');
      } catch (playError) {
        console.log('❌ Could not play notification sound:', playError.message);
        
        // Handle different types of errors
        if (playError.name === 'NotAllowedError') {
          console.log('🔇 Browser blocked autoplay - storing for later play');
          sessionStorage.setItem('pendingSound', 'true');
          
          // Try to play on next user interaction
          const playOnInteraction = () => {
            audio.play().then(() => {
              console.log('✅ Sound played after user interaction');
              sessionStorage.removeItem('pendingSound');
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('keydown', playOnInteraction);
            }).catch(e => console.log('❌ Still failed after interaction:', e));
          };
          
          document.addEventListener('click', playOnInteraction, { once: true });
          document.addEventListener('keydown', playOnInteraction, { once: true });
          
        } else if (playError.name === 'AbortError') {
          console.log('🔄 Audio play was aborted, retrying...');
          setTimeout(() => playNotificationSound(), 1000);
        }
      }
      
    } catch (error) {
      console.log('❌ Notification sound setup error:', error);
      
      // Fallback: try with a simple approach
      try {
        const fallbackAudio = new Audio('/servicebeep.mp3');
        fallbackAudio.volume = 0.8;
        fallbackAudio.play();
        console.log('✅ Fallback sound attempt made');
      } catch (fallbackError) {
        console.log('❌ Fallback sound also failed:', fallbackError);
      }
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

  // Force refresh booking listener (for testing)
  const refreshBookingListener = () => {
    console.log('🔄 Force refreshing booking listener...');
    setLastBookingCount(0); // Reset count to trigger re-initialization
  };

  const value = {
    notifications,
    notificationSettings,
    showNotification,
    removeNotification,
    clearAllNotifications,
    showPaymentNotification,
    showReviewNotification,
    refreshBookingListener, // Add this for testing
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
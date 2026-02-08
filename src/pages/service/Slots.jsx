import { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import AssignWorkerModal from "./AssignWorkerModal";
export default function Slots() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Ensure we get today's date in local timezone
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  
  // Company availability states
  const [isOnline, setIsOnline] = useState(true);
  const [offlineWindows, setOfflineWindows] = useState([]);
  const [updating, setUpdating] = useState(false);
  
  // Form states for offline windows
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  
  // Booking details modal states
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  
  // Assign worker modal states
  const [showAssignWorker, setShowAssignWorker] = useState(false);
  const [bookingToAssign, setBookingToAssign] = useState(null);
  const [categories, setCategories] = useState([]);

  // Fetch bookings from service_bookings collection with real-time listener
  const setupBookingsListener = () => {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user found for setting up bookings listener");
      return null;
    }

    console.log("Setting up real-time bookings listener for slots:", user.uid);

    const q = query(
      collection(db, "service_bookings"),
      where("companyId", "==", user.uid)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("📡 Real-time update received - slots bookings changed");
      console.log("📊 Snapshot info:", {
        size: snapshot.size,
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites
      });
      
      // Only update if this is not from cache (i.e., real server update)
      if (!snapshot.metadata.fromCache) {
        const bookingsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("📊 Real-time slots update - bookings from server:", bookingsList.length);
        
        // Sort bookings by date (newest first) and then by time (earliest first)
        bookingsList.sort((a, b) => {
          // First sort by date (newest first)
          const dateComparison = (b.date || '').localeCompare(a.date || '');
          if (dateComparison !== 0) {
            return dateComparison;
          }
          // If dates are same, sort by time (earliest first)
          const timeA = a.time || '00:00';
          const timeB = b.time || '00:00';
          return timeA.localeCompare(timeB);
        });

        setBookings(bookingsList);
      } else {
        console.log("📊 Ignoring cached data in real-time listener");
      }
    }, (error) => {
      console.error("❌ Real-time slots bookings listener error:", error);
    });

    return unsubscribe;
  };

  // Legacy fetch function for fallback
  const fetchBookings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user found for fetching bookings");
        return;
      }

      console.log("Fetching bookings for company:", user.uid);

      const q = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid)
      );

      const snapshot = await getDocs(q);
      const bookingsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log("Fetched bookings:", bookingsList);
      console.log("Total bookings found:", bookingsList.length);
      
      // Sort bookings by date (newest first) and then by time (earliest first)
      bookingsList.sort((a, b) => {
        // First sort by date (newest first)
        const dateComparison = (b.date || '').localeCompare(a.date || '');
        if (dateComparison !== 0) {
          return dateComparison;
        }
        // If dates are same, sort by time (earliest first)
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });

      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      alert("Error loading bookings. Please refresh the page.");
    }
  };

  // Fetch categories for worker assignment
  const fetchCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid)
      );

      const snapshot = await getDocs(q);
      const categoriesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCategories(categoriesList);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Load availability data from service_company collection (fix isActive field)
  const loadAvailability = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log("Loading company availability for user:", user.uid);

      // Get company status from service_company collection (isActive field for service availability)
      const companyRef = doc(db, "service_company", user.uid);
      const companySnap = await getDoc(companyRef);

      if (companySnap.exists()) {
        const companyData = companySnap.data();
        console.log("Company data:", companyData);
        // Use isActive field for service availability (true = online, false = offline)
        setIsOnline(companyData.isActive ?? true);
        
        // Ensure accountEnabled exists for login access (separate from service availability)
        if (companyData.accountEnabled === undefined) {
          await updateDoc(companyRef, {
            accountEnabled: true, // Default to enabled for login
            updatedAt: new Date(),
          });
        }
      } else {
        console.log("No company document found");
        setIsOnline(true);
      }

      // Load offline windows from service_availability collection
      const availRef = doc(db, "service_availability", user.uid);
      const availSnap = await getDoc(availRef);

      if (availSnap.exists()) {
        const availData = availSnap.data();
        console.log("Availability data:", availData);
        setOfflineWindows(availData.offlineWindows || []);
      } else {
        console.log("No availability document found, creating default");
        await setDoc(availRef, {
          companyId: user.uid,
          offlineWindows: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        setOfflineWindows([]);
      }
    } catch (error) {
      console.error("Error loading availability:", error);
    }
  };

  useEffect(() => {
    let bookingsUnsubscribe = null;

    const initializeData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          console.log("🔐 User authenticated:", user.uid);
          
          // First, try to fetch existing data immediately
          console.log("📥 Fetching existing bookings data...");
          await fetchBookings();
          
          // Then set up real-time listener for future updates
          console.log("📡 Setting up real-time listener...");
          bookingsUnsubscribe = setupBookingsListener();
          
          // Load other data
          await Promise.all([loadAvailability(), fetchCategories()]);
        } else {
          console.log("❌ No user authenticated");
        }
      } catch (error) {
        console.error("❌ Error initializing data:", error);
        // Ensure we at least try to fetch data
        await fetchBookings();
      } finally {
        setLoading(false);
      }
    };

    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🔐 Auth state changed - user logged in:", user.uid);
        initializeData();
      } else {
        console.log("🔐 Auth state changed - user logged out");
        setLoading(false);
        setBookings([]);
      }
    });

    // Cleanup function
    return () => {
      authUnsubscribe();
      if (bookingsUnsubscribe) {
        console.log("🔌 Cleaning up real-time slots bookings listener");
        bookingsUnsubscribe();
      }
    };
  }, []);

  // Auto status management based on offline windows
  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const formatAMPM = (time) => {
    const [h, m] = time.split(":");
    const hour = Number(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${suffix}`;
  };

  useEffect(() => {
    if (!offlineWindows.length) return;

    const checkStatus = async () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const isInOfflineWindow = offlineWindows.some((w) => {
        if (w.date !== today) return false;
        const startMinutes = toMinutes(w.start);
        const endMinutes = toMinutes(w.end);
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      });

      const user = auth.currentUser;
      if (!user) return;

      // Update service_company for service availability (isActive field) and service_availability for offline windows
      const companyRef = doc(db, "service_company", user.uid);

      if (isInOfflineWindow && isOnline) {
        console.log("AUTO → OFFLINE (service availability only)");
        setIsOnline(false);
        await updateDoc(companyRef, {
          isActive: false, // Service availability, not login access
          updatedAt: new Date(),
        });
      }

      if (!isInOfflineWindow && !isOnline) {
        console.log("AUTO → ONLINE (service availability only)");
        setIsOnline(true);
        await updateDoc(companyRef, {
          isActive: true, // Service availability, not login access
          updatedAt: new Date(),
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [offlineWindows, isOnline]);

  // Update online/offline status in service_company collection (isActive field for service availability only)
  const updateStatus = async (status) => {
    try {
      setUpdating(true);
      const user = auth.currentUser;
      if (!user) return;

      console.log(`Updating company service availability to: ${status ? 'ONLINE' : 'OFFLINE'}`);
      setIsOnline(status);

      // Update service_company collection with isActive field for service availability (not login access)
      await updateDoc(doc(db, "service_company", user.uid), {
        isActive: status, // This controls service visibility, not login access
        updatedAt: new Date(),
      });

      console.log("Company service availability updated successfully in service_company collection");
    } catch (error) {
      console.error("Error updating company service availability:", error);
      alert("Failed to update status. Please try again.");
      setIsOnline(!status);
    } finally {
      setUpdating(false);
    }
  };

  // Add offline window
  const addOfflineWindow = async () => {
    if (!date || !start || !end) {
      alert("Please select date & time");
      return;
    }

    if (start >= end) {
      alert("End time must be after start time");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const newWindow = { 
      id: Date.now(), 
      date, 
      start, 
      end,
      startTime: formatAMPM(start),
      endTime: formatAMPM(end)
    };
    const updated = [...offlineWindows, newWindow];

    setOfflineWindows(updated);

    await updateDoc(doc(db, "service_availability", user.uid), {
      offlineWindows: updated,
      updatedAt: new Date(),
    });

    setDate("");
    setStart("");
    setEnd("");
  };

  // Remove offline window
  const removeWindow = async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const updated = offlineWindows.filter((w) => w.id !== id);
    setOfflineWindows(updated);

    await updateDoc(doc(db, "service_availability", user.uid), {
      offlineWindows: updated,
      updatedAt: new Date(),
    });
  };

  // Get bookings for a specific date (fix timezone issue) - sorted by time
  const getBookingsForDate = (date) => {
    // Create date string in local timezone to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayBookings = bookings.filter(booking => {
      // Ensure booking.date is in the same format
      const bookingDateStr = booking.date;
      console.log(`Comparing booking date "${bookingDateStr}" with selected date "${dateStr}"`);
      return bookingDateStr === dateStr;
    });
    
    // Sort by time in ascending order (earliest first)
    dayBookings.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    console.log(`Bookings for ${dateStr} (sorted by time):`, dayBookings);
    return dayBookings;
  };

  // Get bookings for selected date (fix timezone issue) - sorted by time
  const getSelectedDateBookings = () => {
    const selectedBookings = bookings.filter(booking => {
      console.log(`Comparing booking date "${booking.date}" with selected date "${selectedDate}"`);
      return booking.date === selectedDate;
    });
    
    // Sort by time in ascending order (earliest first)
    selectedBookings.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    console.log(`Selected date bookings for ${selectedDate} (sorted by time):`, selectedBookings);
    return selectedBookings;
  };

  // Generate calendar days (compact version) - fix timezone issues
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    const todayStr = getTodayDateString();
    
    for (let i = 0; i < 35; i++) { // Reduced from 42 to 35 for more compact view
      const dayBookings = getBookingsForDate(currentDate);
      
      // Create date string in local timezone
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      days.push({
        date: new Date(currentDate),
        bookings: dayBookings,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dateStr: dateStr
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Navigate months
  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // Format time to 12-hour format
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'assigned': return '#3498db';
      case 'completed': return '#27ae60';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  // Get booking stats for current month
  const getMonthStats = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });

    return {
      total: monthBookings.length,
      pending: monthBookings.filter(b => b.status === 'pending').length,
      assigned: monthBookings.filter(b => b.status === 'assigned').length,
      completed: monthBookings.filter(b => b.status === 'completed').length,
    };
  };

  // Handle booking view
  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  // Close booking details modal
  const closeBookingDetails = () => {
    setShowBookingDetails(false);
    setSelectedBooking(null);
  };

  // Format booking date for display
  const formatBookingDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Handle assign worker
  const handleAssignWorker = (booking) => {
    setBookingToAssign(booking);
    setShowAssignWorker(true);
  };

  // Close assign worker modal
  const closeAssignWorker = () => {
    setShowAssignWorker(false);
    setBookingToAssign(null);
  };

  // Handle worker assigned successfully
  const handleWorkerAssigned = () => {
    // No need to call fetchBookings() - real-time listener will update automatically
    closeAssignWorker();
  };

  // Check if booking date is in the past (not today or future)
  const isBookingInPast = (booking) => {
    if (!booking.date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day
    
    const [year, month, day] = booking.date.split('-').map(Number);
    const bookingDate = new Date(year, month - 1, day);
    bookingDate.setHours(0, 0, 0, 0); // Reset to start of day
    
    return bookingDate < today;
  };

  // Check if booking can be assigned (only for today and future dates)
  const canAssignWorker = (booking) => {
    // Don't allow assignment if already assigned, completed, or cancelled
    if (booking.status === 'assigned' || booking.status === 'completed' || booking.status === 'cancelled') {
      return false;
    }
    
    // Don't allow assignment if worker already assigned
    if (booking.workerId || booking.workerName) {
      return false;
    }
    
    // Don't allow assignment if booking date is in the past (before today)
    if (isBookingInPast(booking)) {
      return false;
    }
    
    return true;
  };

  // Get today's date in local timezone
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get today's bookings
  const getTodaysBookings = () => {
    const todayStr = getTodayDateString();
    const todaysBookings = bookings.filter(booking => booking.date === todayStr);
    
    // Sort by time (earliest first)
    todaysBookings.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    return todaysBookings;
  };

  // Check if a date is today
  const isToday = (dateStr) => {
    return dateStr === getTodayDateString();
  };

  if (loading) {
    return (
      <div className="sd-main">
        <div className="slots-loading">
          <div className="loading-spinner"></div>
          <p>Loading slots and availability...</p>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
  const selectedDateBookings = getSelectedDateBookings();
  const monthStats = getMonthStats();

  // Modern inline styles for the modal
  const modalStyles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f8fafc'
    },
    title: {
      margin: 0,
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '4px',
      borderRadius: '4px',
      transition: 'color 0.2s'
    },
    content: {
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    card: {
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    cardHeader: {
      backgroundColor: '#f9fafb',
      padding: '12px 16px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    cardTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151'
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '12px',
      color: 'white',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase'
    },
    cardBody: {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#6b7280',
      minWidth: '80px',
      flexShrink: 0
    },
    value: {
      fontSize: '14px',
      color: '#1f2937',
      textAlign: 'right',
      wordBreak: 'break-word'
    },
    link: {
      fontSize: '14px',
      color: '#3b82f6',
      textDecoration: 'none'
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      display: 'flex',
      justifyContent: 'flex-end'
    },
    closeButton: {
      backgroundColor: '#6b7280',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    }
  };

  // View button styles
  const viewButtonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  };

  // Assign worker button styles
  const assignButtonStyle = {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginLeft: '4px'
  };

  return (
    <div className="sd-main">
      <div className="sd-header">
        <div>
          <h1>📅 Slots & Availability</h1>
          <p>Manage your availability and view customer bookings</p>
        </div>
        <div className="slots-header-actions">
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendar
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await fetchBookings();
                } catch (error) {
                  console.error("Manual refresh failed:", error);
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Refresh
            </button>
            {!isToday(selectedDate) && (
              <button 
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
                onClick={() => {
                  const todayStr = getTodayDateString();
                  setSelectedDate(todayStr);
                  setCurrentMonth(new Date());
                }}
              >
                📅 Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Company Status Card */}
      <div className="company-status-card">
        <div className="status-section">
          <div className="status-info">
            <h3>Company Status</h3>
            <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div className="status-buttons">
            <button
              className={`status-btn online ${isOnline ? 'active' : ''}`}
              onClick={() => updateStatus(true)}
              disabled={updating || isOnline}
            >
              {updating && !isOnline ? "Going Online..." : "Go Online"}
            </button>
            <button
              className={`status-btn offline ${!isOnline ? 'active' : ''}`}
              onClick={() => updateStatus(false)}
              disabled={updating || !isOnline}
            >
              {updating && isOnline ? "Going Offline..." : "Go Offline"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats and Calendar Row */}
      <div className="slots-main-content">
        {/* Left Side - Stats and Offline Windows */}
        <div className="slots-sidebar">
          {/* Month Stats */}
          <div className="slots-stats-card">
            <h3>This Month</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{monthStats.total}</span>
                <span className="stat-label">Total</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{monthStats.pending}</span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{monthStats.assigned}</span>
                <span className="stat-label">Assigned</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{monthStats.completed}</span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
          </div>

          {/* Offline Windows */}
          <div className="offline-windows-card">
            <h3>Offline Windows</h3>
            
            {/* Add New Window Form */}
            <div className="add-window-form-compact">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="compact-input"
              />
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="compact-input"
              />
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="compact-input"
              />
              <button className="add-btn-compact" onClick={addOfflineWindow}>
                Add
              </button>
            </div>

            {/* Scheduled Windows */}
            <div className="windows-list-compact">
              {offlineWindows.length > 0 ? (
                offlineWindows.map((window) => (
                  <div key={window.id || `${window.date}-${window.start}`} className="window-item-compact">
                    <div className="window-info-compact">
                      <div className="window-date-compact">📅 {window.date}</div>
                      <div className="window-time-compact">⏰ {window.startTime || formatAMPM(window.start)} – {window.endTime || formatAMPM(window.end)}</div>
                    </div>
                    <button
                      className="remove-btn-compact"
                      onClick={() => removeWindow(window.id || offlineWindows.indexOf(window))}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-message-compact">No offline times</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Calendar */}
        <div className="slots-calendar-section">
          {viewMode === 'calendar' ? (
            <div className="compact-calendar-container">
              {/* Calendar Header */}
              <div className="compact-calendar-header">
                <button className="nav-btn-compact" onClick={() => navigateMonth(-1)}>‹</button>
                <h3 className="calendar-title-compact">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button className="nav-btn-compact" onClick={() => navigateMonth(1)}>›</button>
              </div>

              {/* Calendar Grid */}
              <div className="compact-calendar-grid">
                {/* Day Headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="compact-day-header">{day}</div>
                ))}

                {/* Calendar Days */}
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`compact-calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''} ${day.bookings.length > 0 ? 'has-bookings' : ''}`}
                    onClick={() => {
                      console.log(`Calendar day clicked: ${day.dateStr}`);
                      setSelectedDate(day.dateStr);
                    }}
                  >
                    <span className="compact-day-number">{day.date.getDate()}</span>
                    {day.bookings.length > 0 && (
                      <div className="compact-booking-indicator">
                        <span className="compact-booking-count">{day.bookings.length}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected Date Details */}
              <div className="compact-selected-details">
                <h4>
                  {isToday(selectedDate) ? "Today's Schedule" : 
                   new Date(selectedDate).toLocaleDateString('en-US', { 
                     month: 'short', 
                     day: 'numeric' 
                   }) + " Bookings"
                  }
                </h4>
                
                {selectedDateBookings.length > 0 ? (
                  <div className="compact-bookings-list">
                    {selectedDateBookings.map(booking => (
                      <div key={booking.id} className="compact-booking-item">
                        <div className="compact-booking-time">
                          {formatTime(booking.time)}
                        </div>
                        <div className="compact-booking-info">
                          <div className="compact-customer">{booking.customerName}</div>
                          <div className="compact-service">{booking.workName || booking.serviceName}</div>
                        </div>
                        <div className="compact-booking-actions">
                          <button 
                            style={viewButtonStyle}
                            onClick={() => handleViewBooking(booking)}
                            title="View booking details"
                          >
                            View
                          </button>
                          {booking.status === 'completed' ? (
                            <span style={{
                              backgroundColor: '#27ae60',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              COMPLETED
                            </span>
                          ) : booking.status === 'cancelled' ? (
                            <span style={{
                              backgroundColor: '#e74c3c',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              CANCELLED
                            </span>
                          ) : booking.status === 'assigned' || booking.workerId || booking.workerName ? (
                            <span style={{
                              backgroundColor: '#3498db',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              ASSIGNED
                            </span>
                          ) : isBookingInPast(booking) ? (
                            <span style={{
                              backgroundColor: '#95a5a6',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              EXPIRED
                            </span>
                          ) : canAssignWorker(booking) ? (
                            <button 
                              style={assignButtonStyle}
                              onClick={() => handleAssignWorker(booking)}
                              title="Assign worker to this booking"
                            >
                              Assign
                            </button>
                          ) : null}
                          <div 
                            className="compact-status-dot"
                            style={{ backgroundColor: getStatusColor(booking.status) }}
                            title={booking.status}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-bookings-compact">
                    {isToday(selectedDate) ? "No bookings scheduled for today" : "No bookings"}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="slots-list-container">
              <div className="list-header">
                <h3>All Bookings ({bookings.length})</h3>
              </div>
              
              {bookings.length > 0 ? (
                <div className="bookings-list">
                  {bookings.slice(0, 20).map(booking => (
                    <div key={booking.id} className="list-booking-card">
                      <div className="list-booking-header">
                        <div className="list-booking-date">
                          📅 {new Date(booking.date).toLocaleDateString()}
                        </div>
                        <div className="list-booking-time">
                          🕐 {formatTime(booking.time)}
                        </div>
                        <div className="list-booking-header-actions">
                          <button 
                            style={viewButtonStyle}
                            onClick={() => handleViewBooking(booking)}
                          >
                            View
                          </button>
                          {booking.status === 'completed' ? (
                            <span style={{
                              backgroundColor: '#27ae60',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              COMPLETED
                            </span>
                          ) : booking.status === 'cancelled' ? (
                            <span style={{
                              backgroundColor: '#e74c3c',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              CANCELLED
                            </span>
                          ) : booking.status === 'assigned' || booking.workerId || booking.workerName ? (
                            <span style={{
                              backgroundColor: '#3498db',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              ASSIGNED
                            </span>
                          ) : isBookingInPast(booking) ? (
                            <span style={{
                              backgroundColor: '#95a5a6',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              EXPIRED
                            </span>
                          ) : canAssignWorker(booking) ? (
                            <button 
                              style={assignButtonStyle}
                              onClick={() => handleAssignWorker(booking)}
                              title="Assign worker to this booking"
                            >
                              Assign
                            </button>
                          ) : null}
                          <div 
                            className="list-booking-status"
                            style={{ backgroundColor: getStatusColor(booking.status) }}
                          >
                            {booking.status}
                          </div>
                        </div>
                      </div>
                      <div className="list-booking-details">
                        <div className="list-booking-customer">
                          👤 <strong>{booking.customerName}</strong>
                        </div>
                        <div className="list-booking-service">
                          🔧 {booking.workName || booking.serviceName}
                        </div>
                        {booking.workerName && (
                          <div className="list-booking-worker">
                            👨‍🔧 {booking.workerName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-bookings-list">
                  <div className="no-bookings-icon">📭</div>
                  <h3>No Bookings Found</h3>
                  <p>No customer bookings available yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div style={modalStyles.overlay} onClick={closeBookingDetails}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.header}>
              <h2 style={modalStyles.title}>Booking Details</h2>
              <button style={modalStyles.closeBtn} onClick={closeBookingDetails}>
                ✕
              </button>
            </div>
            
            <div style={modalStyles.content}>
              {/* Booking Information */}
              <div style={modalStyles.card}>
                <div style={modalStyles.cardHeader}>
                  <span style={modalStyles.cardTitle}>📋 Booking Information</span>
                  <span 
                    style={{
                      ...modalStyles.statusBadge,
                      backgroundColor: getStatusColor(selectedBooking.status)
                    }}
                  >
                    {selectedBooking.status}
                  </span>
                </div>
                <div style={modalStyles.cardBody}>
                  <div style={modalStyles.infoRow}>
                    <span style={modalStyles.label}>Date:</span>
                    <span style={modalStyles.value}>{formatBookingDate(selectedBooking.date)}</span>
                  </div>
                  <div style={modalStyles.infoRow}>
                    <span style={modalStyles.label}>Time:</span>
                    <span style={modalStyles.value}>{formatTime(selectedBooking.time)}</span>
                  </div>
                  <div style={modalStyles.infoRow}>
                    <span style={modalStyles.label}>Service:</span>
                    <span style={modalStyles.value}>{selectedBooking.workName || selectedBooking.serviceName}</span>
                  </div>
                  {selectedBooking.workerName && (
                    <div style={modalStyles.infoRow}>
                      <span style={modalStyles.label}>Worker:</span>
                      <span style={modalStyles.value}>{selectedBooking.workerName}</span>
                    </div>
                  )}
                  {selectedBooking.price && (
                    <div style={modalStyles.infoRow}>
                      <span style={modalStyles.label}>Price:</span>
                      <span style={modalStyles.value}>₹{selectedBooking.price}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div style={modalStyles.card}>
                <div style={modalStyles.cardHeader}>
                  <span style={modalStyles.cardTitle}>👤 Customer Information</span>
                </div>
                <div style={modalStyles.cardBody}>
                  <div style={modalStyles.infoRow}>
                    <span style={modalStyles.label}>Name:</span>
                    <span style={modalStyles.value}>{selectedBooking.customerName}</span>
                  </div>
                  {selectedBooking.customerPhone && (
                    <div style={modalStyles.infoRow}>
                      <span style={modalStyles.label}>Phone:</span>
                      <a 
                        href={`tel:${selectedBooking.customerPhone}`} 
                        style={modalStyles.link}
                      >
                        {selectedBooking.customerPhone}
                      </a>
                    </div>
                  )}
                  {selectedBooking.customerEmail && (
                    <div style={modalStyles.infoRow}>
                      <span style={modalStyles.label}>Email:</span>
                      <a 
                        href={`mailto:${selectedBooking.customerEmail}`} 
                        style={modalStyles.link}
                      >
                        {selectedBooking.customerEmail}
                      </a>
                    </div>
                  )}
                  {selectedBooking.address && (
                    <div style={modalStyles.infoRow}>
                      <span style={modalStyles.label}>Address:</span>
                      <span style={modalStyles.value}>{selectedBooking.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {(selectedBooking.description || selectedBooking.notes || selectedBooking.createdAt) && (
                <div style={modalStyles.card}>
                  <div style={modalStyles.cardHeader}>
                    <span style={modalStyles.cardTitle}>📝 Additional Details</span>
                  </div>
                  <div style={modalStyles.cardBody}>
                    {selectedBooking.description && (
                      <div style={modalStyles.infoRow}>
                        <span style={modalStyles.label}>Description:</span>
                        <span style={modalStyles.value}>{selectedBooking.description}</span>
                      </div>
                    )}
                    {selectedBooking.notes && (
                      <div style={modalStyles.infoRow}>
                        <span style={modalStyles.label}>Notes:</span>
                        <span style={modalStyles.value}>{selectedBooking.notes}</span>
                      </div>
                    )}
                    {selectedBooking.createdAt && (
                      <div style={modalStyles.infoRow}>
                        <span style={modalStyles.label}>Booked On:</span>
                        <span style={modalStyles.value}>
                          {selectedBooking.createdAt.toDate ? 
                            selectedBooking.createdAt.toDate().toLocaleString() : 
                            new Date(selectedBooking.createdAt).toLocaleString()
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={modalStyles.footer}>
              <button style={modalStyles.closeButton} onClick={closeBookingDetails}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Worker Modal */}
      {showAssignWorker && bookingToAssign && (
        <AssignWorkerModal
          booking={bookingToAssign}
          categories={categories}
          onClose={closeAssignWorker}
          onAssigned={handleWorkerAssigned}
        />
      )}
    </div>
  );
}
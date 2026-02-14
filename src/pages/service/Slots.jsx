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
import "./Slots.css";
import AssignWorkerModal from "./AssignWorkerModal";
import PowerSwitch from "../../components/PowerSwitch";
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
  
  // Offline form state
  const [showOfflineForm, setShowOfflineForm] = useState(false);

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

  // Toggle online status wrapper
  const toggleOnlineStatus = async (status) => {
    await updateStatus(status);
  };

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

  // Remove offline window by index (for new UI)
  const removeOfflineWindow = async (index) => {
    const user = auth.currentUser;
    if (!user) return;

    const updated = offlineWindows.filter((_, i) => i !== index);
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
  // Helper function to get bookings count for a date
  const getBookingsCountForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(b => b.date === dateStr).length;
  };

  // Helper function to render calendar
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push(
        <div key={`empty-${i}`} className="calendar-day other-month">
          <span className="calendar-day-number">{prevMonthDay.getDate()}</span>
        </div>
      );
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = dateStr === selectedDate;
      const isToday = date.toDateString() === today.toDateString();
      const bookingsCount = getBookingsCountForDate(date);
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => setSelectedDate(dateStr)}
        >
          <span className="calendar-day-number">{day}</span>
          {bookingsCount > 0 && (
            <span className="calendar-day-badge">{bookingsCount}</span>
          )}
        </div>
      );
    }
    
    return days;
  };

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
    <div className="slots-container">
      {/* Modern Header */}
      <div className="slots-header">
        <div className="slots-title-section">
          <h1>📅 Calendar & Slots</h1>
          <p>Manage your availability and view customer bookings</p>
        </div>
        <div className="slots-actions">
          {/* View Toggle */}
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendar
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
          </div>
          
          {/* Status Toggle with Power Switch */}
          <div className="status-toggle">
            <div className="status-indicator">
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
              <span style={{ fontWeight: '700', fontSize: '16px' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <PowerSwitch 
              isOn={isOnline}
              onChange={(checked) => toggleOnlineStatus(checked)}
              disabled={updating}
            />
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="slots-content">
          {/* Calendar Section */}
          <div className="calendar-section">
            <div className="calendar-header">
              <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              <div className="calendar-nav">
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  ‹
                </button>
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </button>
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  ›
                </button>
              </div>
            </div>
            
            <div className="calendar-grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="calendar-day-header">{day}</div>
              ))}
              {renderCalendar()}
            </div>
          </div>

          {/* Today's Schedule Section */}
          <div className="schedule-section">
            <div className="schedule-header">
              <h3>Today's Schedule</h3>
              <p className="schedule-date">
                {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="schedule-list">
              {bookings.filter(b => b.date === selectedDate).length === 0 ? (
                <div className="empty-schedule">
                  <div className="empty-schedule-icon">📭</div>
                  <h4>No bookings for this day</h4>
                  <p>You're free on this date</p>
                </div>
              ) : (
                bookings
                  .filter(b => b.date === selectedDate)
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .map(booking => (
                    <div key={booking.id} className="schedule-item">
                      <div className="schedule-item-header">
                        <span className="schedule-time">{booking.time || 'No time'}</span>
                        <span className={`schedule-status ${booking.status || 'pending'}`}>
                          {booking.status || 'pending'}
                        </span>
                      </div>
                      <div className="schedule-item-body">
                        <div className="schedule-info">
                          <svg className="schedule-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{booking.customerName || 'Unknown'}</span>
                        </div>
                        <div className="schedule-info">
                          <svg className="schedule-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{booking.workName || booking.serviceName || 'Service'}</span>
                        </div>
                        {booking.workerName && (
                          <div className="schedule-info">
                            <svg className="schedule-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>Worker: {booking.workerName}</span>
                          </div>
                        )}
                      </div>
                      <div className="schedule-actions">
                        <button 
                          className="schedule-action-btn primary"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingDetails(true);
                          }}
                        >
                          View Details
                        </button>
                        {booking.status === 'pending' && (
                          <button 
                            className="schedule-action-btn secondary"
                            onClick={() => {
                              setBookingToAssign(booking);
                              setShowAssignWorker(true);
                            }}
                          >
                            Assign Worker
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Offline Windows Section */}
            <div className="offline-windows-section">
              <div className="offline-windows-header">
                <h4>Offline Windows</h4>
                <button className="add-offline-btn" onClick={() => setShowOfflineForm(!showOfflineForm)}>
                  {showOfflineForm ? '− Cancel' : '+ Add Offline Time'}
                </button>
              </div>

              {showOfflineForm && (
                <div className="offline-form">
                  <div className="offline-form-row">
                    <div className="offline-form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div className="offline-form-group">
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                      />
                    </div>
                    <div className="offline-form-group">
                      <label>End Time</label>
                      <input
                        type="time"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="offline-form-actions">
                    <button className="schedule-action-btn secondary" onClick={() => setShowOfflineForm(false)}>
                      Cancel
                    </button>
                    <button className="schedule-action-btn primary" onClick={addOfflineWindow}>
                      Add Offline Window
                    </button>
                  </div>
                </div>
              )}

              {offlineWindows.map((window, index) => (
                <div key={index} className="offline-window-item">
                  <div className="offline-window-info">
                    📅 {window.date} • ⏰ {window.start} - {window.end}
                  </div>
                  <button 
                    className="delete-offline-btn"
                    onClick={() => removeOfflineWindow(index)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="slots-content" style={{ gridTemplateColumns: '1fr' }}>
          <div className="calendar-section">
            <div className="calendar-header">
              <h2>All Bookings</h2>
              <div className="calendar-nav">
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  ‹ Previous Month
                </button>
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  This Month
                </button>
                <button 
                  className="calendar-nav-btn"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  Next Month ›
                </button>
              </div>
            </div>

            {/* Group bookings by date */}
            {(() => {
              // Get bookings for current month
              const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
              const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
              const monthStartStr = monthStart.toISOString().split('T')[0];
              const monthEndStr = monthEnd.toISOString().split('T')[0];
              
              const monthBookings = bookings.filter(b => 
                b.date >= monthStartStr && b.date <= monthEndStr
              );

              // Group by date
              const groupedBookings = monthBookings.reduce((acc, booking) => {
                const date = booking.date || 'No Date';
                if (!acc[date]) {
                  acc[date] = [];
                }
                acc[date].push(booking);
                return acc;
              }, {});

              // Sort dates
              const sortedDates = Object.keys(groupedBookings).sort((a, b) => b.localeCompare(a));

              if (sortedDates.length === 0) {
                return (
                  <div className="empty-schedule">
                    <div className="empty-schedule-icon">📭</div>
                    <h4>No bookings this month</h4>
                    <p>No bookings found for {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {sortedDates.map(date => (
                    <div key={date} style={{ 
                      background: 'white', 
                      borderRadius: '12px', 
                      padding: '20px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <div style={{
                          background: 'hsl(262.1, 83.3%, 57.8%)',
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '14px'
                        }}>
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <span style={{ 
                          color: '#64748b', 
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          {groupedBookings[date].length} booking{groupedBookings[date].length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="schedule-list">
                        {groupedBookings[date]
                          .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                          .map(booking => (
                            <div key={booking.id} className="schedule-item">
                              <div className="schedule-item-header">
                                <span className="schedule-time">{booking.time || 'No time'}</span>
                                <span className={`schedule-status ${booking.status || 'pending'}`}>
                                  {booking.status || 'pending'}
                                </span>
                              </div>
                              <div className="schedule-item-body">
                                <div className="schedule-info">
                                  <svg className="schedule-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span>{booking.customerName || 'Unknown'}</span>
                                </div>
                                <div className="schedule-info">
                                  <svg className="schedule-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>{booking.workName || booking.serviceName || 'Service'}</span>
                                </div>
                                {booking.customerPhone && (
                                  <div className="schedule-info">
                                    <svg className="schedule-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span>{booking.customerPhone}</span>
                                  </div>
                                )}
                                {booking.workerName && (
                                  <div className="schedule-info">
                                    <svg className="schedule-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Worker: {booking.workerName}</span>
                                  </div>
                                )}
                              </div>
                              <div className="schedule-actions">
                                <button 
                                  className="schedule-action-btn primary"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowBookingDetails(true);
                                  }}
                                >
                                  View Details
                                </button>
                                {booking.status === 'pending' && (
                                  <button 
                                    className="schedule-action-btn secondary"
                                    onClick={() => {
                                      setBookingToAssign(booking);
                                      setShowAssignWorker(true);
                                    }}
                                  >
                                    Assign Worker
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAssignWorker && bookingToAssign && (
        <AssignWorkerModal
          booking={bookingToAssign}
          categories={categories}
          onClose={() => {
            setShowAssignWorker(false);
            setBookingToAssign(null);
          }}
          onAssigned={() => {
            setShowAssignWorker(false);
            setBookingToAssign(null);
            // Refresh will happen automatically via real-time listener
          }}
        />
      )}
    </div>
  );
}

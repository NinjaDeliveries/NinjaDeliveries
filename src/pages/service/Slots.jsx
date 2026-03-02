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
import { useToast } from "../../components/ToastContainer";
import { 
  getTodayIST, 
  toISTDateString, 
  isToday as checkIsToday,
  isPast,
  formatDateForDisplay,
  getRelativeDateLabel
} from "../../utils/dateHelpers";

export default function Slots() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use IST date helper to get today's date
    return getTodayIST();
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
      toast.error("Error loading bookings", "Please refresh the page to try again.");
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
    console.log("Toast object:", toast); // Debug log
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
      const today = getTodayIST();
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

      // Update all categories, services, and technicians isActive status
      console.log(`Updating categories, services, and technicians to: ${status ? 'ACTIVE' : 'INACTIVE'}`);
      
      // Update Categories
      const categoriesQuery = query(
        collection(db, "service_categories"),
        where("companyId", "==", user.uid)
      );
      const categoriesSnap = await getDocs(categoriesQuery);
      const categoryUpdates = categoriesSnap.docs.map(docSnap =>
        updateDoc(doc(db, "service_categories", docSnap.id), {
          isActive: status,
          updatedAt: new Date(),
        })
      );

      // Update Services
      const servicesQuery = query(
        collection(db, "service_services"),
        where("companyId", "==", user.uid)
      );
      const servicesSnap = await getDocs(servicesQuery);
      const serviceUpdates = servicesSnap.docs.map(docSnap =>
        updateDoc(doc(db, "service_services", docSnap.id), {
          isActive: status,
          updatedAt: new Date(),
        })
      );

      // Update Technicians
      const techniciansQuery = query(
        collection(db, "service_technicians"),
        where("companyId", "==", user.uid)
      );
      const techniciansSnap = await getDocs(techniciansQuery);
      const technicianUpdates = techniciansSnap.docs.map(docSnap =>
        updateDoc(doc(db, "service_technicians", docSnap.id), {
          isActive: status,
          updatedAt: new Date(),
        })
      );

      // Execute all updates in parallel
      await Promise.all([...categoryUpdates, ...serviceUpdates, ...technicianUpdates]);

      console.log(`Successfully updated ${categoriesSnap.size} categories, ${servicesSnap.size} services, and ${techniciansSnap.size} technicians`);
      
      console.log("About to show toast, toast object:", toast); // Debug log
      
      toast.success(
        `Company is now ${status ? 'ONLINE' : 'OFFLINE'}!`,
        [
          `${categoriesSnap.size} Categories updated`,
          `${servicesSnap.size} Services updated`,
          `${techniciansSnap.size} Technicians updated`
        ]
      );
      
      console.log("Toast called successfully"); // Debug log
    } catch (error) {
      console.error("Error updating company service availability:", error);
      toast.error("Failed to update status", "Please try again.");
      setIsOnline(!status);
    } finally {
      setUpdating(false);
    }
  };

  // Add offline window
  const addOfflineWindow = async () => {
    if (!date || !start || !end) {
      toast.warning("Missing Information", "Please select date and time for offline window.");
      return;
    }

    if (start >= end) {
      toast.warning("Invalid Time Range", "End time must be after start time.");
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
    // Convert date to IST date string
    const dateStr = toISTDateString(date);
    
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
    const todayStr = getTodayIST();
    const currentDate = new Date(startDate); // Initialize currentDate from startDate
    
    for (let i = 0; i < 35; i++) { // Reduced from 42 to 35 for more compact view
      const dayBookings = getBookingsForDate(currentDate);
      
      // Convert date to IST date string
      const dateStr = toISTDateString(currentDate);
      
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
    return isPast(booking.date);
  };

  // Check if booking can be assigned (only for today and future dates)
  const canAssignWorker = (booking) => {
    // Don't allow assignment if completed, cancelled, or rejected
    if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'rejected') {
      return false;
    }
    
    // Don't allow assignment if work has started
    if (booking.status === 'started') {
      return false;
    }
    
    // Don't allow assignment if booking date is in the past (before today)
    if (isBookingInPast(booking)) {
      return false;
    }
    
    // Allow assignment for: pending, confirmed, assigned (for re-assignment)
    return true;
  };

  // Get today's date in IST timezone
  const getTodayDateString = () => {
    return getTodayIST();
  };

  // Get today's bookings
  const getTodaysBookings = () => {
    const todayStr = getTodayIST();
    const todaysBookings = bookings.filter(booking => booking.date === todayStr);
    
    // Sort by time (earliest first)
    todaysBookings.sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
    
    return todaysBookings;
  };

  // Check if a date is today (IST)
  const isToday = (dateStr) => {
    return checkIsToday(dateStr);
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
    const dateStr = toISTDateString(date);
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
    const todayStr = getTodayIST();
    
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
      const dateStr = toISTDateString(date);
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === todayStr;
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                <span style={{
                  background: 'linear-gradient(135deg, hsl(262.1, 83.3%, 57.8%) 0%, hsl(262.1, 73.3%, 47.8%) 100%)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                }}>
                  {bookings.length} Total Bookings
                </span>
              </div>
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

            {/* Calendar Legend */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: '2px solid #10b981'
                }}></div>
                <span style={{ fontWeight: '600', color: '#065f46' }}>Today</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, hsl(262.1, 83.3%, 57.8%) 0%, hsl(262.1, 73.3%, 47.8%) 100%)',
                  border: '2px solid hsl(262.1, 83.3%, 57.8%)'
                }}></div>
                <span style={{ fontWeight: '600', color: '#5b21b6' }}>Selected</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '7px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    fontSize: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700'
                  }}>3</div>
                </div>
                <span style={{ fontWeight: '600', color: '#475569' }}>Has Bookings</span>
              </div>
            </div>
          </div>

          {/* Today's Schedule Section */}
          <div className="schedule-section">
            <div className={`schedule-header ${isToday(selectedDate) ? 'today' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3>{isToday(selectedDate) ? "Today's Schedule" : "Schedule"}</h3>
                <span style={{
                  background: isToday(selectedDate) 
                    ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
                    : 'linear-gradient(135deg, hsl(262.1, 83.3%, 57.8%) 0%, hsl(262.1, 73.3%, 47.8%) 100%)',
                  color: isToday(selectedDate) ? '#78350f' : 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  boxShadow: isToday(selectedDate) 
                    ? '0 2px 8px rgba(251, 191, 36, 0.4)' 
                    : '0 2px 8px rgba(139, 92, 246, 0.3)'
                }}>
                  {bookings.filter(b => b.date === selectedDate).length} Bookings
                </span>
              </div>
              <p className="schedule-date">
                {formatDateForDisplay(selectedDate)}
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
                    <div key={booking.id} className={`schedule-item status-${booking.status || 'pending'}`}>
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
                            console.log("View Details clicked for booking:", booking.id);
                            setSelectedBooking(booking);
                            setShowBookingDetails(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </button>
                        {canAssignWorker(booking) && (
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
              const monthStartStr = toISTDateString(monthStart);
              const monthEndStr = toISTDateString(monthEnd);
              
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
                            <div key={booking.id} className={`schedule-item status-${booking.status || 'pending'}`}>
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
                                    console.log("View Details clicked for booking:", booking.id);
                                    setSelectedBooking(booking);
                                    setShowBookingDetails(true);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Details
                                </button>
                                {canAssignWorker(booking) && (
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

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowBookingDetails(false);
            setSelectedBooking(null);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease-out',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, hsl(262.1, 83.3%, 57.8%) 0%, hsl(262.1, 73.3%, 47.8%) 100%)',
              padding: '24px',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              color: 'white',
              position: 'relative'
            }}>
              <button
                onClick={() => {
                  setShowBookingDetails(false);
                  setSelectedBooking(null);
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'white',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                ✕
              </button>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
                Booking Details
              </h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                ID: #{selectedBooking.id.slice(-8)}
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: selectedBooking.status === 'completed' ? '#d1fae5' :
                                   selectedBooking.status === 'pending' ? '#fef3c7' :
                                   selectedBooking.status === 'assigned' ? '#dbeafe' :
                                   selectedBooking.status === 'started' ? '#e0e7ff' :
                                   '#fee2e2',
                  color: selectedBooking.status === 'completed' ? '#065f46' :
                         selectedBooking.status === 'pending' ? '#92400e' :
                         selectedBooking.status === 'assigned' ? '#1e40af' :
                         selectedBooking.status === 'started' ? '#4338ca' :
                         '#991b1b'
                }}>
                  {selectedBooking.status === 'completed' ? '✓ Completed' :
                   selectedBooking.status === 'pending' ? '⏳ Pending' :
                   selectedBooking.status === 'assigned' ? '👤 Assigned' :
                   selectedBooking.status === 'started' ? '▶ Started' :
                   '✕ ' + selectedBooking.status}
                </span>
              </div>

              {/* Customer Information */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Customer Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Name</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600' }}>
                      {selectedBooking.customerName || 'N/A'}
                    </span>
                  </div>
                  {selectedBooking.customerPhone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Phone</span>
                      <a 
                        href={`tel:${selectedBooking.customerPhone}`}
                        style={{ 
                          color: 'hsl(262.1, 83.3%, 57.8%)', 
                          fontSize: '14px', 
                          fontWeight: '600',
                          textDecoration: 'none'
                        }}
                      >
                        {selectedBooking.customerPhone}
                      </a>
                    </div>
                  )}
                  {selectedBooking.email && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Email</span>
                      <a 
                        href={`mailto:${selectedBooking.email}`}
                        style={{ 
                          color: 'hsl(262.1, 83.3%, 57.8%)', 
                          fontSize: '14px', 
                          fontWeight: '600',
                          textDecoration: 'none'
                        }}
                      >
                        {selectedBooking.email}
                      </a>
                    </div>
                  )}
                  {selectedBooking.customerAddress && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Address</span>
                      <span style={{ 
                        color: '#1e293b', 
                        fontSize: '14px', 
                        fontWeight: '500',
                        textAlign: 'right',
                        maxWidth: '60%'
                      }}>
                        {selectedBooking.customerAddress}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Service Information */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Service Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Service</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600' }}>
                      {selectedBooking.workName || selectedBooking.serviceName || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Date</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600' }}>
                      {selectedBooking.date ? formatDateForDisplay(selectedBooking.date) : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Time</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '600' }}>
                      {selectedBooking.time ? formatTime(selectedBooking.time) : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Amount</span>
                    <span style={{ 
                      color: '#10b981', 
                      fontSize: '18px', 
                      fontWeight: '700'
                    }}>
                      ₹{(selectedBooking.totalPrice || selectedBooking.price || selectedBooking.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  {selectedBooking.createdAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Booked On</span>
                      <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                        {selectedBooking.createdAt?.toDate ? 
                          selectedBooking.createdAt.toDate().toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : 
                          new Date(selectedBooking.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        }
                      </span>
                    </div>
                  )}
                  {selectedBooking.notes && (
                    <div style={{ 
                      marginTop: '8px',
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                        Notes
                      </span>
                      <span style={{ color: '#1e293b', fontSize: '14px' }}>
                        {selectedBooking.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Worker Information (if assigned) */}
              {selectedBooking.workerName && (
                <div style={{
                  background: '#f0fdf4',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #bbf7d0'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Assigned Worker
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#166534', fontSize: '14px', fontWeight: '500' }}>Worker Name</span>
                    <span style={{ color: '#166534', fontSize: '14px', fontWeight: '600' }}>
                      {selectedBooking.workerName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              {canAssignWorker(selectedBooking) && (
                <button
                  onClick={() => {
                    setShowBookingDetails(false);
                    setBookingToAssign(selectedBooking);
                    setShowAssignWorker(true);
                  }}
                  style={{
                    background: 'hsl(262.1, 83.3%, 57.8%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Assign Worker
                </button>
              )}
              <button
                onClick={() => {
                  setShowBookingDetails(false);
                  setSelectedBooking(null);
                }}
                style={{
                  background: '#e2e8f0',
                  color: '#475569',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#cbd5e1'}
                onMouseLeave={(e) => e.target.style.background = '#e2e8f0'}
              >
                Close
              </button>
            </div>

            {/* Add CSS animations */}
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUp {
                from { 
                  opacity: 0;
                  transform: translateY(20px);
                }
                to { 
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}

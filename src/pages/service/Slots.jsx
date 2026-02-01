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
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";

export default function Slots() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Fetch bookings from service_bookings collection
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
      
      // Sort bookings by date (newest first)
      bookingsList.sort((a, b) => {
        if (a.date === b.date) {
          return (a.time || '').localeCompare(b.time || '');
        }
        return (b.date || '').localeCompare(a.date || '');
      });

      setBookings(bookingsList);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      alert("Error loading bookings. Please refresh the page.");
    }
  };

  // Load availability data from service_company collection (fix isActive field)
  const loadAvailability = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      console.log("Loading company availability for user:", user.uid);

      // Get company status from service_company collection (isActive field)
      const companyRef = doc(db, "service_company", user.uid);
      const companySnap = await getDoc(companyRef);

      if (companySnap.exists()) {
        const companyData = companySnap.data();
        console.log("Company data:", companyData);
        // Use isActive field (true = online, false = offline)
        setIsOnline(companyData.isActive ?? true);
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        Promise.all([fetchBookings(), loadAvailability()]).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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

      // Update service_company for status (isActive field) and service_availability for offline windows
      const companyRef = doc(db, "service_company", user.uid);

      if (isInOfflineWindow && isOnline) {
        console.log("AUTO → OFFLINE");
        setIsOnline(false);
        await updateDoc(companyRef, {
          isActive: false, // Use isActive field
          updatedAt: new Date(),
        });
      }

      if (!isInOfflineWindow && !isOnline) {
        console.log("AUTO → ONLINE");
        setIsOnline(true);
        await updateDoc(companyRef, {
          isActive: true, // Use isActive field
          updatedAt: new Date(),
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [offlineWindows, isOnline]);

  // Update online/offline status in service_company collection (fix isActive field)
  const updateStatus = async (status) => {
    try {
      setUpdating(true);
      const user = auth.currentUser;
      if (!user) return;

      console.log(`Updating company status to: ${status ? 'ONLINE' : 'OFFLINE'}`);
      setIsOnline(status);

      // Update service_company collection with isActive field (true = online, false = offline)
      await updateDoc(doc(db, "service_company", user.uid), {
        isActive: status, // This is the correct field for company status
        updatedAt: new Date(),
      });

      console.log("Company status updated successfully in service_company collection");
    } catch (error) {
      console.error("Error updating company status:", error);
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

  // Get bookings for a specific date (fix timezone issue)
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
    
    console.log(`Bookings for ${dateStr}:`, dayBookings);
    return dayBookings;
  };

  // Get bookings for selected date (fix timezone issue)
  const getSelectedDateBookings = () => {
    const selectedBookings = bookings.filter(booking => {
      console.log(`Comparing booking date "${booking.date}" with selected date "${selectedDate}"`);
      return booking.date === selectedDate;
    });
    console.log(`Selected date bookings for ${selectedDate}:`, selectedBookings);
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
        isToday: currentDate.toDateString() === new Date().toDateString(),
        isSelected: dateStr === selectedDate
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
                      // Create date string in local timezone to avoid timezone issues
                      const year = day.date.getFullYear();
                      const month = String(day.date.getMonth() + 1).padStart(2, '0');
                      const dayNum = String(day.date.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${dayNum}`;
                      console.log(`Calendar day clicked: ${dateStr}`);
                      setSelectedDate(dateStr);
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
                  {new Date(selectedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })} Bookings
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
                        <div 
                          className="compact-status-dot"
                          style={{ backgroundColor: getStatusColor(booking.status) }}
                          title={booking.status}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-bookings-compact">No bookings</p>
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
                        <div 
                          className="list-booking-status"
                          style={{ backgroundColor: getStatusColor(booking.status) }}
                        >
                          {booking.status}
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
    </div>
  );
}
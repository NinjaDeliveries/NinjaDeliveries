import { useMemo, useState, useEffect } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import "../../style/ServiceDashboard.css";

// ================= CONFIG =================
const START_HOUR = 6;
const END_HOUR = 22;
const DEFAULT_CAPACITY = 5;
const DEFAULT_BUFFER = 15; // minutes

// ================= HELPERS =================
function generateTimeOptions() {
  const times = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const period = h >= 12 ? "PM" : "AM";
      const minute = m.toString().padStart(2, '0');
      times.push(`${hour12}:${minute} ${period}`);
    }
  }
  return times;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function timeToMinutes(timeStr) {
  const [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

// ================= MAIN COMPONENT =================
export default function Slots() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [bookings, setBookings] = useState({});
  const [companyOpen, setCompanyOpen] = useState(true);
  const [timeSlots, setTimeSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState("9:00 AM");
  const [newSlotEnd, setNewSlotEnd] = useState("10:00 AM");
  const [newSlotCapacity, setNewSlotCapacity] = useState(DEFAULT_CAPACITY);
  const [newSlotService, setNewSlotService] = useState("");
  const [newSlotWorker, setNewSlotWorker] = useState("");
  const [newSlotRecurrence, setNewSlotRecurrence] = useState("none");
  const [newSlotBuffer, setNewSlotBuffer] = useState(DEFAULT_BUFFER);
  const [newSlotPrice, setNewSlotPrice] = useState(0);
  
  // Holiday form states
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  
  // Filter states
  const [filterService, setFilterService] = useState("");
  const [filterWorker, setFilterWorker] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // Load all data
  useEffect(() => {
    loadAllData();
  }, [selectedDate]);

  const loadAllData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Load services
      const servicesQuery = query(
        collection(db, "service_services"),
        where("serviceId", "==", user.uid)
      );
      const servicesSnap = await getDocs(servicesQuery);
      setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Load workers
      const workersQuery = query(
        collection(db, "service_technicians"),
        where("serviceId", "==", user.uid)
      );
      const workersSnap = await getDocs(workersQuery);
      setWorkers(workersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Load slot configuration
      const configQuery = query(
        collection(db, "service_slot_config"),
        where("serviceId", "==", user.uid)
      );
      const configSnap = await getDocs(configQuery);
      
      if (!configSnap.empty) {
        const config = configSnap.docs[0].data();
        setCompanyOpen(config.isOpen || false);
        setTimeSlots(config.timeSlots || []);
        setHolidays(config.holidays || []);
      }

      // Load bookings for selected date
      const bookingsQuery = query(
        collection(db, "service_slot_bookings"),
        where("serviceId", "==", user.uid),
        where("date", "==", selectedDate)
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      
      const dayBookings = {};
      bookingsSnap.docs.forEach(doc => {
        const data = doc.data();
        dayBookings[data.slotId] = data.bookings || [];
      });
      
      setBookings(dayBookings);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSlotConfig = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const configDoc = doc(db, "service_slot_config", user.uid);
      await setDoc(configDoc, {
        serviceId: user.uid,
        isOpen: companyOpen,
        timeSlots: timeSlots,
        holidays: holidays,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving config:", error);
    }
  };

  const addTimeSlot = async () => {
    const startMinutes = timeToMinutes(newSlotStart);
    const endMinutes = timeToMinutes(newSlotEnd);
    
    if (endMinutes <= startMinutes) {
      alert("End time must be after start time");
      return;
    }

    // Check for overlapping slots (considering buffer time)
    const hasOverlap = timeSlots.some(slot => {
      const slotStart = timeToMinutes(slot.startTime) - (slot.bufferTime || 0);
      const slotEnd = timeToMinutes(slot.endTime) + (slot.bufferTime || 0);
      const newStart = startMinutes - newSlotBuffer;
      const newEnd = endMinutes + newSlotBuffer;
      return (newStart < slotEnd && newEnd > slotStart);
    });

    if (hasOverlap) {
      alert("This time slot conflicts with existing slots (including buffer time)");
      return;
    }

    const baseSlot = {
      startTime: newSlotStart,
      endTime: newSlotEnd,
      capacity: newSlotCapacity,
      serviceId: newSlotService || null,
      workerId: newSlotWorker || null,
      bufferTime: newSlotBuffer,
      price: newSlotPrice,
      isActive: true
    };

    let newSlots = [];

    if (newSlotRecurrence === "daily") {
      // Create slots for next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        newSlots.push({
          ...baseSlot,
          id: `${Date.now()}_${i}`,
          date: dateStr,
          recurrence: "daily"
        });
      }
    } else if (newSlotRecurrence === "weekly") {
      // Create slots for next 12 weeks (same day of week)
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setDate(date.getDate() + (i * 7));
        const dateStr = date.toISOString().split('T')[0];
        
        newSlots.push({
          ...baseSlot,
          id: `${Date.now()}_${i}`,
          date: dateStr,
          recurrence: "weekly"
        });
      }
    } else {
      // Single slot
      newSlots.push({
        ...baseSlot,
        id: Date.now().toString(),
        date: selectedDate,
        recurrence: "none"
      });
    }

    const updatedSlots = [...timeSlots, ...newSlots].sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    setTimeSlots(updatedSlots);
    setShowAddSlot(false);
    resetSlotForm();
    
    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      const configDoc = doc(db, "service_slot_config", user.uid);
      await setDoc(configDoc, {
        serviceId: user.uid,
        isOpen: companyOpen,
        timeSlots: updatedSlots,
        holidays: holidays,
        updatedAt: new Date()
      }, { merge: true });
    }
  };

  const resetSlotForm = () => {
    setNewSlotStart("9:00 AM");
    setNewSlotEnd("10:00 AM");
    setNewSlotCapacity(DEFAULT_CAPACITY);
    setNewSlotService("");
    setNewSlotWorker("");
    setNewSlotRecurrence("none");
    setNewSlotBuffer(DEFAULT_BUFFER);
    setNewSlotPrice(0);
  };

  const addHoliday = async () => {
    if (!holidayDate || !holidayName) {
      alert("Please fill in all holiday details");
      return;
    }

    const newHoliday = {
      id: Date.now().toString(),
      date: holidayDate,
      name: holidayName.trim(),
      createdAt: new Date()
    };

    const updatedHolidays = [...holidays, newHoliday];
    setHolidays(updatedHolidays);
    setShowHolidayForm(false);
    setHolidayDate("");
    setHolidayName("");
    await saveSlotConfig();
  };

  const deleteTimeSlot = async (slotId) => {
    if (window.confirm("Are you sure you want to delete this time slot?")) {
      const updatedSlots = timeSlots.filter(slot => slot.id !== slotId);
      setTimeSlots(updatedSlots);
      await saveSlotConfig();
    }
  };

  const deleteHoliday = async (holidayId) => {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      const updatedHolidays = holidays.filter(holiday => holiday.id !== holidayId);
      setHolidays(updatedHolidays);
      await saveSlotConfig();
    }
  };

  const toggleSlotStatus = async (slotId) => {
    const updatedSlots = timeSlots.map(slot => 
      slot.id === slotId ? { ...slot, isActive: !slot.isActive } : slot
    );
    setTimeSlots(updatedSlots);
    await saveSlotConfig();
  };

  const toggleCompanyStatus = async (status) => {
    setCompanyOpen(status);
    await saveSlotConfig();
  };

  // Filter slots based on current filters
  const filteredSlots = timeSlots.filter(slot => {
    if (filterService && slot.serviceId !== filterService) return false;
    if (filterWorker && slot.workerId !== filterWorker) return false;
    if (filterDate && slot.date !== filterDate) return false;
    return true;
  });

  // Check if date is holiday
  const isHoliday = (date) => {
    return holidays.some(holiday => holiday.date === date);
  };

  // Get service name
  const getServiceName = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : "All Services";
  };

  // Get worker name
  const getWorkerName = (workerId) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? worker.name : "Any Worker";
  };

  // Calculate revenue
  const calculateRevenue = () => {
    return Object.values(bookings).reduce((total, slotBookings) => {
      return total + slotBookings.reduce((slotTotal, booking) => {
        const slot = timeSlots.find(s => s.id === booking.slotId);
        return slotTotal + (slot?.price || 0);
      }, 0);
    }, 0);
  };

  if (loading) {
    return <div className="sd-main"><p>Loading slots...</p></div>;
  }

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Calendar / Slots Management</h1>
        <div className="sd-header-actions">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="sd-date-input"
          />
        </div>
      </div>

      {/* Company Status Card */}
      <div className="sd-card">
        <div className="sd-card-header">
          <h3>Business Status</h3>
          <div className="sd-status-indicator">
            Status: {companyOpen ? 
              <span className="sd-status-open">OPEN</span> : 
              <span className="sd-status-closed">CLOSED</span>
            }
          </div>
        </div>
        
        <div className="sd-control-buttons">
          <button 
            className={`sd-status-btn ${companyOpen ? 'active' : ''}`}
            onClick={() => toggleCompanyStatus(true)}
          >
            Open Business
          </button>
          <button 
            className={`sd-status-btn ${!companyOpen ? 'active' : ''}`}
            onClick={() => toggleCompanyStatus(false)}
          >
            Close Business
          </button>
        </div>
      </div>

      {/* Time Slots Management */}
      <div className="sd-card">
        <div className="sd-card-header">
          <h3>Time Slots</h3>
          <div className="sd-header-actions">
            <button 
              className="sd-primary-btn"
              onClick={() => setShowHolidayForm(true)}
            >
              + Add Holiday
            </button>
            <button 
              className="sd-primary-btn"
              onClick={() => setShowAddSlot(true)}
            >
              + Add Time Slot
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="sd-filters-section">
          <div className="sd-filter-row">
            <div className="sd-form-group">
              <label>Filter by Service</label>
              <select 
                value={filterService} 
                onChange={(e) => setFilterService(e.target.value)}
                className="sd-filter-select"
              >
                <option value="">All Services</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
            
            <div className="sd-form-group">
              <label>Filter by Worker</label>
              <select 
                value={filterWorker} 
                onChange={(e) => setFilterWorker(e.target.value)}
                className="sd-filter-select"
              >
                <option value="">All Workers</option>
                {workers.map(worker => (
                  <option key={worker.id} value={worker.id}>{worker.name}</option>
                ))}
              </select>
            </div>

            <div className="sd-form-group">
              <label>Filter by Date</label>
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)}
                className="sd-filter-select"
              />
            </div>
          </div>
        </div>

        {/* Holiday Form */}
        {showHolidayForm && (
          <div className="sd-add-slot-form">
            <h4>Add Holiday</h4>
            
            <div className="sd-slot-form-row">
              <div className="sd-form-group">
                <label>Holiday Date</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="sd-time-select"
                />
              </div>
              
              <div className="sd-form-group">
                <label>Holiday Name</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., Diwali, Christmas"
                  className="sd-time-select"
                />
              </div>
            </div>
            
            <div className="sd-slot-form-actions">
              <button 
                className="sd-cancel-btn"
                onClick={() => {
                  setShowHolidayForm(false);
                  setHolidayDate("");
                  setHolidayName("");
                }}
              >
                Cancel
              </button>
              <button 
                className="sd-save-btn"
                onClick={addHoliday}
              >
                Add Holiday
              </button>
            </div>
          </div>
        )}

        {/* Add Slot Form */}
        {showAddSlot && (
          <div className="sd-add-slot-form">
            <h4>Create New Time Slot</h4>
            
            <div className="sd-slot-form-row">
              <div className="sd-form-group">
                <label>Start Time</label>
                <select 
                  value={newSlotStart} 
                  onChange={(e) => setNewSlotStart(e.target.value)}
                  className="sd-time-select"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              
              <div className="sd-form-group">
                <label>End Time</label>
                <select 
                  value={newSlotEnd} 
                  onChange={(e) => setNewSlotEnd(e.target.value)}
                  className="sd-time-select"
                >
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              
              <div className="sd-form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  value={newSlotCapacity}
                  onChange={(e) => setNewSlotCapacity(Number(e.target.value))}
                  min="1"
                  max="20"
                  className="sd-capacity-input"
                />
              </div>
            </div>

            <div className="sd-slot-form-row">
              <div className="sd-form-group">
                <label>Service (Optional)</label>
                <select 
                  value={newSlotService} 
                  onChange={(e) => setNewSlotService(e.target.value)}
                  className="sd-time-select"
                >
                  <option value="">All Services</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="sd-form-group">
                <label>Assigned Worker (Optional)</label>
                <select 
                  value={newSlotWorker} 
                  onChange={(e) => setNewSlotWorker(e.target.value)}
                  className="sd-time-select"
                >
                  <option value="">Any Worker</option>
                  {workers.map(worker => (
                    <option key={worker.id} value={worker.id}>{worker.name}</option>
                  ))}
                </select>
              </div>

              <div className="sd-form-group">
                <label>Price (₹)</label>
                <input
                  type="number"
                  value={newSlotPrice}
                  onChange={(e) => setNewSlotPrice(Number(e.target.value))}
                  min="0"
                  className="sd-capacity-input"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="sd-slot-form-row">
              <div className="sd-form-group">
                <label>Recurrence</label>
                <select 
                  value={newSlotRecurrence} 
                  onChange={(e) => setNewSlotRecurrence(e.target.value)}
                  className="sd-time-select"
                >
                  <option value="none">One-time only</option>
                  <option value="daily">Daily (30 days)</option>
                  <option value="weekly">Weekly (12 weeks)</option>
                </select>
              </div>

              <div className="sd-form-group">
                <label>Buffer Time (minutes)</label>
                <input
                  type="number"
                  value={newSlotBuffer}
                  onChange={(e) => setNewSlotBuffer(Number(e.target.value))}
                  min="0"
                  max="60"
                  className="sd-capacity-input"
                />
              </div>
            </div>
            
            <div className="sd-slot-form-actions">
              <button 
                className="sd-cancel-btn"
                onClick={() => {
                  setShowAddSlot(false);
                  resetSlotForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="sd-save-btn"
                onClick={addTimeSlot}
              >
                Add Slot
              </button>
            </div>
          </div>
        )}

        {/* Slots List */}
        <div className="sd-slots-grid">
          {filteredSlots.length === 0 ? (
            <div className="sd-empty-slots">
              <p>No time slots found matching your filters.</p>
              <p>Add your first time slot to start accepting bookings.</p>
            </div>
          ) : (
            filteredSlots.map(slot => {
              const slotBookings = bookings[slot.id] || [];
              const isFullyBooked = slotBookings.length >= slot.capacity;
              const isSlotHoliday = isHoliday(slot.date || selectedDate);
              
              return (
                <div key={slot.id} className={`sd-slot-card ${!slot.isActive ? 'inactive' : ''} ${isSlotHoliday ? 'holiday' : ''}`}>
                  <div className="sd-slot-header">
                    <div className="sd-slot-time">
                      <strong>{slot.startTime} - {slot.endTime}</strong>
                      {slot.date && <div className="sd-slot-date">{slot.date}</div>}
                      {slot.recurrence !== "none" && (
                        <div className="sd-slot-recurrence">
                          {slot.recurrence === "daily" ? "🔄 Daily" : "📅 Weekly"}
                        </div>
                      )}
                    </div>
                    <div className="sd-slot-actions">
                      <button
                        className={`sd-toggle-btn ${slot.isActive ? 'active' : 'inactive'}`}
                        onClick={() => toggleSlotStatus(slot.id)}
                      >
                        {slot.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        className="sd-delete-slot-btn"
                        onClick={() => deleteTimeSlot(slot.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {/* Slot Details */}
                  <div className="sd-slot-details">
                    {slot.serviceId && (
                      <div className="sd-slot-service">
                        <span className="sd-badge normal">🔧 {getServiceName(slot.serviceId)}</span>
                      </div>
                    )}
                    {slot.workerId && (
                      <div className="sd-slot-worker">
                        <span className="sd-badge category">👤 {getWorkerName(slot.workerId)}</span>
                      </div>
                    )}
                    {slot.price > 0 && (
                      <div className="sd-slot-price">
                        <span className="sd-price-tag">₹{slot.price}</span>
                      </div>
                    )}
                    {slot.bufferTime > 0 && (
                      <div className="sd-slot-buffer">
                        <span className="sd-buffer-info">⏱️ {slot.bufferTime}min buffer</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="sd-slot-info">
                    <div className="sd-capacity-info">
                      <span className="sd-booking-count">
                        {slotBookings.length}/{slot.capacity} booked
                      </span>
                      <div className="sd-capacity-bar">
                        <div 
                          className="sd-capacity-fill"
                          style={{ 
                            width: `${(slotBookings.length / slot.capacity) * 100}%`,
                            backgroundColor: isFullyBooked ? '#ef4444' : '#22c55e'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="sd-slot-stats">
                      <span className="sd-availability-text">
                        {isSlotHoliday ? 'Holiday - Closed' :
                         slot.isActive ? 
                          (isFullyBooked ? 'Fully Booked' : `${slot.capacity - slotBookings.length} spots available`) : 
                          'Slot Inactive'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {slotBookings.length > 0 && (
                    <div className="sd-bookings-list">
                      <h5>Bookings:</h5>
                      {slotBookings.map(booking => (
                        <div key={booking.id} className="sd-booking-item">
                          <span>{booking.customerName}</span>
                          <span className="sd-booking-status">{booking.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Holidays Management */}
      {holidays.length > 0 && (
        <div className="sd-card">
          <div className="sd-card-header">
            <h3>Holidays & Closures</h3>
          </div>
          
          <div className="sd-holidays-grid">
            {holidays.map(holiday => (
              <div key={holiday.id} className="sd-holiday-card">
                <div className="sd-holiday-info">
                  <div className="sd-holiday-name">{holiday.name}</div>
                  <div className="sd-holiday-date">{holiday.date}</div>
                </div>
                <button
                  className="sd-delete-holiday-btn"
                  onClick={() => deleteHoliday(holiday.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics & Summary */}
      <div className="sd-info-grid">
        <div className="sd-info-card">
          <h4>Today's Analytics</h4>
          <div className="sd-summary-stats">
            <div className="sd-stat">
              <span className="sd-stat-number">{filteredSlots.length}</span>
              <span className="sd-stat-label">Active Slots</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-number">
                {Object.values(bookings).reduce((total, slotBookings) => total + slotBookings.length, 0)}
              </span>
              <span className="sd-stat-label">Total Bookings</span>
            </div>
            <div className="sd-stat">
              <span className="sd-stat-number">₹{calculateRevenue()}</span>
              <span className="sd-stat-label">Revenue</span>
            </div>
          </div>
        </div>
        
        <div className="sd-info-card">
          <h4>Slot Performance</h4>
          <div className="sd-performance-list">
            {filteredSlots.length === 0 ? (
              <p className="sd-empty-text">No slots configured</p>
            ) : (
              filteredSlots.slice(0, 5).map(slot => {
                const slotBookings = bookings[slot.id] || [];
                const utilizationRate = Math.round((slotBookings.length / slot.capacity) * 100);
                
                return (
                  <div key={slot.id} className="sd-performance-item">
                    <div className="sd-performance-info">
                      <span className="sd-performance-time">
                        {slot.startTime} - {slot.endTime}
                        {slot.serviceId && ` (${getServiceName(slot.serviceId)})`}
                      </span>
                      <span className="sd-performance-rate">{utilizationRate}% utilized</span>
                    </div>
                    <div className="sd-performance-bar">
                      <div 
                        className="sd-performance-fill"
                        style={{ 
                          width: `${utilizationRate}%`,
                          backgroundColor: utilizationRate >= 80 ? '#22c55e' : utilizationRate >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Business Insights */}
      <div className="sd-card">
        <h3>Business Insights & Analytics</h3>
        <div className="sd-insights-grid">
          <div className="sd-insight-card">
            <div className="sd-insight-icon">📊</div>
            <div className="sd-insight-content">
              <h5>Booking Rate</h5>
              <p>
                {filteredSlots.length > 0 ? 
                  `${Math.round((Object.values(bookings).reduce((total, slotBookings) => total + slotBookings.length, 0) / filteredSlots.reduce((total, slot) => total + slot.capacity, 0)) * 100)}%` : 
                  '0%'
                } of total capacity booked today
              </p>
            </div>
          </div>
          
          <div className="sd-insight-card">
            <div className="sd-insight-icon">⏰</div>
            <div className="sd-insight-content">
              <h5>Peak Hours</h5>
              <p>
                {filteredSlots.length > 0 ? 
                  (() => {
                    const mostBooked = filteredSlots.reduce((max, slot) => {
                      const bookingCount = (bookings[slot.id] || []).length;
                      return bookingCount > (bookings[max.id] || []).length ? slot : max;
                    }, filteredSlots[0]);
                    return `${mostBooked.startTime} - ${mostBooked.endTime}`;
                  })() :
                  'No data available'
                }
              </p>
            </div>
          </div>
          
          <div className="sd-insight-card">
            <div className="sd-insight-icon">�</div>
            <div className="sd-insight-content">
              <h5>Revenue Today</h5>
              <p>
                ₹{calculateRevenue()} from {Object.values(bookings).reduce((total, slotBookings) => total + slotBookings.length, 0)} bookings
              </p>
            </div>
          </div>

          <div className="sd-insight-card">
            <div className="sd-insight-icon">🎯</div>
            <div className="sd-insight-content">
              <h5>Service Distribution</h5>
              <p>
                {services.length > 0 ? 
                  `${filteredSlots.filter(slot => slot.serviceId).length} specialized slots, ${filteredSlots.filter(slot => !slot.serviceId).length} general slots` :
                  'All general service slots'
                }
              </p>
            </div>
          </div>

          <div className="sd-insight-card">
            <div className="sd-insight-icon">👥</div>
            <div className="sd-insight-content">
              <h5>Worker Utilization</h5>
              <p>
                {workers.length > 0 ? 
                  `${filteredSlots.filter(slot => slot.workerId).length} assigned slots across ${workers.length} workers` :
                  'No workers assigned to slots'
                }
              </p>
            </div>
          </div>
          
          <div className="sd-insight-card">
            <div className="sd-insight-icon">📈</div>
            <div className="sd-insight-content">
              <h5>Recommendations</h5>
              <p>
                {(() => {
                  const totalBookings = Object.values(bookings).reduce((total, slotBookings) => total + slotBookings.length, 0);
                  const totalCapacity = filteredSlots.reduce((total, slot) => total + slot.capacity, 0);
                  const utilizationRate = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;
                  
                  if (utilizationRate > 80) return "Consider adding more slots - high demand!";
                  if (utilizationRate < 30) return "Consider reducing slots or increasing marketing";
                  return "Good balance of supply and demand";
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp, 
} from "firebase/firestore";
import "../../style/ServiceDashboard.css";
import "./AssignWorkerModal.css";

const AssignWorkerModal = ({ booking, categories = [], onClose, onAssigned }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showWorkerDetails, setShowWorkerDetails] = useState(false);
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState(null);
  
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : "";
  };

  // Fetch services to understand service-category relationship,,,,
  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_services"),
        where("companyId", "==", user.uid)
      );
//he he
      const snap = await getDocs(q);
      const servicesList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      console.log("All services:", servicesList);
      return servicesList;
    } catch (err) {
      console.error("Fetch services error:", err);
      return [];
    }
  };


  // Check worker availability for the booking time slot
  const checkWorkerAvailability = async (workerId, bookingDate, bookingTime) => {
    try {
      const user = auth.currentUser;
      if (!user) return { available: false, reason: "No user" };

      console.log(`🔍 Checking availability for worker ${workerId} on ${bookingDate} at ${bookingTime}`);

      // Query for bookings on the same date and time with the same worker
      const q = query(
        collection(db, "service_bookings"),
        where("companyId", "==", user.uid),
        where("workerId", "==", workerId),
        where("date", "==", bookingDate),
        where("time", "==", bookingTime),
        where("status", "in", ["assigned", "started", "in-progress"]) // Only check active bookings
      );

      const snap = await getDocs(q);
      
      console.log(`📊 Found ${snap.size} conflicting bookings for worker ${workerId}`);
      
      if (snap.size > 0) {
        // Worker is already assigned to another booking at this time
        const conflictingBooking = snap.docs[0].data();
        console.log(`⚠️ Worker ${workerId} is busy:`, conflictingBooking);
        
        return {
          available: false,
          reason: "busy",
          conflictingService: conflictingBooking.workName || conflictingBooking.serviceName || "Unknown Service",
          conflictingCustomer: conflictingBooking.customerName || "Unknown Customer",
          conflictingBookingId: snap.docs[0].id
        };
      }

      console.log(`✅ Worker ${workerId} is available`);
      return { available: true, reason: "available" };
    } catch (error) {
      console.error("Error checking worker availability:", error);
      return { available: false, reason: "error" };
    }
  };
  // 🔹 Fetch workers - filter by booking service category
  const fetchWorkers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // First fetch services to understand service-category relationship
      const servicesList = await fetchServices();

      const q = query(
        collection(db, "service_workers"),
        where("companyId", "==", user.uid),
        where("isActive", "==", true) // Only get active workers
      );

      const snap = await getDocs(q);
      const allWorkers = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      console.log("All workers:", allWorkers);
      console.log("Booking data for worker filtering:", {
        serviceName: booking.serviceName,
        workName: booking.workName,
        serviceId: booking.serviceId,
        workId: booking.workId,
        subServiceId: booking.subServiceId,
        date: booking.date,
        time: booking.time
      });

      // Try to find the service that matches the booking
      let bookingService = null;
      let bookingCategoryId = null;

      // Method 1: Try to find service by name match
      if (booking.workName) {
        bookingService = servicesList.find(service => 
          service.name === booking.workName || 
          service.title === booking.workName
        );
      }

      // Method 2: Try to find service by ID if available
      if (!bookingService && (booking.serviceId || booking.workId || booking.subServiceId)) {
        const serviceId = booking.serviceId || booking.workId || booking.subServiceId;
        bookingService = servicesList.find(service => service.id === serviceId);
      }

      // Method 3: Try to find service by category name match
      if (!bookingService && booking.serviceName) {
        // Find services that belong to a category with matching name
        const matchingCategory = categories.find(cat => cat.name === booking.serviceName);
        if (matchingCategory) {
          bookingCategoryId = matchingCategory.id;
          console.log(`Found category ID ${bookingCategoryId} for service name "${booking.serviceName}"`);
        }
      }

      if (bookingService) {
        bookingCategoryId = bookingService.categoryId || bookingService.category;
        console.log(`Found booking service:`, bookingService);
        console.log(`Service belongs to category ID: ${bookingCategoryId}`);
      }

      // Filter workers by category or assigned services
      let filteredWorkers = allWorkers;
      
      if (bookingCategoryId) {
        console.log(`Filtering workers for category ID: ${bookingCategoryId}`);
        
        // Filter workers by category or assigned services
        filteredWorkers = allWorkers.filter(worker => {
          // Check if worker belongs to the category (new multiple categories or old single role)
          const workerCategories = worker.assignedCategories || (worker.role ? [worker.role] : []);
          const workerBelongsToCategory = workerCategories.includes(bookingCategoryId);
          
          // Check if worker has the specific service assigned
          const workerHasService = bookingService && worker.assignedServices && 
                                  worker.assignedServices.includes(bookingService.id);
          
          const isMatch = workerBelongsToCategory || workerHasService;
          
          console.log(`Worker ${worker.name}: categories=[${workerCategories.join(',')}], belongsToCategory=${workerBelongsToCategory}, hasService=${workerHasService}, match=${isMatch}`);
          return isMatch;
        });
        
        console.log(`Found ${filteredWorkers.length} workers for category/service`);
      } else if (bookingService) {
        // If we found the service but no category, filter by assigned services
        console.log(`Filtering workers by assigned service: ${bookingService.id}`);
        filteredWorkers = allWorkers.filter(worker => 
          worker.assignedServices && worker.assignedServices.includes(bookingService.id)
        );
      }
      
      // If no workers found, show all workers as fallback
      if (filteredWorkers.length === 0) {
        console.log("No workers found for specific criteria, showing all workers");
        filteredWorkers = allWorkers;
      }

      // Check availability for each worker
      console.log(`🔍 Checking availability for ${filteredWorkers.length} workers...`);
      const workersWithAvailability = await Promise.all(
        filteredWorkers.map(async (worker) => {
          const availability = await checkWorkerAvailability(worker.id, booking.date, booking.time);
          console.log(`👤 Worker ${worker.name} (${worker.id}):`, availability);
          return {
            ...worker,
            availability: availability
          };
        })
      );

      console.log("Workers with availability:", workersWithAvailability);
      setWorkers(workersWithAvailability);
    } catch (err) {
      console.error("Fetch workers error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Auto-assign best available worker
  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      const availableWorkers = workers.filter(w => w.availability?.available);
      
      if (availableWorkers.length === 0) {
        alert("No workers available for auto-assignment");
        return;
      }

      // Auto-assignment logic: Priority order
      // 1. Worker with specific service assignment
      // 2. Worker with most completed jobs (experience)
      // 3. Worker with least current assignments (load balancing)
      
      let bestWorker = null;
      
      // Priority 1: Find worker with specific service assignment
      const serviceSpecificWorkers = availableWorkers.filter(w => 
        w.assignedServices && booking.serviceId && 
        w.assignedServices.includes(booking.serviceId)
      );
      
      if (serviceSpecificWorkers.length > 0) {
        // Among service-specific workers, pick the one with most experience
        bestWorker = serviceSpecificWorkers.reduce((best, current) => 
          (current.completedJobs || 0) > (best.completedJobs || 0) ? current : best
        );
        console.log("🎯 Auto-assigned based on service specialization:", bestWorker.name);
      } else {
        // Priority 2: Pick worker with most completed jobs
        bestWorker = availableWorkers.reduce((best, current) => 
          (current.completedJobs || 0) > (best.completedJobs || 0) ? current : best
        );
        console.log("🎯 Auto-assigned based on experience:", bestWorker.name);
      }

      if (bestWorker) {
        setSelectedWorker(bestWorker.id);
        
        // Auto-confirm assignment after 2 seconds
        setTimeout(async () => {
          await assignWorker(bestWorker);
        }, 2000);
      }
    } catch (error) {
      console.error("Auto-assignment error:", error);
      alert("Failed to auto-assign worker");
    } finally {
      setAutoAssigning(false);
    }
  };

  // 🔹 Show worker details modal
  const showWorkerDetailsModal = (worker) => {
    setSelectedWorkerDetails(worker);
    setShowWorkerDetails(true);
  };

  // 🔹 Assign worker (extracted for reuse)
  const assignWorker = async (worker = null) => {
    const workerToAssign = worker || workers.find((w) => w.id === selectedWorker);
    if (!workerToAssign) return;

    // Check if worker is available before assigning
    if (!workerToAssign.availability?.available) {
      if (workerToAssign.availability?.reason === 'busy') {
        alert(`Worker is busy with another booking: ${workerToAssign.availability.conflictingService} for ${workerToAssign.availability.conflictingCustomer}`);
      } else {
        alert("Selected worker is not available for this time slot");
      }
      return;
    }

    try {
      const ref = doc(db, "service_bookings", booking.id);

      await updateDoc(ref, {
        workerId: workerToAssign.id,
        workerName: workerToAssign.name,
        status: "assigned",
        assignedAt: serverTimestamp(),
        assignmentMethod: worker ? "auto" : "manual", // Track assignment method
      });

      onAssigned(); // refresh bookings
      onClose();
    } catch (err) {
      console.error("Assign worker error:", err);
      alert("Failed to assign worker");
    }
  };

  // 🔹 Manual assign handler
  const handleAssign = async () => {
    if (booking.status === "assigned"){
      alert("Worker already assigned to this booking");
      return;
    }
    if (!selectedWorker) {
      alert("Please select a worker");
      return;
    }

    await assignWorker();
  };

  useEffect(() => {
    // Debug: Log booking data to see service/category fields
    console.log("AssignWorkerModal - Booking data:", {
      serviceName: booking?.serviceName,
      workName: booking?.workName,
      serviceId: booking?.serviceId,
      workId: booking?.workId,
      subServiceId: booking?.subServiceId,
      allFields: booking ? Object.keys(booking) : []
    });
    fetchWorkers();
  }, []);
  if (!booking){
    return null;
  }

  return (
    <div className="sd-modal-backdrop">
      <div className="sd-modal assign-worker-modal">
        <div className="sd-modal-header">
          <div>
            <h2>Assign Worker</h2>
            <p className="sd-modal-subtitle">Select an available worker for this booking</p>
          </div>
          <button className="sd-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sd-modal-content">
          {/* Booking Info Card */}
          <div className="booking-info-card">
            <div className="info-row">
              <span className="info-label">👤 Customer:</span>
              <span className="info-value">{booking.customerName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">🔧 Service:</span>
              <span className="info-value">{booking.workName || booking.serviceName || "Service Request"}</span>
            </div>
            {booking.serviceName && booking.workName && booking.serviceName !== booking.workName && (
              <div className="info-row">
                <span className="info-label">📂 Category:</span>
                <span className="info-value">{booking.serviceName}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">📅 Date & Time:</span>
              <span className="info-value">{booking.date} • {booking.time}</span>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading workers...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👷</div>
              <h3>No Workers Available</h3>
              <p>No workers found for this service</p>
              {booking.serviceName && (
                <small>Looking for workers in: {booking.serviceName}</small>
              )}
            </div>
          ) : (
            <>
              <div className="worker-stats">
                <div className="stat-badge">
                  <span className="stat-number">{workers.length}</span>
                  <span className="stat-label">Total Workers</span>
                </div>
                <div className="stat-badge available">
                  <span className="stat-number">{workers.filter(w => w.availability?.available).length}</span>
                  <span className="stat-label">Available</span>
                </div>
                <div className="stat-badge busy">
                  <span className="stat-number">{workers.filter(w => !w.availability?.available).length}</span>
                  <span className="stat-label">Busy</span>
                </div>
              </div>

              {/* Auto-assign button */}
              {workers.filter(w => w.availability?.available).length > 0 && (
                <div className="auto-assign-section">
                  <button 
                    className="auto-assign-btn"
                    onClick={handleAutoAssign}
                    disabled={autoAssigning}
                  >
                    {autoAssigning ? (
                      <>
                        <div className="spinner-small"></div>
                        Auto-assigning...
                      </>
                    ) : (
                      <>
                        🤖 Auto-assign Best Worker
                      </>
                    )}
                  </button>
                  <p className="auto-assign-hint">
                    Automatically selects the best available worker based on experience and specialization
                  </p>
                </div>
              )}

              <div className="sd-form-group">
                <label>Select Worker</label>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="worker-select"
                >
                  <option value="">Choose a worker...</option>
                  {workers.map((w) => (
                    <option 
                      key={w.id} 
                      value={w.id}
                      disabled={!w.availability?.available}
                    >
                      {w.name}
                      {(w.assignedCategories && w.assignedCategories.length > 0) ? 
                        ` (${w.assignedCategories.map(catId => getCategoryName(catId)).join(", ")})` :
                        w.role ? ` (${getCategoryName(w.role)})` : ""
                      }
                      {w.specialization ? ` - ${w.specialization}` : ""}
                      {!w.availability?.available && w.availability?.reason === 'busy' ? 
                        ` - BUSY` : 
                        !w.availability?.available ? ' - NOT AVAILABLE' : ' ✓'
                      }
                      {w.completedJobs ? ` (${w.completedJobs} jobs)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Worker Availability Status */}
              {selectedWorker && (
                <div className={`availability-alert ${
                  workers.find(w => w.id === selectedWorker)?.availability?.available ? 'success' : 
                  workers.find(w => w.id === selectedWorker)?.availability?.reason === 'busy' ? 'warning' : 'error'
                }`}>
                  {(() => {
                    const worker = workers.find(w => w.id === selectedWorker);
                    if (!worker) return null;
                    
                    if (worker.availability?.available) {
                      return (
                        <div className="alert-content">
                          <span className="alert-icon">✅</span>
                          <div>
                            <strong>{worker.name}</strong> is available for this time slot
                          </div>
                        </div>
                      );
                    } else if (worker.availability?.reason === 'busy') {
                      return (
                        <div className="alert-content">
                          <span className="alert-icon">⚠️</span>
                          <div>
                            <strong>{worker.name}</strong> is busy with another booking
                            <div className="conflict-details">
                              📋 {worker.availability.conflictingService} for {worker.availability.conflictingCustomer}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="alert-content">
                          <span className="alert-icon">❌</span>
                          <div>
                            <strong>{worker.name}</strong> is not available for this time slot
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Worker List with Details */}
              <div className="worker-list-section">
                <h4>Available Workers ({workers.filter(w => w.availability?.available).length})</h4>
                <div className="worker-cards">
                  {workers.filter(w => w.availability?.available).map((worker) => (
                    <div 
                      key={worker.id} 
                      className={`worker-card ${selectedWorker === worker.id ? 'selected' : ''}`}
                      onClick={() => setSelectedWorker(worker.id)}
                    >
                      <div className="worker-info">
                        <div className="worker-name">
                          <strong>{worker.name}</strong>
                          <span className="available-badge">✓ Available</span>
                        </div>
                        <div className="worker-details">
                          <span className="worker-phone">📞 {worker.phone}</span>
                          <span className="worker-experience">🏆 {worker.completedJobs || 0} jobs completed</span>
                        </div>
                        <div className="worker-skills">
                          {(worker.assignedCategories && worker.assignedCategories.length > 0) ? 
                            worker.assignedCategories.map(catId => getCategoryName(catId)).join(", ") :
                            worker.role ? getCategoryName(worker.role) : "General"
                          }
                          {worker.specialization && <span className="specialization"> • {worker.specialization}</span>}
                        </div>
                      </div>
                      <button 
                        className="worker-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          showWorkerDetailsModal(worker);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Worker Details Modal */}
        {showWorkerDetails && selectedWorkerDetails && (
          <div className="worker-details-modal">
            <div className="worker-details-content">
              <div className="worker-details-header">
                <h3>{selectedWorkerDetails.name}</h3>
                <button onClick={() => setShowWorkerDetails(false)}>×</button>
              </div>
              <div className="worker-details-body">
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{selectedWorkerDetails.phone}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Experience:</span>
                  <span className="detail-value">{selectedWorkerDetails.completedJobs || 0} jobs completed</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Categories:</span>
                  <span className="detail-value">
                    {(selectedWorkerDetails.assignedCategories && selectedWorkerDetails.assignedCategories.length > 0) ? 
                      selectedWorkerDetails.assignedCategories.map(catId => getCategoryName(catId)).join(", ") :
                      selectedWorkerDetails.role ? getCategoryName(selectedWorkerDetails.role) : "General"
                    }
                  </span>
                </div>
                {selectedWorkerDetails.specialization && (
                  <div className="detail-row">
                    <span className="detail-label">Specialization:</span>
                    <span className="detail-value">{selectedWorkerDetails.specialization}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">
                    {selectedWorkerDetails.availability?.available ? 
                      <span className="status-available">✅ Available</span> : 
                      <span className="status-busy">⚠️ Busy</span>
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sd-modal-actions">
          <button className="sd-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          {workers.filter(w => w.availability?.available).length > 0 && (
            <button 
              className="sd-save-btn auto-assign-quick" 
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              style={{ marginRight: '8px' }}
            >
              {autoAssigning ? 'Auto-assigning...' : '🤖 Auto-assign'}
            </button>
          )}
          <button 
            className="sd-save-btn" 
            onClick={handleAssign}
            disabled={!selectedWorker || booking.status === "assigned" || (selectedWorker && !workers.find(w => w.id === selectedWorker)?.availability?.available)}
          >
            {!selectedWorker ? 'Select Worker' :
             booking.status === "assigned" ? 'Already Assigned' :
             selectedWorker && !workers.find(w => w.id === selectedWorker)?.availability?.available ? 'Worker Not Available' :
             'Assign Worker'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignWorkerModal;
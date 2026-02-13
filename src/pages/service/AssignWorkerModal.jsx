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

const AssignWorkerModal = ({ booking, categories = [], onClose, onAssigned }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [loading, setLoading] = useState(true);
  
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

  // 🔹 Assign worker
  const handleAssign = async () => {
    if (booking.status === "assigned"){
      alert("Worker already assigned to this booking");
      return;
    }
    if (!selectedWorker) {
      alert("Please select a worker");
      return;
    }

    const worker = workers.find((w) => w.id === selectedWorker);
    if (!worker) return;

    // Check if worker is available before assigning
    if (!worker.availability?.available) {
      if (worker.availability?.reason === 'busy') {
        alert(`Worker is busy with another booking: ${worker.availability.conflictingService} for ${worker.availability.conflictingCustomer}`);
      } else {
        alert("Selected worker is not available for this time slot");
      }
      return;
    }

    try {
      const ref = doc(db, "service_bookings", booking.id);

      await updateDoc(ref, {
        workerId: worker.id,
        workerName: worker.name,
        status: "assigned",
        assignedAt: serverTimestamp(),
      });

      onAssigned(); // refresh bookings
      onClose();
    } catch (err) {
      console.error("Assign worker error:", err);
      alert("Failed to assign worker");
    }
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
      <div className="sd-modal">

        <h2>Assign Worker</h2>

        {/* Booking Info */}
        <div className="sd-info-box">
          <p><strong>Customer:</strong> {booking.customerName}</p>
          <p><strong>Service:</strong> {booking.workName || booking.serviceName || "Service Request"}</p>
          {booking.serviceName && booking.workName && booking.serviceName !== booking.workName && (
            <p><strong>Category:</strong> {booking.serviceName}</p>
          )}
          <p><strong>Date:</strong> {booking.date} • {booking.time}</p>
        </div>

        {loading ? (
          <p>Loading workers...</p>
        ) : workers.length === 0 ? (
          <div className="no-workers-message">
            <p>No workers available for this service</p>
            {booking.serviceName && (
              <small>Looking for workers in: {booking.serviceName}</small>
            )}
          </div>
        ) : (
          <>
            <div className="worker-filter-info">
              <small>
                Showing workers for: {booking.serviceName} - {booking.workName} ({workers.length} total, {workers.filter(w => w.availability?.available).length} available)
              </small>
            </div>
            <select
              className="sd-select"
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
            >
              <option value="">Select Worker</option>
              
                {workers.map((w) => (
                  <option 
                    key={w.id} 
                    value={w.id}
                    disabled={!w.availability?.available}
                    style={{
                      color: !w.availability?.available ? '#9ca3af' : 'inherit',
                      fontStyle: !w.availability?.available ? 'italic' : 'normal'
                    }}
                  >
                    {w.name}
                    {(w.assignedCategories && w.assignedCategories.length > 0) ? 
                      ` (${w.assignedCategories.map(catId => getCategoryName(catId)).join(", ")})` :
                      w.role ? ` (${getCategoryName(w.role)})` : ""
                    }
                    {w.specialization ? ` - ${w.specialization}` : ""}
                    {!w.availability?.available && w.availability?.reason === 'busy' ? 
                      ` - BUSY (${w.availability.conflictingService})` : 
                      !w.availability?.available ? ' - NOT AVAILABLE' : ' - AVAILABLE'
                    }
                    </option>
              ))}
            </select>

            {/* Worker Availability Status */}
            {selectedWorker && (
              <div className={`worker-availability-info ${
                workers.find(w => w.id === selectedWorker)?.availability?.available ? 'available' : 
                workers.find(w => w.id === selectedWorker)?.availability?.reason === 'busy' ? 'busy' : 'unavailable'
              }`}>
                {(() => {
                  const worker = workers.find(w => w.id === selectedWorker);
                  if (!worker) return null;
                  
                  if (worker.availability?.available) {
                    return (
                      <>
                        ✅ <strong>{worker.name}</strong> is available for this time slot
                      </>
                    );
                  } else if (worker.availability?.reason === 'busy') {
                    return (
                      <>
                        ⚠️ <strong>{worker.name}</strong> is busy with another booking: 
                        <br />
                        📋 {worker.availability.conflictingService} for {worker.availability.conflictingCustomer}
                      </>
                    );
                  } else {
                    return (
                      <>
                        ❌ <strong>{worker.name}</strong> is not available for this time slot
                      </>
                    );
                  }
                })()}
              </div>
            )}
          </>
        )}

        <div className="sd-modal-actions">
          <button className="sd-secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
          className="sd-primary-btn" 
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
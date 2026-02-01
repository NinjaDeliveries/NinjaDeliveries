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
  const [services, setServices] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [loading, setLoading] = useState(true);
  
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : "";
  };

  // Fetch services to understand service-category relationship
  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_services"),
        where("companyId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const servicesList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setServices(servicesList);
      console.log("All services:", servicesList);
      return servicesList;
    } catch (err) {
      console.error("Fetch services error:", err);
      return [];
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
        subServiceId: booking.subServiceId
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

      setWorkers(filteredWorkers);
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
                Showing workers for: {booking.serviceName} - {booking.workName} ({workers.length} available)
              </small>
            </div>
            <select
              className="sd-select"
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
            >
              <option value="">Select Worker</option>
              
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {(w.assignedCategories && w.assignedCategories.length > 0) ? 
                      ` (${w.assignedCategories.map(catId => getCategoryName(catId)).join(", ")})` :
                      w.role ? ` (${getCategoryName(w.role)})` : ""
                    }
                    {w.specialization ? ` - ${w.specialization}` : ""}
                    </option>
              ))}
            </select>
          </>
        )}

        <div className="sd-modal-actions">
          <button className="sd-secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button 
          className="sd-primary-btn" 
          onClick={handleAssign}
          disabled={!selectedWorker || booking.status === "assigned"}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignWorkerModal;
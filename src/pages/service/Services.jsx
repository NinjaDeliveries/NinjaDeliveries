import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import AddServiceModal from "./AddServiceModal";
import "../../style/ServiceDashboard.css";

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const fetchServices = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "service_services"),
        where("serviceId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setServices(list);
    } catch (err) {
      console.error("Fetch services error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className="sd-main">
      <div className="sd-header">
        <h1>Services</h1>
        <button className="sd-primary-btn" onClick={() => setOpenModal(true)}>
          + Add Service
        </button>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : services.length === 0 ? (
        <p>No services created yet.</p>
      ) : (
        <div className="sd-table">
          {services.map(service => (
            <div key={service.id} className="sd-service-card">
              <div>
                <h3>{service.name}</h3>
                <span className={`sd-badge ${service.type}`}>
                  {service.type.toUpperCase()}
                </span>
              </div>

              {service.type === "normal" && (
                <p>₹{service.price} ({service.priceUnit})</p>
              )}

              {service.type === "package" && (
                <p>{service.packages.length} package options</p>
              )}
            </div>
          ))}
        </div>
      )}

      {openModal && (
        <AddServiceModal
          onClose={() => setOpenModal(false)}
          onSaved={fetchServices}
        />
      )}
    </div>
  );
};

export default Services;
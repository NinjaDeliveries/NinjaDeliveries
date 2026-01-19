import { useEffect, useState } from "react";
import { db } from "../../context/Firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
deleteDoc,
  addDoc,
} from "firebase/firestore";

const ServiceManagement = () => {
  // ================= STATES =================
  const [services, setServices] = useState([]);
  const [subServices, setSubServices] = useState([]);
  const [expandedService, setExpandedService] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState(null);
  const [editingSub, setEditingSub] = useState(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    active: true,
  });

  // ================= FETCH SERVICES =================
const fetchServices = async () => {
  const snap = await getDocs(collection(db, "services"));
  const list = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  setServices(list);
  setLoading(false);
};
  useEffect(() => {
  fetchServices();
}, []);

  // ================= FETCH SUB SERVICES =================
  const fetchSubServices = async (serviceId) => {
    const snap = await getDocs(
      collection(db, "services", serviceId, "subServices")
    );

    setSubServices(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );
  };

  // ================= TOGGLE SERVICE =================
  const toggleService = async (id, currentStatus) => {
    try {
      setServices((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, active: !currentStatus } : s
        )
      );

      await updateDoc(doc(db, "services", id), {
        active: !currentStatus,
      });
    } catch (err) {
      console.error("Failed to update service:", err);
    }
  };

  // ================= MODAL HELPERS =================
  const openAddModal = (serviceId) => {
    setCurrentServiceId(serviceId);
    setEditingSub(null);
    setForm({ name: "", price: "", active: true });
    setShowModal(true);
  };

  const openEditModal = (serviceId, sub) => {
    setCurrentServiceId(serviceId);
    setEditingSub(sub);
    setForm({
      name: sub.name,
      price: sub.price,
      active: sub.active,
    });
    setShowModal(true);
  };

  // ================= SAVE SUB SERVICE =================
const saveSubService = async () => {
  if (!form.name || !form.price) return;

  if (editingSub) {
    await updateDoc(
      doc(db, "services", currentServiceId, "subServices", editingSub.id),
      {
        name: form.name,
        price: Number(form.price),
        active: form.active,
      }
    );
  } else {
    await addDoc(
      collection(db, "services", currentServiceId, "subServices"),
      {
        name: form.name,
        price: Number(form.price),
        active: form.active,
        createdAt: new Date(),
      }
    );
  }

  setShowModal(false);

  // 🔥 THESE TWO LINES ARE MUST
  await fetchSubServices(currentServiceId);
  await fetchServices();
};

const deleteSubService = async () => {
  if (!editingSub || !currentServiceId) return;

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this sub-service?"
  );
  if (!confirmDelete) return;

  await deleteDoc(
    doc(
      db,
      "services",
      currentServiceId,
      "subServices",
      editingSub.id
    )
  );

  setShowModal(false);
  setEditingSub(null);
  fetchSubServices(currentServiceId);
};


  if (loading) return <div>Loading services...</div>;

  // ================= RENDER =================
  return (
    <div className="sd-page">
      <h2 className="sd-page-title">Service Management</h2>

      <div className="sd-list">
        {services.map((service) => (
          <div key={service.id} className="sd-list-card">
<div className="sd-list-info">
  <div
    onClick={() => {
      setExpandedService(
        expandedService === service.id ? null : service.id
      );
      fetchSubServices(service.id);
    }}
    style={{ cursor: "pointer" }}
  >
    <h3>{service.name}</h3>
    <p>Base Price: ₹{service.basePrice}</p>
  </div>

  <span
    className={`sd-badge ${
      service.active ? "sd-badge-active" : "sd-badge-inactive"
    }`}
  >
    {service.active ? "Active" : "Disabled"}
  </span>
</div>


            <button
              className={`sd-action-btn ${
                service.active ? "danger" : "success"
              }`}
              onClick={() =>
                toggleService(service.id, service.active)
              }
            >
              {service.active ? "Disable" : "Enable"}
            </button>

            {expandedService === service.id && (
              <div className="sd-sub-list">
                <button
                  className="sd-action-btn success"
                  onClick={() => openAddModal(service.id)}
                >
                  + Add Sub-Service
                </button>

                {subServices.map((sub) => (
                  <div key={sub.id} className="sd-sub-card">
                    <div>
                      <strong>{sub.name}</strong>
                      <div>₹{sub.price}</div>
                    </div>

                    <button
                      className="sd-action-btn"
                      onClick={() =>
                        openEditModal(service.id, sub)
                      }
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal">
            <h3>
              {editingSub
                ? "Edit Sub-Service"
                : "Add Sub-Service"}
            </h3>

            <input
              placeholder="Sub-service name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: e.target.value })
              }
            />

            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({
                    ...form,
                    active: e.target.checked,
                  })
                }
              />
              Active
            </label>

           <div className="sd-modal-actions">
  {editingSub && (
    <button
      className="sd-btn-danger"
      onClick={deleteSubService}
    >
      Delete
    </button>
  )}

  <button onClick={() => setShowModal(false)}>
    Cancel
  </button>

  <button onClick={saveSubService}>
    Save
  </button>
</div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import { db } from "../../context/Firebase";

export default function BannerManagement() {
  const auth = getAuth();
  const user = auth.currentUser;

  const emptyForm = {
    imageUrl: "",
    category: "",
    service: "",
    oldPrice: "",
    newPrice: "",
    description: "",
    notice: "",
  };

  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const discountAmount =
    form.oldPrice && form.newPrice
      ? Number(form.oldPrice) - Number(form.newPrice)
      : 0;

  const discountPercent =
    discountAmount > 0 && Number(form.oldPrice) > 0
      ? Math.round((discountAmount / Number(form.oldPrice)) * 100)
      : 0;

  const fetchBanners = async () => {
    if (!user) return;

    const q = query(
      collection(db, "banners"),
      where("companyId", "==", user.uid)
    );

    const snap = await getDocs(q);
    setBanners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchBanners();
  }, [user]);

  const saveBanner = async () => {
    if (!form.imageUrl || !form.category || !form.service) {
      alert("Image, category & service are required");
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      discountAmount,
      discountPercent,
      companyId: user.uid,
      updatedAt: serverTimestamp(),
    };

    if (editingId) {
      await updateDoc(doc(db, "banners", editingId), payload);
    } else {
      await addDoc(collection(db, "banners"), {
        ...payload,
        active: true,
        createdAt: serverTimestamp(),
      });
    }

    setForm(emptyForm);
    setEditingId(null);
    setLoading(false);
    fetchBanners();
  };

  const editBanner = (b) => {
    setForm({
      imageUrl: b.imageUrl,
      category: b.category,
      service: b.service,
      oldPrice: b.oldPrice,
      newPrice: b.newPrice,
      description: b.description,
      notice: b.notice,
    });
    setEditingId(b.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    await deleteDoc(doc(db, "banners", id));
    fetchBanners();
  };

  const toggleActive = async (b) => {
    await updateDoc(doc(db, "banners", b.id), { active: !b.active });
    fetchBanners();
  };

  return (
    <div style={styles.wrapper}>
      <h2>🎯 Banner Management</h2>

      {/* FORM */}
      <div style={styles.formCard}>
        <h3>{editingId ? "Edit Banner" : "Create New Banner"}</h3>

        <div style={styles.grid}>
          <input placeholder="Banner Image URL" value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />

          <input placeholder="Category" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />

          <input placeholder="Service Name" value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })} />

          <input type="number" placeholder="Original Price" value={form.oldPrice}
            onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} />

          <input type="number" placeholder="Offer Price" value={form.newPrice}
            onChange={(e) => setForm({ ...form, newPrice: e.target.value })} />

          <input placeholder="Short description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <input placeholder="Company notice" value={form.notice}
            onChange={(e) => setForm({ ...form, notice: e.target.value })} />
        </div>

        <div style={styles.discountBox}>
          Discount: ₹{discountAmount} ({discountPercent}% OFF)
        </div>

        {form.imageUrl && (
          <img src={form.imageUrl} alt="preview" style={styles.previewImg} />
        )}

        <button onClick={saveBanner} style={styles.saveBtn} disabled={loading}>
          {loading ? "Saving..." : editingId ? "Update Banner" : "Add Banner"}
        </button>

        {editingId && (
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
            }}
            style={styles.cancelBtn}
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* LIST */}
      <div style={styles.list}>
        {banners.map((b) => (
          <div key={b.id} style={styles.card}>
            <img src={b.imageUrl} style={styles.cardImg} alt="" />

            <div style={styles.cardBody}>
              <h4>{b.service}</h4>
              <small>{b.category}</small>

              <p>{b.description}</p>
              <p style={{ fontSize: 12, color: "#666" }}>{b.notice}</p>

              <p>
                <del>₹{b.oldPrice}</del> <b>₹{b.newPrice}</b>
              </p>

              <span style={styles.discountTag}>
                Save ₹{b.discountAmount} ({b.discountPercent}% OFF)
              </span>

              <div style={styles.actions}>
                <button onClick={() => editBanner(b)} style={styles.editBtn}>Edit</button>
                <button onClick={() => deleteBanner(b.id)} style={styles.deleteBtn}>Delete</button>
                <button onClick={() => toggleActive(b)} style={styles.toggleBtn}>
                  {b.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  wrapper: { padding: 20 },

  formCard: {
    background: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginBottom: 10,
  },

  discountBox: {
    margin: "10px 0",
    fontWeight: "bold",
    color: "green",
  },

  previewImg: {
    width: 220,
    height: 120,
    objectFit: "cover",
    borderRadius: 8,
    margin: "10px 0",
    border: "1px solid #ddd",
  },

  saveBtn: {
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff",
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginRight: 10,
  },

  cancelBtn: {
    background: "#e5e7eb",
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },

  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
    gap: 18,
  },

  card: {
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },

  cardImg: {
    width: "100%",
    height: 160,
    objectFit: "cover",
  },

  cardBody: {
    padding: 12,
  },

  discountTag: {
    display: "inline-block",
    marginTop: 6,
    padding: "4px 8px",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 6,
    fontSize: 12,
  },

  actions: {
    marginTop: 10,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  editBtn: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  deleteBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },

  toggleBtn: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
};
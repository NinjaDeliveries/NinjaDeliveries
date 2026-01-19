    import { useEffect, useState } from "react";
    import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
    import { db } from "../../context/Firebase";

    const ServiceBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        const snap = await getDocs(collection(db, "bookings"));
        setBookings(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        await updateDoc(doc(db, "bookings", id), { status });
        fetchBookings();
    };

    if (loading) return <div>Loading bookings...</div>;

    return (
        <div className="sd-page">
        <h2 className="sd-page-title">Service Bookings</h2>

        <div className="sd-list">
            {bookings.map((b) => (
            <div key={b.id} className="sd-list-card">
                <div>
                <h3>{b.subServiceName}</h3>
                <p>{b.customerName} • {b.customerPhone}</p>
                <p>{b.slotDate} | {b.slotTime}</p>

                <span className={`sd-badge sd-badge-${b.status}`}>
                    {b.status}
                </span>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                {b.status === "pending" && (
                    <button
                    className="sd-action-btn success"
                    onClick={() => updateStatus(b.id, "assigned")}
                    >
                    Assign
                    </button>
                )}

                {b.status !== "completed" && (
                    <button
                    className="sd-action-btn"
                    onClick={() => updateStatus(b.id, "completed")}
                    >
                    Complete
                    </button>
                )}
                </div>
            </div>
            ))}
        </div>
        </div>
    );
    };

    export default ServiceBookings;

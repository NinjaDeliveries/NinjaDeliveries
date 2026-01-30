import React, { useEffect, useState } from "react";
import { auth, db } from "../../context/Firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";

const Feedback = () => {
  const [ratings, setRatings] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
    // eslint-disable-next-line
  }, []);

  const fetchRatings = async () => {
    console.log("AUTH UID:", auth.currentUser.uid);
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // 🔥 STEP 1: Get service company document
      const companyRef = doc(db, "service_company", user.uid);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        setLoading(false);
        return;
      }

      // 🔥 STEP 2: Use service_company ID (IMPORTANT)
      const companyId = companySnap.id;

      // 🔥 STEP 3: Fetch feedback
      const q = query(
        collection(db, "serviceRatings"),
        where("companyId", "==", companyId),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRatings(list);

      // ⭐ Calculate average rating
      if (list.length > 0) {
        const total = list.reduce(
          (sum, r) => sum + Number(r.rating || 0),
          0
        );
        setAvgRating((total / list.length).toFixed(1));
      } else {
        setAvgRating(0);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Loading feedback...</p>;
  }

  return (
    <div className="sd-main">
      <h1>Customer Feedback</h1>

      <h2 style={{ marginBottom: 20 }}>
        ⭐ Average Rating: {avgRating} / 5
      </h2>

      {ratings.length === 0 ? (
        <p>No feedback yet</p>
      ) : (
        <div className="sd-table">
          {ratings.map((r) => (
            <div key={r.id} className="sd-service-card">
              <h3>{r.serviceTitle || "Service"}</h3>

              <p>⭐ Rating: {r.rating}</p>

              {r.feedback && (
                <p style={{ marginTop: 6 }}>📝 {r.feedback}</p>
              )}

              {r.createdAt && (
                <small>
                  {r.createdAt.toDate
                    ? r.createdAt.toDate().toLocaleDateString()
                    : new Date(r.createdAt).toLocaleDateString()}
                </small>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Feedback;
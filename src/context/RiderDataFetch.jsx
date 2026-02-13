import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./Firebase";
import RiderList from "../pages/RiderList";
import { useUser } from "./adminContext";
import { useNavigate } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";

const RiderDataFetch = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useUser();

  const handleAddNewRider = () => {
    navigate("/riderregistration");
  };

  useEffect(() => {
    if (!user?.storeId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "riderDetails"),
      where("storeId", "==", user.storeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(newData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.storeId]);

  return (
    <div className="riders-page-container">
      {/* Inline Styles */}
      <style>
        {`
.riders-page-container {
  padding: 40px;
  background: linear-gradient(135deg, #f4f6fc 0%, #e2e8f0 100%);
  min-height: 100vh;
  font-family: 'Poppins', sans-serif;
  color: #2e3b5b;
  transition: all 0.3s ease;
}

/* Header */
.riders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.riders-header .main-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #1e2a47;
  letter-spacing: 0.5px;
}
.riders-header .subtitle {
  font-size: 14px;
  color: #6c757d;
}

/* Add Rider Button */
.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #4e73df;
  color: #fff;
  padding: 12px 26px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 5px 15px rgba(78,115,223,0.3);
  transition: all 0.3s ease;
}
.primary-btn:hover {
  background: #2e59d9;
  transform: translateY(-2px);
}

/* Table container */
.riders-table-container {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Table header */
.table-header {
  background: #f1f3f6;
  padding: 15px 20px;
  font-weight: 600;
  border-bottom: 1px solid #e3e6f0;
}
.header-row {
  display: grid;
  grid-template-columns: 3fr 2fr 2fr;
  gap: 10px;
}
.header-cell {
  text-transform: uppercase;
  font-size: 13px;
  color: #6c757d;
  letter-spacing: 0.5px;
}

/* Table body */
.table-body {
  display: flex;
  flex-direction: column;
}
.loader,
.no-data {
  padding: 50px;
  text-align: center;
  color: #6c757d;
  font-size: 16px;
  font-weight: 500;
}

/* Hover effect for table rows if RiderList uses div for row */
.rider-row {
  display: grid;
  grid-template-columns: 3fr 2fr 2fr;
  padding: 15px 20px;
  border-bottom: 1px solid #f1f3f6;
  transition: all 0.3s ease;
  align-items: center;
}
.rider-row:hover {
  background: #f8f9fc;
  transform: scale(1.01);
}

/* Status badges */
.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-align: center;
  transition: all 0.3s ease;
}
.status-active {
  background-color: #1cc88a;
}
.status-inactive {
  background-color: #e74a3b;
}

/* Responsive */
@media (max-width: 768px) {
  .header-row,
  .rider-row {
    grid-template-columns: 2fr 2fr 2fr;
  }
  .riders-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  .primary-btn {
    width: 100%;
    justify-content: center;
  }
}
`}
      </style>

      {/* Header */}
      <header className="riders-header">
        <div className="header-text">
          <h1 className="main-title">Riders Management</h1>
          <p className="subtitle">Manage all registered riders efficiently</p>
        </div>
        <div className="header-actions">
          <button onClick={handleAddNewRider} className="primary-btn">
            <FaUserPlus style={{ marginRight: "8px" }} />
            Add New Rider
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="riders-table-container">
        <div className="table-header">
          <div className="header-row">
            <div className="header-cell profile">Current Riders</div>
          </div>
        </div>

        <div className="table-body">
          {loading ? (
            <div className="loader">Loading riders...</div>
          ) : data.length === 0 ? (
            <div className="no-data">No riders registered yet.</div>
          ) : (
            data.map((item) => <RiderList key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default RiderDataFetch;

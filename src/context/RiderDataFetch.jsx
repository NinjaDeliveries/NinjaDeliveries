import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./Firebase";
import RiderList from "../pages/RiderList";
import "./style.css";
import { useUser } from "./adminContext";
import { useNavigate } from "react-router-dom";

const RiderDataFetch = () => {
  const [data, setData] = useState([]);
  const [Loader, setLoader] = useState(true);
  const navigate = useNavigate();
  const { user } = useUser();
  
  const handleAddNewRider = () => {
    navigate("/riderregistration");
  };
  useEffect(() => {
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
      setLoader(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="riders-page-container">
      {/* Enhanced Header Section */}
      <header className="riders-header">
        <div className="header-text">
          <h1 className="main-title">Riders Management</h1>
          <p className="subtitle">View and manage all registered riders</p>
        </div>
        <div className="header-actions">
          <button onClick={handleAddNewRider} className="primary-btn">
            <i className="fas fa-user-plus"></i> Add New Rider
          </button>
        </div>
      </header>

      {/* Control Bar with Search and Filters */}
      {/* <div className="control-bar">
        <div className="search-wrapper">
          <div className="search-input">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search riders..." />
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label>Status:</label>
            <select>
              <option>All Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>On Leave</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select>
              <option>Recently Added</option>
              <option>Name (A-Z)</option>
              <option>Name (Z-A)</option>
              <option>Most Active</option>
            </select>
          </div>
        </div>
      </div> */}

      {/* Riders List Table */}
      <div className="riders-table-container">
        <div className="table-header">
          <div className="header-row">
            <div className="header-cell profile ">Username</div>
            <div className="header-cell status ">Status</div>
            <div className="header-cell actions">Actions</div>
          </div>
        </div>

        <div className="table-body">
          {Loader === false &&
            data.map((item) => <RiderList key={item.id} item={item} />)}
        </div>
      </div>
    </div>
  );
};

export default RiderDataFetch;

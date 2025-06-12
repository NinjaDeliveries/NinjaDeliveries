import React, { useState } from "react";
import RiderListUpdate from "./RiderListUpdate";
import "../context/style.css";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../context/Firebase";
function RiderList({ item }) {
  const [Editbox, setEditbox] = useState(false);
  const [DelRider, setDelRider] = useState(false);

  const handleTripEnd = async () => {
    try {
      if (!item.currentOrder) return;

      // Update order status
      const orderRef = doc(db, "orders", item.currentOrder);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        await updateDoc(orderRef, { status: "tripEnded" });
      }

      // Update rider info
      const riderRef = doc(db, "riderDetails", item.id);
      await updateDoc(riderRef, {
        currentOrder: "",
        currentOrderStatus: "",
        isAvailable: true,
      });
    } catch (error) {
      console.error("Error ending trip:", error);
    }
  };

  return (
    <>
      <div key={item.id} className={Editbox || DelRider}>
        <div className="list-group w-100 my-1">
          <li className="list-group-item d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {item.currentOrderStatus === "accepted" && (
                <span
                  className="me-2"
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: "green",
                    borderRadius: "50%",
                    display: "inline-block",
                  }}
                ></span>
              )}
              {item.username}
            </div>
            <span className="buttons d-flex gap-2">
              {item.currentOrderStatus === "accepted" && (
                <button
                  onClick={handleTripEnd}
                  className="btn mx-3 btn-outline-success"
                >
                  Trip End
                </button>
              )}
              <button
                onClick={() => {
                  setEditbox(!Editbox);
                  if (DelRider) setDelRider(false);
                }}
                className="editbutton btn btn-secondary"
              >
                Edit
              </button>
              <button
                className="editbutton btn btn-danger"
                onClick={() => {
                  setDelRider(!DelRider);
                  if (Editbox) setEditbox(false);
                }}
              >
                Delete
              </button>
            </span>
          </li>
        </div>
        {Editbox && <RiderListUpdate item={item} setEditbox={setEditbox} />}
        {DelRider && <DeleteRider item={item} setDelRider={setDelRider} />}
      </div>
    </>
  );
}
function DeleteRider({ item, setDelRider }) {
  const [docId, setDocId] = useState(item.id); // Document ID

  const handleDeleteField = async () => {
    try {
      const docRef = doc(db, "riderDetails", docId); // Update with your collection name
      await deleteDoc(docRef);
      alert("Field deleted successfully!");
      setDelRider(false);
    } catch (error) {
      alert("Error deleting field:", error);
    }
  };
  return (
    <div>
      <div className=" delRider " key={item.id}>
        <form className="container">
          <div>Are You Sure To Delete {item.name} ?</div>
          <span className="buttons">
            {" "}
            <button
              className="editbutton btn btn-secondary"
              onClick={() => {
                setDelRider(false);
              }}
            >
              Cancel
            </button>
            <button
              className="editbutton btn btn-danger"
              onClick={handleDeleteField}
            >
              Delete
            </button>
          </span>
        </form>
      </div>
    </div>
  );
}

export default RiderList;

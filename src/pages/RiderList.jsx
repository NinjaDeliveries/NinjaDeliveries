import React, { useState } from "react";
import RiderListUpdate from "./RiderListUpdate";
import "../context/style.css";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../context/Firebase";
function RiderList({ item }) {
  const [Editbox, setEditbox] = useState(false);
  const [DelRider, setDelRider] = useState(false);
  return (
    <>
      <div
        key={item.id}
        className={Editbox ? "editclicked" : "list"}
        class={DelRider ? "editclicked" : "list"}
      >
        <div className="list-group w-100 my-1 ">
          <li className="list-group-item d-flex justify-content-between align-items-center">
            {item.username}
            <span className="buttons">
              {" "}
              <button
                onClick={() => {
                  if (Editbox === false) {
                    setEditbox(true);
                    setDelRider(false);
                  } else {
                    setEditbox(false);
                  }
                }}
                className="editbutton btn btn-secondary"
              >
                Edit
              </button>
              <button
                className="editbutton btn btn-danger"
                onClick={() => {
                  if (DelRider === false) {
                    setDelRider(true);
                    setEditbox(false);
                  } else {
                    setDelRider(false);
                  }
                }}
              >
                Delete
              </button>
            </span>
          </li>
        </div>
        {Editbox === true && (
          <RiderListUpdate item={item} setEditbox={setEditbox} />
        )}
        {DelRider === true && (
          <DeleteRider item={item} setDelRider={setDelRider} />
        )}
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

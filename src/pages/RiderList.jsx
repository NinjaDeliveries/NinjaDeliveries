import React, { useState } from "react";
import RiderListUpdate from "./RiderListUpdate";
import "../context/style.css";
function RiderList({ item }) {
  const [Editbox, setEditbox] = useState(false);

  return (
    <>
      <div key={item.id} className={Editbox ? "editclicked" : "list"}>
        <div className="list-group w-100 my-2 ">
          <li className="list-group-item d-flex justify-content-between align-items-center">
            {item.username}
            <button
              onClick={() => {
                if (Editbox === false) {
                  setEditbox(true);
                } else {
                  setEditbox(false);
                }
              }}
              className="editbutton btn btn-primary"
            >
              Edit
            </button>
          </li>
        </div>
        {Editbox === true && (
          <RiderListUpdate item={item} setEditbox={setEditbox} />
        )}
      </div>
    </>
  );
}
export default RiderList;

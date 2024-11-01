import React, { useState } from "react";
import RiderListUpdate from "./RiderListUpdate";

function RiderList({ item }) {
  const [Editbox, setEditbox] = useState(false);

  return (
    <div key={item.id}>
      <ul className="list-group">
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
            className="btn btn-primary"
          >
            More Information
          </button>
        </li>
      </ul>
      {Editbox === true && (
        <RiderListUpdate item={item} setEditbox={setEditbox} />
      )}
    </div>
  );
}
export default RiderList;

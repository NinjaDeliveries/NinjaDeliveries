import React, { useState } from "react";
import BusinessListUpdate from "./BusinessListUpdate";
import "../context/style.css";
function DataBlock({ item }) {
  const [Editbox, setEditbox] = useState(false);

  return (
    <div key={item.id} className={Editbox ? "editclicked" : "list"}>
      <ul className="list-group  w-100 my-1">
        <li className="list-group-item d-flex justify-content-between align-items-center">
          {item.name}
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
            More Information
          </button>
        </li>
      </ul>
      {/* </div> */}
      {Editbox === true && (
        <BusinessListUpdate item={item} setEditbox={setEditbox} />
      )}
    </div>
  );
}
export default DataBlock;

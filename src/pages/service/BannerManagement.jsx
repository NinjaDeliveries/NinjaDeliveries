import React, { useState } from "react";

function BannerManagement() {
  const [activeSection, setActiveSection] = useState("create");

  return (
    <div style={{ padding: "20px" }}>

      {/* Sub menu inside Banner Management only */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setActiveSection("create")}>Create Banner</button>
        <button onClick={() => setActiveSection("view")}>View Banners</button>
        <button onClick={() => setActiveSection("edit")}>Edit Banner</button>
      </div>

      {/* CREATE */}
      {activeSection === "create" && (
        <div>
          <h3>Create New Banner</h3>

          <input placeholder="Banner Image URL" /><br /><br />
          <input placeholder="Category" /><br /><br />
          <input placeholder="Service Name" /><br /><br />
          <input placeholder="Original Price" /><br /><br />
          <input placeholder="Offer Price" /><br /><br />

          <button>Add Banner</button>
        </div>
      )}

      {/* VIEW */}
      {activeSection === "view" && (
        <div>
          <h3>All Banners</h3>
          <p>Banner list will appear here.</p>
        </div>
      )}

      {/* EDIT */}
      {activeSection === "edit" && (
        <div>
          <h3>Edit Banner</h3>
          <p>Edit banner form will appear here.</p>
        </div>
      )}

    </div>
  );
}

export default BannerManagement;

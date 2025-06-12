import React, { useState } from "react";
import { db } from "../context/Firebase"; // adjust this path if needed
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "../style//PushNotificationPage.css";

const PushNotificationPage = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      alert("Please fill in both fields.");
      return;
    }

    setLoading(true);
    setSuccessMsg("");

    try {
      await addDoc(collection(db, "pushNotifications"), {
        title,
        body,
      });

      setSuccessMsg("Notification sent successfully!");
      setTitle("");
      setBody("");
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-page">
      <div className="notification-card">
        <h2 className="notification-title">Push Notification</h2>

        <label className="notification-label">Title</label>
        <input
          type="text"
          className="notification-input"
          placeholder="Enter notification title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="notification-label">Body</label>
        <textarea
          className="notification-textarea"
          rows={4}
          placeholder="Enter notification body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <button
          className="notification-button"
          onClick={handleSendNotification}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Notification"}
        </button>

        {successMsg && <p className="notification-success">{successMsg}</p>}
      </div>
    </div>
  );
};

export default PushNotificationPage;

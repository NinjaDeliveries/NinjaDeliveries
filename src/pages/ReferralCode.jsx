import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import { db, firestore } from "../context/Firebase";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { toast } from "react-toastify";
import { useUser } from "../context/adminContext";

function ReferralCode() {
  const [data, setData] = useState([]);
  const { user } = useUser();
  const [value, setValue] = useState(null);

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
    });
    return () => unsubscribe();
  }, [user.storeId]);

  return (
    <div className="containerReferral">
      <style>
        {`
        .containerReferral {
          padding: 50px 30px;
          max-width: 700px;
          margin: 50px auto;
          background: linear-gradient(135deg, #f5f6fa, #e3e8f3);
          border-radius: 20px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.1);
          font-family: 'Poppins', sans-serif;
          color: #2e3b5b;
          transition: all 0.3s ease;
          min-height: 500px;
        }
        .heading {
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 30px;
          color: #1e2a47;
          text-align: center;
        }
        .MuiAutocomplete-root {
          margin-bottom: 30px;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
          padding: 30px;
          color: #6c757d;
          font-size: 16px;
          text-align: center;
          transition: all 0.3s ease;
          animation: fadeIn 0.5s ease forwards;
        }
        @keyframes fadeIn {
          0% {opacity: 0; transform: translateY(20px);}
          100% {opacity: 1; transform: translateY(0);}
        }
        .empty-state h3 {
          font-size: 1.8rem;
          margin-bottom: 15px;
          color: #4e73df;
        }
        .empty-state p {
          font-size: 14px;
        }
        .form1 {
          background: #ffffff;
          padding: 25px 30px;
          border-radius: 16px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          animation: fadeInUp 0.5s ease forwards;
        }
        @keyframes fadeInUp {
          0% {opacity:0; transform: translateY(20px);}
          100% {opacity:1; transform: translateY(0);}
        }
        .input-group {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          gap: 10px;
        }
        .input-group input {
          flex: 1;
          padding: 10px 15px;
          border-radius: 10px;
          border: 1px solid #ced4da;
          font-size: 14px;
          outline: none;
          transition: border 0.3s ease, box-shadow 0.3s ease;
        }
        .input-group input:focus {
          border-color: #4e73df;
          box-shadow: 0 0 8px rgba(78,115,223,0.3);
        }
        .input-group-text {
          background: #e9ecef;
          padding: 10px 15px;
          border-radius: 10px 0 0 10px;
          font-weight: 600;
          border: 1px solid #ced4da;
          border-right: none;
        }
        .input-group button {
          background: #4e73df;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .input-group button:hover {
          background: #2e59d9;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(46,89,217,0.3);
        }
        .savebtn {
          width: 100%;
          padding: 12px 0;
          font-weight: 600;
          border-radius: 12px;
          font-size: 14px;
          background: #1cc88a;
          color: #fff;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .savebtn:hover {
          background: #17a673;
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(23,166,115,0.3);
        }
        `}
      </style>

      <h2 className="heading">Referral Codes</h2>

     <Autocomplete
  options={data}
  getOptionLabel={(option) => option.username || "Unknown Rider"}
  disablePortal
  PopperProps={{
    style: {
      zIndex: 9999,   
    },
  }}
  sx={{ width: "100%" }}
  renderInput={(params) => (
    <TextField {...params} label="Select Rider" />
  )}
  onChange={(event, newValue) => setValue(newValue)}
/>



      {!value && (
        <div className="empty-state">
          <h3>🎯 Select a Rider</h3>
          <p>
            Choose a rider from the dropdown above to generate and assign a
            referral code.
          </p>
        </div>
      )}

      {value && <AddingReferralCode rider={value} />}
    </div>
  );
}

function AddingReferralCode({ rider }) {
  const [code, setCode] = useState("");

  useEffect(() => {
    generateCode();
  }, []);

  const generateCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCode(randomCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(firestore, "referralCodes"), {
        isRedeemed: false,
        referralCode: code,
        username: rider.username,
      });
      toast("Referral Code Assigned!", {
        type: "success",
        position: "top-center",
      });
      generateCode();
    } catch (error) {
      console.error("Error sending data:", error);
      toast("Failed to assign referral code", {
        type: "error",
        position: "top-center",
      });
    }
  };

  return (
  <div className="form1">

    <div className="rider-card">
      <div className="rider-avatar">👤</div>
      <div className="rider-info">
        <div className="rider-name">{rider.username}</div>
        <div className="rider-sub">Selected Rider</div>
      </div>
    </div>

    <div className="code-box">
      <div className="code-label">Referral Code</div>
      <div className="code-row">
        <div className="code-value">{code}</div>
        <button className="regen-btn" onClick={generateCode}>
          🔄 Generate
        </button>
      </div>
    </div>

    <button className="savebtn" onClick={handleSubmit}>
      Assign Referral Code
    </button>

  </div>
);

}

export default ReferralCode;

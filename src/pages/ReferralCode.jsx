import React from "react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../context/Firebase";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import "../context/style.css";
import { toast } from "react-toastify";
import { firestore } from "../context/Firebase";

function ReferralCode() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "riderDetails"),
      (snapshot) => {
        const newData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(newData);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const [value, setValue] = useState(null);

  const handleChange = (event, newValue) => {
    setValue(newValue);
    console.log("Selected value:", newValue);
  };

  const defprops = {
    options: data,
    getOptionLabel: (options) => options.username,
  };
  return (
    <div>
      <h2 className="heading">Referral Codes</h2>

      <Autocomplete
        className="heading2"
        {...defprops}
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Select Rider" />}
        onChange={handleChange}
      />
      {value && <AddingReferralCode value={value} />}
    </div>
  );
}

function AddingReferralCode(value) {
  const [code, setCode] = useState("");
  const [isRedeemed, setisRedeemed] = useState(false);

  useEffect(() => {
    generateCode();
  }, []);

  const generateCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCode(randomCode);
  };

  const handleGenerateCode = () => {
    generateCode();
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(firestore, "referralCodes"), {
        isRedeemed: isRedeemed,
        referralCode: code,
        username: value.value.username,
      });

      toast("Referral Code Added!", {
        type: "success",
        position: "top-center",
      });
    } catch (error) {
      console.error("Error sending data : ", error);
    }
  };

  return (
    <div>
      <div className="form1">
        <div class="input-group mb-3">
          <span class="input-group-text" id="basic-addon1">
            @
          </span>
          <input
            type="text"
            value={value.value.username}
            class="form-control"
            disabled
            aria-label="Username"
            aria-describedby="basic-addon1"
          />
        </div>

        <div class="mb-3">
          <label for="basic-url" class="form-label">
            Generate Referral Code
          </label>
          <div class="input-group">
            <span class="input-group-text" id="basic-addon3">
              Referral Code
            </span>
            <input
              type="text"
              value={code}
              class="form-control"
              id="basic-url"
              aria-describedby="basic-addon3 basic-addon4"
            />
            <button onClick={handleGenerateCode} className="btn btn-primary">
              Generate
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          className="savebtn btn btn-success"
        >
          Assign Referral code
        </button>
      </div>
    </div>
  );
}

export default ReferralCode;

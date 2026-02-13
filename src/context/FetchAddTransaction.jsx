import * as React from "react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./Firebase";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import "./style.css";

import AddTransaction from "../pages/AddTransaction";
import { useUser } from "./adminContext";

export default function FetchAddTransaction() {
  const [data, setData] = useState([]);
  const { user } = useUser();
  const [editbox, seteditbox] = useState(false);

  useEffect(() => {
    if (!user?.storeId) return;

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

    // Cleanup subscription on unmount...
    return () => unsubscribe();
  }, [user?.storeId]);

  const getData = (data) => {
    seteditbox(true);
  };
  const [value, setValue] = useState(null);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const defprops = {
    options: data,
    getOptionLabel: (options) => options.username,
  };
  return (
    <div className="containerTrans">
      <h2 className="my-5 mx-5 heading">Add Transaction</h2>
      <Autocomplete
        className="heading2"
        {...defprops}
        // options={item.name}
        sx={{ width: 300 }}
        renderInput={(params) => (
          <TextField {...params} label="Add Transaction" />
        )}
        onChange={handleChange}
      />
      {value && <AddTransaction value={value} />}
    </div>
  );
}

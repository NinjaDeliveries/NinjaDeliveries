import * as React from "react";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./Firebase";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import "./style.css";
import AddTransaction from "../pages/AddTransaction";

export default function FetchAddTransaction() {
  const [data, setData] = useState([]);

  const [editbox, seteditbox] = useState(false);
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

  const getData = (data) => {
    seteditbox(true);

    console.log(data);
  };
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
    <>
      <h2 className="heading">Add Transaction</h2>
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
    </>
  );
}

import React, { useState } from "react";
import firebase from "firebase/app";
import "../context/style.css";
import {
  getFirestore,
  collection,
  updateDoc,
  doc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../context/Firebase";

export default function AddTransaction(value) {
  const [amount, setAmount] = useState();

  const [date, setDate] = useState(new Date());

  const [transaction, setTransaction] = useState({
    amount: parseFloat(amount),
    mode: "UPI",
    timestamp: date,
  });

  const handleSubmit = async () => {
    try {
      const docRef = doc(db, "riderDetails", value.value.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const Transactions = data.Transactions || [];

        Transactions.push(transaction);

        await updateDoc(docRef, {
          Transactions,
        });

        alert("Transaction Added");
      } else {
        console.log("Rider not found!");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  return (
    <div className="form1" key={value.value.id}>
      <form className="row container   g-3">
        <div class="input-group mb-1">
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
        <div className="col-md-4">
          <label htmlFor="validationDefault01" className="form-label">
            Amount
          </label>
          <input
            type="number"
            className="form-control"
            id="validationDefault01"
            value={amount}
            onChange={(e) =>
              setTransaction({ ...transaction, amount: e.target.valueAsNumber })
            }
            required
          />
        </div>
        <div className="col-md-4">
          <label htmlFor="validationDefault02" className="form-label">
            Mode
          </label>
          <input
            type="text"
            disabled
            className="form-control"
            id="validationDefault02"
            value="UPI"
            required
          />
        </div>
        <div className="col-md-4">
          <label htmlFor="validationDefault02" className="form-label">
            TimeStamp
          </label>
          <input
            type="text"
            disabled
            className="form-control"
            id="validationDefault02"
            value={date}
            required
          />
        </div>
        <div className="col-12">
          <button
            className="btn btn-success"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            type="submit"
          >
            Add Transaction
          </button>
        </div>
      </form>
    </div>
  );
}

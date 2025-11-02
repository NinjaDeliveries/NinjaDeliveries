import React, { useState } from "react";
import { toast } from "react-toastify";
import "../context/transaction.css";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../context/Firebase";

export default function AddTransaction({ value }) {
  const [amount, setAmount] = useState();
  const [date] = useState(new Date());
  const [transaction, setTransaction] = useState({
    amount: parseFloat(amount),
    mode: "UPI",
    timestamp: date,
  });

  const handleSubmit = async () => {
    try {
      const docRef = doc(db, "riderDetails", value.id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const transactions = data.Transactions || [];

        transactions.push(transaction);

        await updateDoc(docRef, {
          Transactions: transactions,
        });

        toast("Transaction Added!", {
          type: "success",
          position: "top-center",
        });
      } else {
        console.log("Rider not found!");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  return (
    <div className="transaction-card" key={value.id}>
      <form className="transaction-form">
        {/* Username */}
        <div className="form-group">
          <label>Rider Username</label>
          <input
            type="text"
            value={value.username}
            className="input-field"
            disabled
          />
        </div>

        {/* Amount */}
        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            className="input-field"
            value={amount}
            onChange={(e) =>
              setTransaction({ ...transaction, amount: e.target.valueAsNumber })
            }
            placeholder="Enter amount"
          />
        </div>

        {/* Mode */}
        <div className="form-group">
          <label>Payment Mode</label>
          <input type="text" className="input-field" value="UPI" disabled />
        </div>

        {/* Timestamp */}
        <div className="form-group">
          <label>Timestamp</label>
          <input type="text" className="input-field" value={date} disabled />
        </div>

        {/* Submit */}
        <div className="form-actions">
          <button
            className="btn-submit"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            Add Transaction
          </button>
        </div>
      </form>
    </div>
  );
}

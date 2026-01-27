import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../context/Firebase";

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const createDummyBookings = async (count = 20) => {
  const user = auth.currentUser;
  if (!user) {
    alert("Login first");
    return;
  }

  const statuses = ["pending", "assigned", "started"];
  const services = ["AC Repair", "Plumbing", "Electrician", "Cleaning"];
  const works = ["Inspection", "Repair", "Installation"];
  const customers = ["Ravi", "Aman", "Neha", "Priya", "Karan"];

  for (let i = 0; i < count; i++) {
    await addDoc(collection(db, "service_bookings"), {
      companyId: user.uid,
      customerName: randomFrom(customers),
      serviceName: randomFrom(services),
      workName: randomFrom(works),
      date: `2026-02-${(i % 28) + 1}`,
      time: `${9 + (i % 6)}:00 AM`,
      status: randomFrom(statuses),
      createdAt: Timestamp.now(),
      startOtp: null,
      otpVerified: false,
    });
  }

  console.log(`✅ ${count} dummy bookings created`);
};

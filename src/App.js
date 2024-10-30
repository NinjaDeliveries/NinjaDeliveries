import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
// import Riders from "./pages/Riders";
import Home from "./pages/Home";
import BusinessRegistration from "./pages/BusinessRegistration";

import BusinessDataFetch from "./context/BusinessDataFetch";
import RiderRegistration from "./pages/RiderRegistration";
import RiderDataFetch from "./context/RiderDataFetch";
import FetchAddTransaction from "./context/FetchAddTransaction";

function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/bussinessregistration"
          element={<BusinessRegistration />}
        />
        <Route path="/businesslist" element={<BusinessDataFetch />} />
        <Route path="/riderregistration" element={<RiderRegistration />} />
        <Route path="/riderlist" element={<RiderDataFetch />} />
        <Route path="/addtransaction" element={<FetchAddTransaction />} />
      </Routes>
    </>
  );
}

export default App;

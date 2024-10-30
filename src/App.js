import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
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
        <Route path="/NinjaDeliveries" element={<Home />} />
        <Route
          path="/NinjaDeliveries/bussinessregistration"
          element={<BusinessRegistration />}
        />
        <Route
          path="/NinjaDeliveries/businesslist"
          element={<BusinessDataFetch />}
        />
        <Route
          path="/NinjaDeliveries/riderregistration"
          element={<RiderRegistration />}
        />
        <Route path="/NinjaDeliveries/riderlist" element={<RiderDataFetch />} />
        <Route
          path="/NinjaDeliveries/addtransaction"
          element={<FetchAddTransaction />}
        />
      </Routes>
    </>
  );
}

export default App;

import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import BusinessRegistration from "./pages/BusinessRegistration";
import BusinessDataFetch from "./context/BusinessDataFetch";
import RiderRegistration from "./pages/RiderRegistration";
import RiderDataFetch from "./context/RiderDataFetch";
import FetchAddTransaction from "./context/FetchAddTransaction";
import PromoCode from "./pages/PromoCode";
import ReferralCode from "./pages/ReferralCode";
import Login from "./pages/login";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";

function App() {
  const [nav, setNav] = useState(false);
  return (
    <>
      {nav && <Navbar />}
      <Routes>
        <Route
          path="/NinjaDeliveries"
          element={nav === true ? <Home /> : <Login setNav={setNav} />}
        />

        <Route
          path="/home"
          element={nav === true ? <Home /> : <Login setNav={setNav} />}
        />
        <Route
          path="/bussinessregistration"
          element={
            nav === true ? (
              <BusinessRegistration />
            ) : (
              <Navigate to="/NinjaDeliveries" />
            )
          }
        />
        <Route
          path="/businesslist"
          element={
            nav === true ? (
              <BusinessDataFetch />
            ) : (
              <Navigate to="/NinjaDeliveries" />
            )
          }
        />
        <Route
          path="/riderregistration"
          element={
            nav === true ? (
              <RiderRegistration />
            ) : (
              <Navigate to="/NinjaDeliveries" />
            )
          }
        />
        <Route
          path="/riderlist"
          element={
            nav === true ? (
              <RiderDataFetch />
            ) : (
              <Navigate to="/NinjaDeliveries" />
            )
          }
        />
        <Route
          path="/addtransaction"
          element={
            nav === true ? (
              <FetchAddTransaction />
            ) : (
              <Navigate to="/NinjaDeliveries" />
            )
          }
        />
        <Route
          path="/promocode"
          element={
            nav === true ? <PromoCode /> : <Navigate to="/NinjaDeliveries" />
          }
        />
        <Route
          path="/referralcode"
          element={
            nav === true ? <ReferralCode /> : <Navigate to="/NinjaDeliveries" />
          }
        />
      </Routes>
    </>
  );
}

export default App;

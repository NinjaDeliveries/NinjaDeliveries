import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import BusinessRegistration from "./pages/BusinessRegistration";
import BusinessDataFetch from "./context/BusinessDataFetch";
import RiderRegistration from "./pages/RiderRegistration";
import RiderDataFetch from "./context/RiderDataFetch";
import FetchAddTransaction from "./context/FetchAddTransaction";
import Login from "./pages/login";
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
        {console.log(nav)}
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
      </Routes>
    </>
  );
}

export default App;

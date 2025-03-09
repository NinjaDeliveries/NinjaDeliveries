import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import BusinessRegistration from "./pages/BusinessRegistration";
import RiderRegistration from "./pages/RiderRegistration";
import RiderDataFetch from "./context/RiderDataFetch";
import FetchAddTransaction from "./context/FetchAddTransaction";
import PromoCode from "./pages/PromoCode";
import ReferralCode from "./pages/ReferralCode";
import Login from "./pages/login";
import Report from "./pages/Report";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";
import ListingNewItems from "./pages/ListingNewItems";
import FetchListedItems from "./pages/FetchListedItems";
import AddCategory from "./pages/AddCategory";
import UpdateSubCategory from "./pages/UpdateSubCategory";
import OrdersBill from "./pages/OrdersBill";

function App() {
  const [nav, setNav] = useState(false);

  return (
    <div>
      {nav && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={nav === true ? <Home /> : <Login setNav={setNav} />}
        />

        <Route
          path="/home"
          element={nav === true ? <Home /> : <Login setNav={setNav} />}
        />
        <Route
          path="/bussinessregistration"
          element={
            nav === true ? <BusinessRegistration /> : <Navigate to="/" />
          }
        />

        <Route
          path="/productslist"
          element={nav === true ? <FetchListedItems /> : <Navigate to="/" />}
        />
        <Route
          path="/riderregistration"
          element={nav === true ? <RiderRegistration /> : <Navigate to="/" />}
        />
        <Route
          path="/riderlist"
          element={nav === true ? <RiderDataFetch /> : <Navigate to="/" />}
        />
        <Route
          path="/addtransaction"
          element={nav === true ? <FetchAddTransaction /> : <Navigate to="/" />}
        />
        <Route
          path="/promocode"
          element={nav === true ? <PromoCode /> : <Navigate to="/" />}
        />
        <Route
          path="/referralcode"
          element={nav === true ? <ReferralCode /> : <Navigate to="/" />}
        />
        <Route
          path="/report"
          element={nav === true ? <Report /> : <Navigate to="/" />}
        />
        <Route
          path="/itemAdd"
          element={nav === true ? <ListingNewItems /> : <Navigate to="/" />}
        />
        <Route
          path="/updatesubcategory"
          element={nav === true ? <UpdateSubCategory /> : <Navigate to="/" />}
        />
        <Route
          path="/addcategories"
          element={nav === true ? <AddCategory /> : <Navigate to="/" />}
        />
        <Route
          path="/downloadbill"
          element={nav === true ? <OrdersBill /> : <Navigate to="/" />}
        />
      </Routes>
    </div>
  );
}

export default App;

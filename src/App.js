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
import UpdateCategories from "./pages/UpdateCategory";
import PushNotificationPage from "./pages/pushNotifications";
import OrderList from "./pages/OrderList";
import QuestionManager from "./pages/Questions";
import Leaderboard from "./pages/LeaderBoard";
import HotspotForm from "./pages/Hotspot";
import OrderQRCodeQueue from "./pages/QrCodepage";
import BannerAdmin from "./pages/Banner";
import CouponCampaignManager from "./pages/Coupons";
import RiderCharges from "./pages/RiderCharges";
import FreshGreens from "./pages/freshGreenCard";
import RadiusMap from "./pages/locationRadiusMap";
function App() {
  const [nav, setNav] = useState(false);
  const [Isadmin, setIsadmin] = useState(false);

  return (
    <div>
      {nav && Isadmin && <Navbar />}
      <Routes>
        <Route
          path="/"
          element={
            nav === true ? (
              Isadmin === true ? (
                <Home />
              ) : (
                <OrderQRCodeQueue />
              )
            ) : (
              <Login setNav={setNav} setIsadmin={setIsadmin} />
            )
          }
        />

        <Route
          path="/home"
          element={
            nav === true ? (
              Isadmin === true ? (
                <Home />
              ) : (
                <OrderQRCodeQueue />
              )
            ) : (
              <Login setNav={setNav} setIsadmin={setIsadmin} />
            )
          }
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
          path="/orderlist"
          element={nav === true ? <OrderList /> : <Navigate to="/" />}
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
        <Route
          path="/categories_management"
          element={nav === true ? <UpdateCategories /> : <Navigate to="/" />}
        />
        <Route
          path="/pushNotification"
          element={
            nav === true ? <PushNotificationPage /> : <Navigate to="/" />
          }
        />
        <Route
          path="/questions"
          element={nav === true ? <QuestionManager /> : <Navigate to="/" />}
        />
        <Route
          path="/leaderboard"
          element={nav === true ? <Leaderboard /> : <Navigate to="/" />}
        />
        <Route
          path="/hotspot"
          element={nav === true ? <HotspotForm /> : <Navigate to="/" />}
        />
        <Route
          path="/scanorder"
          element={nav === true ? <OrderQRCodeQueue /> : <Navigate to="/" />}
        />
        <Route
          path="/banner_management"
          element={nav === true ? <BannerAdmin /> : <Navigate to="/" />}
        />
        <Route
          path="/coupon_management"
          element={
            nav === true ? <CouponCampaignManager /> : <Navigate to="/" />
          }
        />
        <Route
          path="/RiderCharges"
          element={nav === true ? <RiderCharges /> : <Navigate to="/" />}
        />
        <Route
          path="/Fresh_Greens"
          element={nav === true ? <FreshGreens /> : <Navigate to="/" />}
        />
        <Route
          path="/RadiusMap"
          element={nav === true ? <RadiusMap /> : <Navigate to="/" />}
        />
      </Routes>
    </div>
  );
}

export default App;

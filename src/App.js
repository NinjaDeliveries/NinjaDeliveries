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
import Register from "./pages/Register";
import Login from "./pages/login";
import Report from "./pages/Report";
import "react-toastify/dist/ReactToastify.css";
import { useState, useEffect } from "react";
import ListingNewItems from "./pages/ListingNewItems";
import ListingNewSalesItems from "./pages/ListSaleProduct";
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
import StoreOrder from "./pages/emeStore";
import SeedNinjaEats from "./pages/SeedNinjaEats";
import Admin from "./pages/Admin";
import { useLocation } from "react-router-dom";
import { useUser } from "./context/adminContext";
import ProtectedRoute from "./ProtectedRoute";
import { logAdminActivity } from "./utils/activityLogger";


function App() {
const { user } = useUser();
const location = useLocation();

const [nav, setNav] = useState(false);
const [Isadmin, setIsadmin] = useState(false);
const [is24x7, setis24x7] = useState(false);
const [isEme, setisEme] = useState(false);

// 🔹 UI + ROLE STATE HANDLING (HEAD)
useEffect(() => {
  if (user) {
    setNav(true);
    setIsadmin(user.roleKey === "all_access_admin");

    // optional future flags
    setis24x7(user.roleKey === "fresh_greens");
    setisEme(user.roleKey === "eme_store");
  } else {
    setNav(false);
    setIsadmin(false);
    setis24x7(false);
    setisEme(false);
  }
}, [user, location.pathname]);


// 🔹 ACTIVITY LOGGING (BRANCH)
useEffect(() => {
  if (!user) return;

  logAdminActivity({
    user,
    type: "NAVIGATION",
    module: "ROUTE",
    action: "Visited page",
    route: location.pathname,
    component: "Router",
  });
}, [user, location.pathname]);

  return (
    <div>
      {/* {nav && Isadmin && <Navbar />} */}
      {nav && <Navbar />}
      <Routes>
        {/* MAin ROUTE */}
        <Route
          path="/"
          element={
            nav === true ? (
              Isadmin === true ? (
                <Home />
              ) : isEme === true ? (
                <StoreOrder />
              ) : is24x7 === true ? (
                <FreshGreens />
              ) : (
                <OrderQRCodeQueue />
              )
            ) : (
              <Login
                setNav={setNav}
                setIsadmin={setIsadmin}
                setisEme={setisEme}
                setis24x7={setis24x7}
              />
              
            )
          }
        />
        {/* REGISTER ROUTE (DIRECT LINK ONLY) */}
        <Route 
        path="/register"
        element={<Register setNav={setNav} />}
        />
        <Route
          path="/home"
          element={
            nav === true ? (
              Isadmin === true ? (
                <Home />
              ) : isEme === true ? (
                <StoreOrder />
              ) : is24x7 === true ? (
                <FreshGreens />
              ) : (
                <OrderQRCodeQueue />
              )
            ) : (
              <Login
                setNav={setNav}
                setIsadmin={setIsadmin}
                setisEme={setisEme}
                setis24x7={setis24x7}
              />
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
        {/* <Route
          path="/AddItems"
          element={nav === true ? <ListingNewItems /> : <Navigate to="/" />}
        /> */}
        <Route
        path="/AddItems"
        element={
          nav === true ? (
        <ProtectedRoute user={user}>
          <ListingNewItems />
          </ProtectedRoute>
          ) : (
          <Navigate to="/" />
        )
        }
      />
        <Route
          path="/AddSalesItems"
          element={
            nav === true ? <ListingNewSalesItems /> : <Navigate to="/" />
          }
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
          element={
            nav === true ? (
              <ProtectedRoute user={user}>
                <UpdateCategories/>
              </ProtectedRoute>    
            ) : (      
            <Navigate to="/" />
          )
        } 
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
        <Route
          path="/Test"
          element={nav === true ? <StoreOrder /> : <Navigate to="/" />}
        />
        <Route path="/seed-ninja-eats" element={nav === true ? <SeedNinjaEats /> : <Navigate to="/" />} />

        {process.env.NODE_ENV === "development" && (
          <Route
          path="/__admin_dev"
          element={
            // user?.permissions?.includes("page:users")
            (user?.permissions?.includes("page:users") || user?.roleKey === "all_access_admin")


            ? <Admin />
            : <Navigate to="/no-access" />
          }
        />
      )}
        </Routes>
    </div>
  );
}

export default App;

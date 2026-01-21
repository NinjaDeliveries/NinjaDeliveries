import React, { useState } from "react";
import { auth, logActivity, db } from "../context/Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/adminContext";
import { logAdminActivity } from "../utils/activityLogger";
import { useEffect } from "react";
import {
  FaLock,
  FaEnvelope,
  FaSignInAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import "../style/login.css";




export default function Login({ setNav, setIsadmin, setisEme, setis24x7 }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const db = getFirestore();
  const { user } = useUser();
  const navigate = useNavigate();

useEffect(() => {
  if (auth.currentUser) {
    navigate("/", { replace: true });
  }
}, [navigate]);
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingApproval");
  
    if (pending === "true") {
      toast.info("Your account is pending admin approval", {
        position: "top-center",
        autoClose: 3000,
      });
      sessionStorage.removeItem("pendingApproval");
    }
  }, []);
  
//   useEffect(() => {
//     if (user && user.storeId) {
//     navigate("/home");
//   }
// }, [user, navigate]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast("Please enter both email and password", {
        type: "error",
        position: "top-center",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      const user = userCredential.user;
        let userEmail = user.email ? user.email.toLowerCase() : trimmedEmail;


      if (!userEmail) {
        console.error("No valid email found after all attempts");
        throw new Error(
          "Unable to retrieve user email. Please try logging in again."
        );
      }

      if (userEmail === "emestore@admin.com") {
        setisEme(true);
      }
      if (userEmail === "24seven@admin.com") {
        setis24x7(true);
      }

      let isAdmin = false;
      let userRoleKey = null;
      let userSource = "unknown";
      let userStoreId = null;
      // 🔹 NEW ADMIN SYSTEM (admin_users collection)
      const adminRef = doc(db, "admin_users", user.uid);
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists()) {
        const adminData = adminSnap.data();

      if (adminData.isActive === false) {
      toast("Access pending. Please wait for approval.", {
      position: "top-center",
      autoClose: 3000,
      });
       sessionStorage.setItem("pendingApproval", "true");
  await auth.signOut();
  return;
}
        if (adminData.isActive === false) {
          toast("Admin access disabled. Contact super admin.");
          await auth.signOut();
          return;
        }

        isAdmin = true;
        userRoleKey = adminData.roleKey || null;
        userSource = "admin_users";
        userStoreId = Array.isArray(adminData.storeAccess)
          ? adminData.storeAccess[0] || null
          : adminData.storeId || null;
        // // setUser({
        // //   uid: user.uid,
        // //   email: userEmail,
        // //   storeId: userStoreId,
        // //   roleKey: adminData.roleKey || null,
        // //   permissions:
        // //   adminData.role === "admin"
        // //   ? [
        // //     "manage_users",
        // //     "manage_products",
        // //     "manage_orders",
        // //     "manage_riders",
        // //     "manage_categories",
        // //     "manage_coupons",
        // //     "manage_banners",
        // //     "view_reports",
        // //   ]
        // // : [],
        // });
      }
      
// 🔹 SERVICE USERS CHECK (NEW)
let isServiceUser = false;

if (!isAdmin) {
  const serviceRef = doc(db, "service_users", user.uid);
  const serviceSnap = await getDoc(serviceRef);

  if (serviceSnap.exists()) {
    const serviceData = serviceSnap.data();

    if (serviceData.isActive === false) {
      toast("Your service account is disabled. Contact admin.", {
        position: "top-center",
      });
      await auth.signOut();
      return;
    }

    isServiceUser = true;
    userSource = "service_users";

    toast("Service Dashboard Login Successful", {
      type: "success",
      position: "top-center",
    });

    setNav(false); // ❌ service dashboard has its own layout
    navigate("/service-dashboard");
    return; // ⛔ stop admin logic here
  }
}
      if (!isAdmin) {
      try {
        if (typeof userEmail === "string" && userEmail.length > 0) {
          const q = query(collection(db, "delivery_zones"));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // Assuming each document has an array field named "adminEmail"
            let found = false;

            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const adminEmails = data.adminEmail || [];

              if (
                Array.isArray(adminEmails) &&
                adminEmails.includes(userEmail)
              ) {
                found = true;
              }
            });

            if (found) {
              isAdmin = true;
              userSource = "delivery_zones";
              console.log("Admin found via OLD system (delivery_zones)");
            }
          }
        }

        //     } else {
        //       isAdmin = false;
        //       console.log("User email not found in adminEmail array");
        //     }
        //   } else {
        //     isAdmin = false;
        //     console.log("No admin documents found via query");
        //   }
        // } else {
        //   console.error("Invalid email:", userEmail);
        //   isAdmin = false;
        // }
      } catch (firestoreError) {
        console.error("Firestore query error:", firestoreError);
        //isAdmin = false;
      }
    }

      // Log login activity (only once after admin check)
      await logActivity({
        type: "login",
        userId: user.uid,
        email: userEmail,
        roleKey: userRoleKey,
        source: userSource,
        storeId: userStoreId,
      });
      await logAdminActivity({
  user,                     // Firebase auth user
  type: "LOGIN",
  module: "AUTH",
  action: "Admin logged in",
  route: "/",
  component: "Login",
  metadata: {
    source: userSource,
    roleKey: userRoleKey,
    storeId: userStoreId,
  },
});


      setIsadmin(isAdmin);
      setNav(true);
      if(adminSnap.exists()){
        const adminData = adminSnap.data();
      }
      

      toast(isAdmin ? "Admin Logged In!" : "Logged In Successfully!", {
        type: "success",
        position: "top-center",
      });
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed";
      if (error.code === "auth/user-not-found") {
        errorMessage = "No user found with this email";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast(errorMessage, {
        type: "error",
        position: "top-center",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="background">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>Ninja Deliveries Login</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <FaEnvelope size={20} color="#666" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="input-group">
              <FaLock size={20} color="#666" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
            <button className="login-button" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

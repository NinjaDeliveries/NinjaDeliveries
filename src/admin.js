import React from "react";
import ReactDOM from "react-dom/client";
import { FirebaseProvider } from "./context/Firebase";
import { HashRouter as BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ToastContainer } from "react-toastify";
const rootElement = document.getElementById("root");
// Create the first root and render App
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <FirebaseProvider>
        <ToastContainer />
        <App />
      </FirebaseProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Create the second root and render App2

reportWebVitals();

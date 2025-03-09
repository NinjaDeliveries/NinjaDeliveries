import ReactDOM from "react-dom/client";
import React from "react";
import { FirebaseProvider } from "./context/Firebase";
import { HashRouter as BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import App2 from "./App2";
import reportWebVitals from "./reportWebVitals";
import { ToastContainer } from "react-toastify";
const rootElement = document.getElementById("root");
const rootElement2 = document.getElementById("root2");

// Create the first root and render App
if (rootElement) {
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
}

// Create the second root and render App2
if (rootElement2) {
  const root2 = ReactDOM.createRoot(rootElement2);
  root2.render(
    <React.StrictMode>
      <BrowserRouter>
        <FirebaseProvider>
          <ToastContainer />
          <App2 />
        </FirebaseProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
reportWebVitals();

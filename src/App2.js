import { Routes, Route, Navigate } from "react-router-dom";
import DeleteUser from "./pages/DeleteUser";

function App2() {
  return (
    <div>
      <Routes>
        <Route path="/deleteuser" element={<DeleteUser />} />
      </Routes>{" "}
    </div>
  );
}

export default App2;

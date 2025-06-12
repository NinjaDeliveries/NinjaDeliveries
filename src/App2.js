import { Routes, Route, Navigate } from "react-router-dom";
import DeleteUser from "./pages/DeleteUser";
import Test from "./pages/Test";

function App2() {
  // const timestamp = new Date().getTime();
  // window.location.href = `/admin.html?cache=${timestamp}`;
  return (
    <div>
      <Routes>
        <Route path="/deleteuser" element={<DeleteUser />} />
        <Route path="/trial" element={<Test />} />
      </Routes>{" "}
    </div>
  );
}

export default App2;

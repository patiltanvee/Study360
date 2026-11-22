import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PackageCatalog from "./pages/PackageCatalog";
import RequestStatus from "./pages/RequestStatus";
import StudentDashboard from "./pages/StudentDashboard";
import AdminPanel from "./pages/AdminPanel";
import AdminPackages from "./pages/AdminPackages";

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="topbar shell" style={{ paddingBottom: 12, marginBottom: 0 }}>
      <h1><Link to="/" style={{ color: "inherit", textDecoration: "none" }}>Study packages</Link></h1>
      <nav className="ui">
        {user ? (
          <>
            {user.role === "admin" ? (
              <>
                <Link to="/admin">Review queue</Link>
                <Link to="/admin/packages">Packages</Link>
              </>
            ) : (
              <>
                <Link to="/">Library</Link>
                <Link to="/packages">Browse</Link>
                <Link to="/requests">My requests</Link>
              </>
            )}
            <button className="linklike" onClick={() => { logout(); navigate("/login"); }}>Sign out</button>
          </>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </nav>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.role === "admin" ? <AdminPanel /> : <StudentDashboard />}
            </ProtectedRoute>
          }
        />
        <Route path="/packages" element={<ProtectedRoute><PackageCatalog /></ProtectedRoute>} />
        <Route path="/requests" element={<ProtectedRoute><RequestStatus /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
        <Route path="/admin/packages" element={<ProtectedRoute adminOnly><AdminPackages /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

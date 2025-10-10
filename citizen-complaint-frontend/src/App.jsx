import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Navbar } from "./components/Navbar";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { SubmitComplaint } from "./pages/SubmitComplaint";
import { CitizenDashboard } from "./pages/CitizenDashboard";
import { StaffDashboard } from "./pages/StaffDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(response.data);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" />;
    }

    return children;
  };

  const DashboardRouter = () => {
    if (!user) return <Navigate to="/login" />;

    if (user.role === "admin") {
      return <AdminDashboard user={user} />;
    } else if (user.role === "staff") {
      return <StaffDashboard user={user} />;
    } else {
      return <CitizenDashboard user={user} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Landing user={user} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/submit-complaint"
            element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <SubmitComplaint user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/staff"
            element={
              <ProtectedRoute allowedRoles={["staff"]}>
                <StaffDashboard user={user} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

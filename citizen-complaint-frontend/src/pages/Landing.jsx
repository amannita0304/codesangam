import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { StatCard } from "../components/StatCard";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const Landing = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_complaints: 0,
    resolved_complaints: 0,
    pending_complaints: 0,
    in_progress_complaints: 0,
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API}/statistics`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleSubmitComplaint = () => {
    if (user) {
      if (user.role === "citizen") {
        navigate("/submit-complaint");
      } else {
        alert(
          "Only citizens can submit complaints. Please use your dashboard to manage complaints."
        );
      }
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50">
      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Your Voice,
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                {" "}
                Our Priority
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Report communal issues like waterlogging, road damage, and
              infrastructure problems. Track your complaints in real-time and
              help build a better community.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={handleSubmitComplaint}
              data-testid="submit-complaint-hero-button"
            >
              Submit a Complaint
            </Button>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Complaints"
              value={stats.total_complaints}
              icon="📊"
              color="text-teal-700"
              bgColor="bg-gradient-to-br from-teal-50 to-teal-100"
            />
            <StatCard
              title="Resolved"
              value={stats.resolved_complaints}
              icon="✅"
              color="text-emerald-700"
              bgColor="bg-gradient-to-br from-emerald-50 to-emerald-100"
            />
            <StatCard
              title="In Progress"
              value={stats.in_progress_complaints}
              icon="⏳"
              color="text-orange-700"
              bgColor="bg-gradient-to-br from-orange-50 to-orange-100"
            />
            <StatCard
              title="Pending"
              value={stats.pending_complaints}
              icon="🔔"
              color="text-amber-700"
              bgColor="bg-gradient-to-br from-amber-50 to-amber-100"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Register & Login
              </h3>
              <p className="text-gray-600">
                Create your account as a citizen to get started with submitting
                complaints.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Submit Complaint
              </h3>
              <p className="text-gray-600">
                Report issues with detailed descriptions and location
                information.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Track Progress
              </h3>
              <p className="text-gray-600">
                Monitor the status of your complaints and receive updates in
                real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-emerald-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-teal-50 mb-8">
            Join thousands of citizens working together to improve our community
            infrastructure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!user && (
              <>
                <Button
                  size="lg"
                  className="bg-white text-teal-700 hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-lg"
                  onClick={() => navigate("/signup")}
                  data-testid="signup-cta-button"
                >
                  Get Started
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-teal-700 px-8 py-6 text-lg rounded-full"
                  onClick={() => navigate("/login")}
                  data-testid="login-cta-button"
                >
                  Login
                </Button>
              </>
            )}
            {user && (
              <Button
                size="lg"
                className="bg-white text-teal-700 hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-lg"
                onClick={() => navigate("/dashboard")}
                data-testid="dashboard-cta-button"
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ComplaintCard } from "../components/ComplaintCard";

import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const CitizenDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user]);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/complaints`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setComplaints(response.data);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = (status) => {
    if (status === "all") return complaints;
    return complaints.filter((c) => c.status === status);
  };

  const getStatusCount = (status) => {
    if (status === "all") return complaints.length;
    return complaints.filter((c) => c.status === status).length;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            My Complaints
          </h1>
          <p className="text-gray-600">
            Track and manage your submitted complaints
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <Button
            onClick={() => navigate("/submit-complaint")}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
            data-testid="new-complaint-button"
          >
            + Submit New Complaint
          </Button>
        </div>

        {/* Complaints Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({getStatusCount("all")})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({getStatusCount("pending")})
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress">
              In Progress ({getStatusCount("in_progress")})
            </TabsTrigger>
            <TabsTrigger value="resolved" data-testid="tab-resolved">
              Resolved ({getStatusCount("resolved")})
            </TabsTrigger>
          </TabsList>

          {["all", "pending", "in_progress", "resolved"].map((status) => (
            <TabsContent key={status} value={status}>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Loading complaints...</p>
                </div>
              ) : filterComplaints(status).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p
                      className="text-gray-600"
                      data-testid="no-complaints-message"
                    >
                      No complaints found in this category.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filterComplaints(status).map((complaint) => (
                    <ComplaintCard
                      key={complaint.id}
                      complaint={complaint}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

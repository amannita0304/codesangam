import React, { useEffect, useState } from "react";
import { ComplaintCard } from "../components/ComplaintCard";

import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const StaffDashboard = ({ user }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);

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

  const handleUpdateStatus = async () => {
    if (!newStatus || !selectedComplaint) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/complaints/${selectedComplaint.id}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Complaint status updated successfully!");
      setSelectedComplaint(null);
      setNewStatus("");
      fetchComplaints();
    } catch (error) {
      alert(
        error.response?.data?.detail || "Failed to update complaint status"
      );
    } finally {
      setUpdating(false);
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

  if (!user || !user.approved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pending Approval
            </h2>
            <p className="text-gray-600">
              Your staff account is awaiting admin approval. Please check back
              later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Staff Dashboard
          </h1>
          <p className="text-gray-600">Manage and update complaint statuses</p>
        </div>

        {/* Complaints Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="all" data-testid="staff-tab-all">
              All ({getStatusCount("all")})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="staff-tab-pending">
              Pending ({getStatusCount("pending")})
            </TabsTrigger>
            <TabsTrigger
              value="in_progress"
              data-testid="staff-tab-in-progress"
            >
              In Progress ({getStatusCount("in_progress")})
            </TabsTrigger>
            <TabsTrigger value="resolved" data-testid="staff-tab-resolved">
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
                    <p className="text-gray-600">
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
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setNewStatus(complaint.status);
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Update Status Dialog */}
        <Dialog
          open={!!selectedComplaint}
          onOpenChange={() => setSelectedComplaint(null)}
        >
          <DialogContent data-testid="update-status-dialog">
            <DialogHeader>
              <DialogTitle>Update Complaint Status</DialogTitle>
              <DialogDescription>{selectedComplaint?.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Status</Label>
                <p className="text-sm text-gray-600 capitalize">
                  {selectedComplaint?.status.replace("_", " ")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newStatus">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid="status-select">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === selectedComplaint?.status}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                data-testid="update-status-submit-button"
              >
                {updating ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { ComplaintCard } from "../components/ComplaintCard";

import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboard = ({ user }) => {
  const [complaints, setComplaints] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [approvedStaff, setApprovedStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("complaints");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [complaintsRes, pendingStaffRes, approvedStaffRes] =
        await Promise.all([
          axios.get(`${API}/complaints`, { headers }),
          axios.get(`${API}/users/staff/pending`, { headers }),
          axios.get(`${API}/users/staff`, { headers }),
        ]);

      setComplaints(complaintsRes.data);
      setPendingStaff(pendingStaffRes.data);
      setApprovedStaff(approvedStaffRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStaff = async (staffId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/users/staff/${staffId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Staff member approved successfully!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to approve staff member");
    }
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const updateData = {};

      if (newStatus && newStatus !== selectedComplaint.status) {
        updateData.status = newStatus;
      }

      if (
        assignedStaffId &&
        assignedStaffId !== selectedComplaint.assigned_staff_id
      ) {
        updateData.assigned_staff_id = assignedStaffId;
      }

      await axios.put(`${API}/complaints/${selectedComplaint.id}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      alert("Complaint updated successfully!");
      setSelectedComplaint(null);
      setNewStatus("");
      setAssignedStaffId("");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to update complaint");
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">Manage complaints and staff approvals</p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="complaints" data-testid="admin-tab-complaints">
              Complaints ({complaints.length})
            </TabsTrigger>
            <TabsTrigger value="staff" data-testid="admin-tab-staff">
              Staff Management
              {pendingStaff.length > 0 && (
                <Badge className="ml-2 bg-red-500">{pendingStaff.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Complaints Tab */}
          <TabsContent value="complaints">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="all">
                  All ({getStatusCount("all")})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({getStatusCount("pending")})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress ({getStatusCount("in_progress")})
                </TabsTrigger>
                <TabsTrigger value="resolved">
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
                            setAssignedStaffId(
                              complaint.assigned_staff_id || ""
                            );
                          }}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff">
            <div className="space-y-6">
              {/* Pending Staff */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Pending Staff Approvals ({pendingStaff.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingStaff.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">
                      No pending staff approvals
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pendingStaff.map((staff) => (
                        <div
                          key={staff.id}
                          className="flex items-center justify-between p-4 bg-amber-50 rounded-lg"
                          data-testid={`pending-staff-${staff.id}`}
                        >
                          <div>
                            <p className="font-semibold text-gray-900">
                              {staff.username}
                            </p>
                            <p className="text-sm text-gray-600">
                              {staff.email}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleApproveStaff(staff.id)}
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                            data-testid={`approve-staff-${staff.id}`}
                          >
                            Approve
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approved Staff */}
              <Card>
                <CardHeader>
                  <CardTitle>Approved Staff ({approvedStaff.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {approvedStaff.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">
                      No approved staff members
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {approvedStaff.map((staff) => (
                        <div
                          key={staff.id}
                          className="p-4 bg-emerald-50 rounded-lg"
                          data-testid={`approved-staff-${staff.id}`}
                        >
                          <p className="font-semibold text-gray-900">
                            {staff.username}
                          </p>
                          <p className="text-sm text-gray-600">{staff.email}</p>
                          <Badge className="mt-2 bg-emerald-600">Active</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Update Complaint Dialog */}
        <Dialog
          open={!!selectedComplaint}
          onOpenChange={() => setSelectedComplaint(null)}
        >
          <DialogContent data-testid="admin-update-dialog">
            <DialogHeader>
              <DialogTitle>Manage Complaint</DialogTitle>
              <DialogDescription>{selectedComplaint?.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid="admin-status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign to Staff</Label>
                <Select
                  value={assignedStaffId}
                  onValueChange={setAssignedStaffId}
                >
                  <SelectTrigger data-testid="admin-assign-staff-select">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {approvedStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleUpdateComplaint}
                disabled={updating}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                data-testid="admin-update-submit-button"
              >
                {updating ? "Updating..." : "Update Complaint"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

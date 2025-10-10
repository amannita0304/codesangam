import React from "react";

const categoryColors = {
  waterlogging: "bg-blue-100 text-blue-800",
  water_accessibility: "bg-cyan-100 text-cyan-800",
  road_issues: "bg-amber-100 text-amber-800",
  street_lights: "bg-yellow-100 text-yellow-800",
  waste_management: "bg-green-100 text-green-800",
  others: "bg-gray-100 text-gray-800",
};

const statusColors = {
  pending: "bg-red-100 text-red-800",
  in_progress: "bg-orange-100 text-orange-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export const ComplaintCard = ({ complaint, onClick }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryLabel = (category) => {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
      onClick={onClick}
      data-testid={`complaint-card-${complaint.id}`}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900">
            {complaint.title}
          </CardTitle>
          <Badge className={statusColors[complaint.status]}>
            {complaint.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4 line-clamp-2">
          {complaint.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge
            variant="outline"
            className={categoryColors[complaint.category]}
          >
            {getCategoryLabel(complaint.category)}
          </Badge>
          <Badge variant="outline" className="bg-gray-50 text-gray-700">
            📍 {complaint.location}
          </Badge>
        </div>
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>By: {complaint.citizen_username}</span>
          <span>{formatDate(complaint.created_at)}</span>
        </div>
        {complaint.assigned_staff_username && (
          <div className="mt-2 text-sm text-teal-600">
            Assigned to: {complaint.assigned_staff_username}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

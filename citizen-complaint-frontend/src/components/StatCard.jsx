import React from "react";

export const StatCard = ({ title, value, icon, color, bgColor }) => {
  return (
    <Card
      className={`${bgColor} border-0 shadow-md hover:shadow-lg transition-shadow duration-200`}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${color} opacity-80`}>{title}</p>
            <p
              className={`text-3xl font-bold ${color} mt-2`}
              data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}
            >
              {value}
            </p>
          </div>
          <div className={`text-4xl ${color} opacity-60`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

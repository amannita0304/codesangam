**The Caravan Chronicle**
**Tracking and fixing the city's daily troubles.**
This is a full-stack application for managing municipal complaints, providing a platform for citizens to report issues and for municipal staff to handle them efficiently.

**Key Features**
User Authentication: The system provides secure accounts for citizens to submit and track complaints. It handles three user roles: citizen, staff, and admin.

Complaint Management: Citizens can report issues with text, location, and a photo upload. Complaints progress through different status stages: OPEN, IN PROGRESS, and RESOLVED.

Municipal Dashboard: Staff members can view, assign, and update complaints from a dedicated dashboard.

Reporting & Analytics: The system allows for filtering complaints by type, area, urgency, or date. Admins can generate downloadable CSV and PDF reports for monthly analysis.

Advanced Features: The system includes a Service Level Agreement (SLA) tracking feature to monitor how long issues remain unresolved and highlights overdue ones. It also supports push notifications for status changes and overdue reminders.

**How It Works**
The system operates based on user roles and a defined complaint lifecycle.

Citizen Action: A citizen registers and logs in to the system. They can then submit a new complaint, providing details like the type of issue, a description, and the location. They can also upload a photo to support their report. The complaint is created with an OPEN status and a unique ID.

Staff & Admin Management: An admin logs into the system to view all complaints. They can then assign an OPEN complaint to a specific staff member. Once assigned, the complaint status changes to IN PROGRESS. The assigned staff member can then view and update the complaint from their dashboard, adding notes or a resolution photo.

Resolution & Reporting: After a complaint is resolved, the status is updated to RESOLVED. This information is reflected in the citizen portal, which allows the citizen to track the progress of their complaint. Admins can use the reporting tools to generate reports on all complaints, providing insights into trends and resolution times.

Notifications: The system sends notifications to citizens about status updates on their complaints and provides reminders for overdue issues.

**Technology Stack**
Frontend: Built with React using Vite as the build tool and development server. The language used is TypeScript.

Backend: Developed with Node.js and Express. It uses MongoDB as the database with Mongoose for data modeling. Password hashing is handled by bcryptjs, and file uploads are managed by multer.

Database: MongoDB.

Installation & Setup
Prerequisite required
Node.js

MongoDB

1. **Backend Setup**
Clone the repository and navigate to the backend directory.

Installed the required dependencies by running npm install.

Create a .env file in the root backend folder with your MongoDB connection string and JWT secret.


2. **Frontend Setup**
Navigate to the citizen-complaint-frontend directory.

Installed dependencies by running npm install.

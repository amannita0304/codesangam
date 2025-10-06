**Municipal Complaint System Backend**
This project provides the backend services for a municipal complaint system, built with Node.js, Express, and MongoDB.

**Key Features:**
User Management: Handles citizen, staff, and admin roles. Passwords are encrypted using bcrypt.js.

Complaint Management: Citizens can submit complaints with descriptions, locations, and photos. Complaints are assigned a unique ID, and admins can assign them to staff.

Authentication & Authorization: Routes are secured with JSON Web Tokens (JWT). Role-based access control restricts certain endpoints to admin or staff users.

Reporting: Admins can view dashboard statistics and generate downloadable CSV and PDF reports of all complaints.

Notifications: The system includes a schema for handling user notifications related to complaints.

**API Endpoints:**
All API endpoints are prefixed with /api/v1.

Category	Endpoint	Description
Authentication	POST /auth/register	Register a new user
POST /auth/login	Log in a user
GET /auth/me	Get user details (protected)
Complaints	POST /complaints	Create a new complaint
GET /complaints/citizen/my-complaints	Get a citizen's own complaints
GET /complaints/staff/assigned	Get complaints assigned to staff (staff only)
GET /complaints	Get all complaints (admin/staff only)
GET /complaints/:id	Get a single complaint by ID
PUT /complaints/:id/assign	Assign a complaint (admin only)
User Management	GET /users	Get all users (admin only)
POST /users	Create a new user (admin only)
GET /users/staff	Get all staff members (admin only)
Reports	GET /reports/dashboard	Get dashboard statistics (admin only)
GET /reports/csv	Download CSV report (admin only)
GET /reports/pdf	Download PDF report (admin only)

Export to Sheets
**Installation**
Clone the repository.


git clone <repository-url>
cd <project-folder>
Install dependencies.


npm install
Set up environment variables. Create a .env file with your MONGODB_URI and other configurations.

Run the server.


npm start

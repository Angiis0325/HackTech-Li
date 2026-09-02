const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const clientRoutes = require("./routes/client.routes");
const serviceRoutes = require("./routes/service.routes");
const reservationRoutes = require("./routes/reservation.routes");
const integrationRoutes = require("./routes/integration.routes");
const auditRoutes = require("./routes/audit.routes");
const staffRoutes = require("./routes/staff.routes");
const userRoutes = require("./routes/user.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin === "*" ? true : env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
	res.json({
		data: {
			name: "HackTech Li Backend",
			status: "running",
			docs: "/api"
		}
	});
});

app.get("/api", (req, res) => {
	res.json({
		data: {
			endpoints: [
				"GET /api/health",
				"GET /api/services",
				"POST /api/clients/register",
				"GET /api/clients/lookup",
				"POST /api/auth/register",
				"POST /api/auth/login",
				"POST /api/reservations/public",
				"PATCH /api/reservations/public/:id/reschedule",
				"PATCH /api/reservations/public/:id/cancel",
				"GET /api/reservations/availability",
				"GET /api/reservations (auth)",
				"GET /api/reservations/:id (auth)",
				"PATCH /api/reservations/:id/status (auth)",
				"GET /api/staff (auth)",
				"GET /api/users (admin)",
				"PATCH /api/integrations/n8n/reservations/:id/status (token)",
				"GET /api/audit-logs (auth)"
			]
		}
	});
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/audit-logs", auditRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

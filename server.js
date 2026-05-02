const express = require("express");
const cors = require("cors");
const path = require("path");
const { attachUser, requireAuth, requireRole } = require("./config/auth");

// Load environment variables
require("dotenv").config();

// Import routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachUser);

// Static routes
app.get("/", requireAuth, (req, res) => {
  if (req.user.role === "employee") {
    res.redirect("/staff-dashboard.html");
    return;
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/index.html", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/dashboard.html", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/form.html", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.get("/admin-users.html", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-users.html"));
});

app.get("/account.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "account.html"));
});

app.get("/audit-log.html", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "audit-log.html"));
});

app.get("/staff-dashboard", requireRole("employee", "admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public", "staff-dashboard.html"));
});

app.get(
  "/staff-dashboard.html",
  requireRole("employee", "admin"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "staff-dashboard.html"));
  }
);

app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

// Use API routes
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

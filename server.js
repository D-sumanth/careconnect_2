const express = require("express");
const cors = require("cors");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Import routes
const apiRoutes = require("./routes/api");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

// Static routes
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/staff-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "staff-dashboard.html"));
});

// Use API routes
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

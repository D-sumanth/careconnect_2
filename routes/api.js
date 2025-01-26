const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Test database connection
router.get("/test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({
      message: "Database connection successful",
      data: rows,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Submit form
router.post("/forms", async (req, res) => {
  try {
    const {
      home,
      department,
      nameDesignation,
      information,
      authorizedBy,
      state,
      sendTo,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO information 
      (home, department, name_designation, information, authorized_by, state_type, send_to) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        home,
        department,
        nameDesignation,
        information,
        authorizedBy,
        state,
        JSON.stringify(sendTo),
      ]
    );

    res.json({
      success: true,
      message: "Form submitted successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting form",
      error: error.message,
    });
  }
});

// Get all staff members
router.get("/staff", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM staff ORDER BY name");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// Get XXXXXXXXXXXXXXX for specific info
router.get("/acknowledgments/:infoId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.acknowledged_at, s.name as staff_name
       FROM tempstaff a
       JOIN staff s ON a.staff_id = s.id
       WHERE a.info_id = ?
       ORDER BY a.acknowledged_at DESC`,
      [req.params.infoId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching XXXXXXXXXXXXXXX:", error);
    res.status(500).json({ error: "Failed to fetch XXXXXXXXXXXXXXX" });
  }
});

// Get acknowledgment status
router.get("/acknowledgment-status/:infoId", async (req, res) => {
  try {
    const [staffCount] = await db.query("SELECT COUNT(*) as total FROM staff");
    const [ackCount] = await db.query(
      "SELECT COUNT(DISTINCT staff_id) as count FROM tempstaff WHERE info_id = ?",
      [req.params.infoId]
    );

    res.json({
      isFullyAcknowledged: ackCount[0].count === staffCount[0].total,
      totalStaff: staffCount[0].total,
      acknowledgedCount: ackCount[0].count,
    });
  } catch (error) {
    console.error("Error checking acknowledgment status:", error);
    res.status(500).json({ error: "Failed to check acknowledgment status" });
  }
});

// Acknowledge info
router.post("/acknowledge", async (req, res) => {
  const { infoId, staffId } = req.body;
  try {
    await db.query(
      "INSERT INTO tempstaff (info_id, staff_id, acknowledged_at) VALUES (?, ?, NOW())",
      [infoId, staffId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving acknowledgment:", error);
    res.status(500).json({ error: "Failed to save acknowledgment" });
  }
});

// Get counts
router.get("/counts", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT in_house, new_admissions FROM counts ORDER BY id DESC LIMIT 1"
    );
    res.json(rows[0] || { in_house: 0, new_admissions: 0 });
  } catch (error) {
    console.error("Error fetching counts:", error);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// Update counts
router.post("/update-counts", async (req, res) => {
  try {
    const { inHouse, newAdmissions } = req.body;
    await db.query(
      "INSERT INTO counts (in_house, new_admissions) VALUES (?, ?)",
      [inHouse, newAdmissions]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating counts:", error);
    res.status(500).json({ error: "Failed to update counts" });
  }
});

// Add staff
router.post("/add-staff", async (req, res) => {
  try {
    const { name, department } = req.body;
    if (!name || !department) {
      return res.status(400).json({ error: "Name and department are required" });
    }
    await db.query(
      "INSERT INTO staff (name, department) VALUES (?, ?)",
      [name, department]
    );
    res.json({ success: true, message: "Staff member added successfully" });
  } catch (error) {
    console.error("Error adding staff:", error);
    res.status(500).json({ error: "Failed to add staff" });
  }
});

// Get all forms
router.get("/forms", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM information ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching forms:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching forms",
      error: error.message,
    });
  }
});

module.exports = router;

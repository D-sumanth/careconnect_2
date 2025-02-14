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
      name,
      designation,
      information,
      authorizedBy,
      state,
      sendTo,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO information 
      (home, department, name, designation, information, authorized_by, state_type, send_to) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        home,
        department,
        name,
        designation,
        information,
        authorizedBy,
        state,
        sendTo,
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
    // Check for existing acknowledgment
    const [existingAck] = await db.query(
      "SELECT * FROM tempstaff WHERE info_id = ? AND staff_id = ?",
      [infoId, staffId]
    );

    if (existingAck.length > 0) {
      return res.json({
        success: false,
        error: "ALREADY_ACKNOWLEDGED",
        message: "Staff member has already acknowledged this information",
      });
    }

    await db.query(
      "INSERT INTO tempstaff (info_id, staff_id, acknowledged_at) VALUES (?, ?, NOW())",
      [infoId, staffId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error in acknowledgment:", error);
    res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Internal server error",
    });
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
      return res
        .status(400)
        .json({ error: "Name and department are required" });
    }
    await db.query("INSERT INTO staff (name, department) VALUES (?, ?)", [
      name,
      department,
    ]);
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

// Add these new endpoints to api.js
router.get("/dashboard-stats", async (req, res) => {
  try {
    // Get counts of fully acknowledged information blocks
    const [infoStats] = await db.query(`
      SELECT 
  COUNT(DISTINCT i.id) as totalInformation,
  SUM(
    CASE 
      WHEN COALESCE(t_count.ack_count, 0) >= COALESCE(s_count.staff_count, 0) 
      AND s_count.staff_count > 0 THEN 1 
      ELSE 0 
    END
  ) as acknowledgedCount,
  COUNT(DISTINCT i.id) - SUM(
    CASE 
      WHEN COALESCE(t_count.ack_count, 0) >= COALESCE(s_count.staff_count, 0) 
      AND s_count.staff_count > 0 THEN 1 
      ELSE 0 
    END
  ) as pendingCount
FROM information i
LEFT JOIN (
  SELECT info_id, COUNT(DISTINCT staff_id) as ack_count
  FROM tempstaff
  GROUP BY info_id
) t_count ON i.id = t_count.info_id
LEFT JOIN (
  SELECT department, COUNT(*) as staff_count
  FROM staff
  GROUP BY department
) s_count ON i.department = s_count.department;
    `);

    // Get department breakdown
    // In the /dashboard-stats endpoint, modify the departmentStats query
    const [departmentStats] = await db.query(`
  SELECT 
    i.department as sending_department,
    COUNT(*) as total_sent,
    SUM(
      CASE 
        WHEN COALESCE(t_count.ack_count, 0) >= COALESCE(s_count.staff_count, 0) 
        AND s_count.staff_count > 0 THEN 1 
        ELSE 0 
      END
    ) as acknowledged,
    COUNT(*) - SUM(
      CASE 
        WHEN COALESCE(t_count.ack_count, 0) >= COALESCE(s_count.staff_count, 0) 
        AND s_count.staff_count > 0 THEN 1 
        ELSE 0 
      END
    ) as pending
  FROM information i
  LEFT JOIN (
    SELECT info_id, COUNT(DISTINCT staff_id) as ack_count
    FROM tempstaff
    GROUP BY info_id
  ) t_count ON i.id = t_count.info_id
  LEFT JOIN (
    SELECT department, COUNT(*) as staff_count
    FROM staff
    GROUP BY department
  ) s_count ON i.department = s_count.department
  GROUP BY i.department
  ORDER BY i.department
`);

    res.json({
      infoStats: infoStats[0],
      departmentStats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add endpoint to check individual acknowledgment status
router.get("/acknowledgment-status/:infoId", async (req, res) => {
  try {
    const { infoId } = req.params;

    const [status] = await db.query(
      `
      SELECT 
        CASE 
          WHEN COUNT(DISTINCT t.staff_id) = (
            SELECT COUNT(*) 
            FROM staff 
            WHERE department = i.department
          ) THEN true 
          ELSE false 
        END as isFullyAcknowledged
      FROM information i
      LEFT JOIN tempstaff t ON i.id = t.info_id
      WHERE i.id = ?
      GROUP BY i.id, i.department
    `,
      [infoId]
    );

    res.json({
      isFullyAcknowledged: status[0]?.isFullyAcknowledged || false,
    });
  } catch (error) {
    console.error("Error checking acknowledgment status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

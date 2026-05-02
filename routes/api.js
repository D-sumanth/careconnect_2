const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { requireAuth, requireRole } = require("../config/auth");

router.use(async (req, res, next) => {
  try {
    await db.ready();
    next();
  } catch (error) {
    res.status(500).json({
      error: "Database is not ready",
      details: error.message,
    });
  }
});

router.use(requireAuth);

function targetStaffCte() {
  return `
    WITH target_staff AS (
      SELECT DISTINCT s.id, s.name, s.department
      FROM staff s
      JOIN app_users u
        ON u.staff_id = s.id
       AND u.role = 'employee'
       AND u.is_active = TRUE
      JOIN information i ON i.id = ?
      WHERE i.send_to @> '["All"]'::jsonb
         OR LOWER(s.department) = LOWER(i.department)
         OR EXISTS (
           SELECT 1
           FROM jsonb_array_elements_text(i.send_to) AS target(value)
           WHERE LOWER(target.value) = LOWER(s.department)
         )
    )
  `;
}

async function staffIsTargeted(infoId, staffId) {
  const [rows] = await db.query(
    `${targetStaffCte()}
     SELECT 1 AS ok FROM target_staff WHERE id = ? LIMIT 1`,
    [infoId, staffId]
  );

  return Boolean(rows[0]);
}

async function staffMatchesUserDepartment(staffId, department) {
  const [rows] = await db.query(
    `SELECT 1 AS ok
     FROM staff
     WHERE id = ?
       AND LOWER(department) = LOWER(?)
     LIMIT 1`,
    [staffId, department || ""]
  );

  return Boolean(rows[0]);
}

// Test database connection
router.get("/test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");
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
router.post("/forms", requireRole("admin"), async (req, res) => {
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb)
      RETURNING id`,
      [
        home,
        department,
        name,
        designation,
        information,
        authorizedBy,
        state,
        JSON.stringify(sendTo),
      ]
    );

    res.json({
      success: true,
      message: "Form submitted successfully",
      id: result[0]?.id,
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
router.get("/staff", requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM staff ORDER BY name");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// Get staff list scoped for acknowledgment on shared department devices
router.get("/department-staff", requireRole("employee", "admin"), async (req, res) => {
  try {
    const departmentFilter =
      req.user.role === "admin"
        ? String(req.query.department || "").trim()
        : req.user.department;

    if (!departmentFilter) {
      res.json({ staff: [] });
      return;
    }

    const [rows] = await db.query(
      `SELECT DISTINCT s.id, s.name, s.department
       FROM staff s
       JOIN app_users u
         ON u.staff_id = s.id
        AND u.role = 'employee'
        AND u.is_active = TRUE
       WHERE LOWER(s.department) = LOWER(?)
       ORDER BY s.name`,
      [departmentFilter]
    );

    res.json({ staff: rows });
  } catch (error) {
    console.error("Error fetching department staff:", error);
    res.status(500).json({ error: "Failed to fetch department staff" });
  }
});

// Get acknowledgments for specific info
router.get("/acknowledgments/:infoId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.acknowledged_at, s.name AS staff_name, s.department
       FROM tempstaff a
       JOIN staff s ON a.staff_id = s.id
       WHERE a.info_id = ?
       ORDER BY a.acknowledged_at DESC`,
      [req.params.infoId]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching acknowledgments:", error);
    res.status(500).json({ error: "Failed to fetch acknowledgments" });
  }
});

// Get acknowledgment status
router.get("/acknowledgment-status/:infoId", async (req, res) => {
  try {
    const [rows] = await db.query(
      `${targetStaffCte()}
       SELECT
         COUNT(ts.id) AS total,
         COUNT(a.staff_id) AS acknowledged_count
       FROM target_staff ts
       LEFT JOIN tempstaff a
         ON a.staff_id = ts.id
        AND a.info_id = ?`,
      [req.params.infoId, req.params.infoId]
    );

    const total = Number(rows[0]?.total || 0);
    const acknowledgedCount = Number(rows[0]?.acknowledged_count || 0);

    res.json({
      isFullyAcknowledged: total > 0 && acknowledgedCount === total,
      totalStaff: total,
      acknowledgedCount,
      pendingCount: Math.max(total - acknowledgedCount, 0),
    });
  } catch (error) {
    console.error("Error checking acknowledgment status:", error);
    res.status(500).json({ error: "Failed to check acknowledgment status" });
  }
});

// Get acknowledgment report with pending staff
router.get(
  "/acknowledgment-report/:infoId",
  requireRole("admin"),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `${targetStaffCte()}
         SELECT
           ts.id AS staff_id,
           ts.name AS staff_name,
           ts.department,
           a.acknowledged_at
         FROM target_staff ts
         LEFT JOIN tempstaff a
           ON a.staff_id = ts.id
          AND a.info_id = ?
         ORDER BY a.acknowledged_at IS NULL DESC, ts.department, ts.name`,
        [req.params.infoId, req.params.infoId]
      );

      const acknowledged = rows.filter((row) => row.acknowledged_at);
      const pending = rows.filter((row) => !row.acknowledged_at);

      res.json({
        totalStaff: rows.length,
        acknowledgedCount: acknowledged.length,
        pendingCount: pending.length,
        acknowledged,
        pending,
      });
    } catch (error) {
      console.error("Error loading acknowledgment report:", error);
      res.status(500).json({ error: "Failed to load acknowledgment report" });
    }
  }
);

// Acknowledge info
router.post("/acknowledge", requireRole("employee", "admin"), async (req, res) => {
  const infoId = req.body.infoId;
  const requestedStaffId = req.body.staffId ? Number(req.body.staffId) : null;
  const staffId =
    req.user.role === "employee" ? req.user.staffId || requestedStaffId : requestedStaffId;

  if (!staffId) {
    res.status(400).json({ error: "Staff selection is required for acknowledgment" });
    return;
  }

  try {
    if (req.user.role === "employee" && !req.user.staffId) {
      const matchesDepartment = await staffMatchesUserDepartment(
        staffId,
        req.user.department
      );
      if (!matchesDepartment) {
        res.status(403).json({
          error: "Selected staff member is not in this device department",
        });
        return;
      }
    }

    const isTargeted = await staffIsTargeted(infoId, staffId);
    if (!isTargeted) {
      res.status(403).json({
        error: "This staff member is not assigned to acknowledge this notice",
      });
      return;
    }

    await db.query(
      `INSERT INTO tempstaff (info_id, staff_id, acknowledged_at)
       VALUES (?, ?, NOW())
       ON CONFLICT (info_id, staff_id) DO NOTHING`,
      [infoId, staffId]
    );
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?::jsonb)`,
      [
        req.user.id,
        "acknowledge_notice",
        "information",
        Number(infoId),
        JSON.stringify({
          staffId,
          acknowledgedByLogin: req.user.email,
          sharedDeviceMode: Boolean(req.user.role === "employee" && !req.user.staffId),
        }),
      ]
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
router.post("/update-counts", requireRole("admin"), async (req, res) => {
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
router.post("/add-staff", requireRole("admin"), async (req, res) => {
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

// Get recent audit activity
router.get("/audit-log", requireRole("admin"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 250);

  try {
    const [rows] = await db.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
              u.name AS user_name, u.email AS user_email, u.role AS user_role
       FROM audit_log a
       LEFT JOIN app_users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ events: rows });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// Get all forms
router.get("/forms", async (req, res) => {
  try {
    const [rows] =
      req.user.role === "admin"
        ? await db.query(
            `SELECT i.*,
                    COALESCE(status.total_staff, 0) AS total_staff,
                    COALESCE(status.acknowledged_count, 0) AS acknowledged_count
             FROM information i
             LEFT JOIN LATERAL (
               SELECT
                 COUNT(ts.id) AS total_staff,
                 COUNT(a.staff_id) AS acknowledged_count
               FROM (
                 SELECT DISTINCT s.id
                 FROM staff s
                 JOIN app_users u
                   ON u.staff_id = s.id
                  AND u.role = 'employee'
                  AND u.is_active = TRUE
                 WHERE i.send_to @> '["All"]'::jsonb
                    OR LOWER(s.department) = LOWER(i.department)
                    OR EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements_text(i.send_to) AS target(value)
                      WHERE LOWER(target.value) = LOWER(s.department)
                    )
               ) ts
               LEFT JOIN tempstaff a
                 ON a.staff_id = ts.id
                AND a.info_id = i.id
             ) status ON TRUE
             ORDER BY i.created_at DESC`
          )
        : await db.query(
            `SELECT i.*,
                    EXISTS (
                      SELECT 1
                      FROM tempstaff a
                      WHERE a.info_id = i.id
                        AND a.staff_id = ?
                    ) AS acknowledged_by_current_user
             FROM information i
             WHERE i.send_to @> ?::jsonb
                OR i.send_to @> ?::jsonb
                OR LOWER(i.department) = LOWER(?)
             ORDER BY i.created_at DESC`,
            [
              req.user.staffId || 0,
              JSON.stringify(["All"]),
              JSON.stringify([req.user.department || ""]),
              req.user.department || "",
            ]
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

const express = require("express");
const crypto = require("crypto");
const db = require("../config/database");
const {
  requireAuth,
  requireRole,
  setSessionCookie,
  clearSessionCookie,
} = require("../config/auth");
const { hashPassword, verifyPassword } = require("../config/passwords");

const router = express.Router();

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

router.get("/me", (req, res) => {
  res.json({ user: req.user || null });
});

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanText(value) {
  return String(value || "").trim();
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    staffId: row.staff_id,
    staffName: row.staff_name || null,
    department: row.department,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function writeAudit(userId, action, entityType, entityId, metadata = {}) {
  await db.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
     VALUES (?, ?, ?, ?, ?::jsonb)`,
    [userId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}

router.post("/login", async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.name, u.role, u.staff_id,
              COALESCE(u.department, s.department) AS department,
              u.is_active
       FROM app_users u
       LEFT JOIN staff s ON s.id = u.staff_id
       WHERE LOWER(u.email) = ?`,
      [email]
    );

    const user = users[0];
    if (!user || !user.is_active) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const passwordIsValid = await verifyPassword(password, user.password_hash);
    if (!passwordIsValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await db.query("UPDATE app_users SET last_login_at = NOW() WHERE id = ?", [
      user.id,
    ]);

    await writeAudit(user.id, "login", "app_user", user.id, {
      role: user.role,
    });

    setSessionCookie(req, res, user);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        staffId: user.staff_id,
        department: user.department,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new password are required" });
    return;
  }

  if (newPassword.length < 10) {
    res.status(400).json({ error: "New password must be at least 10 characters" });
    return;
  }

  try {
    const [users] = await db.query(
      "SELECT id, password_hash FROM app_users WHERE id = ? AND is_active = TRUE",
      [req.user.id]
    );
    const user = users[0];

    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await hashPassword(newPassword);
    await db.query(
      "UPDATE app_users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
      [passwordHash, req.user.id]
    );
    await writeAudit(req.user.id, "change_password", "app_user", req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.get("/users", requireRole("admin"), async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.staff_id, s.name AS staff_name,
              COALESCE(u.department, s.department) AS department,
              u.is_active, u.last_login_at, u.created_at, u.updated_at
       FROM app_users u
       LEFT JOIN staff s ON s.id = u.staff_id
       ORDER BY u.is_active DESC, u.role, u.name`
    );
    res.json({ users: users.map(publicUser) });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Failed to load users" });
  }
});

router.post("/users", requireRole("admin"), async (req, res) => {
  const email = cleanEmail(req.body.email);
  const name = cleanText(req.body.name);
  const role = cleanText(req.body.role || "employee").toLowerCase();
  const department = cleanText(req.body.department);
  const staffId = req.body.staffId ? Number(req.body.staffId) : null;
  const createStaff = Boolean(req.body.createStaff);
  const suppliedPassword = cleanText(req.body.password);
  const password = suppliedPassword || generateTemporaryPassword();

  if (!email || !name || !role) {
    res.status(400).json({ error: "Email, name, and role are required" });
    return;
  }

  if (!["admin", "employee"].includes(role)) {
    res.status(400).json({ error: "Role must be admin or employee" });
    return;
  }

  if (role === "employee" && !department) {
    res.status(400).json({ error: "Department is required for employees" });
    return;
  }

  if (password.length < 10) {
    res.status(400).json({ error: "Password must be at least 10 characters" });
    return;
  }

  try {
    const [existingUsers] = await db.query(
      "SELECT id FROM app_users WHERE LOWER(email) = ?",
      [email]
    );
    if (existingUsers[0]) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    let linkedStaffId = staffId;
    if (createStaff) {
      const [staffRows] = await db.query(
        "INSERT INTO staff (name, department) VALUES (?, ?) RETURNING id",
        [name, department || "Admin"]
      );
      linkedStaffId = staffRows[0]?.id || null;
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db.query(
      `INSERT INTO app_users (email, password_hash, name, role, staff_id, department)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, email, name, role, staff_id, department, is_active, last_login_at, created_at, updated_at`,
      [email, passwordHash, name, role, linkedStaffId, department || null]
    );

    await writeAudit(req.user.id, "create_user", "app_user", created[0].id, {
      email,
      role,
      staffId: linkedStaffId,
    });

    res.status(201).json({
      user: publicUser(created[0]),
      temporaryPassword: suppliedPassword ? null : password,
    });
  } catch (error) {
    console.error("Create user error:", error);
    if (error.code === "23505") {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/users/:id", requireRole("admin"), async (req, res) => {
  const userId = Number(req.params.id);
  const updates = [];
  const params = [];
  let temporaryPassword = null;

  if (!Number.isInteger(userId) || userId < 1) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
    const name = cleanText(req.body.name);
    if (!name) {
      res.status(400).json({ error: "Name cannot be empty" });
      return;
    }
    updates.push("name = ?");
    params.push(name);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
    const email = cleanEmail(req.body.email);
    if (!email) {
      res.status(400).json({ error: "Email cannot be empty" });
      return;
    }
    updates.push("email = ?");
    params.push(email);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "role")) {
    const role = cleanText(req.body.role).toLowerCase();
    if (!["admin", "employee"].includes(role)) {
      res.status(400).json({ error: "Role must be admin or employee" });
      return;
    }
    updates.push("role = ?");
    params.push(role);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "department")) {
    updates.push("department = ?");
    params.push(cleanText(req.body.department) || null);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "staffId")) {
    const staffId = req.body.staffId ? Number(req.body.staffId) : null;
    updates.push("staff_id = ?");
    params.push(staffId);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, "isActive")) {
    const isActive = Boolean(req.body.isActive);
    if (!isActive && userId === req.user.id) {
      res.status(400).json({ error: "You cannot deactivate your own account" });
      return;
    }
    updates.push("is_active = ?");
    params.push(isActive);
  }

  if (req.body.resetPassword) {
    temporaryPassword = generateTemporaryPassword();
    updates.push("password_hash = ?");
    params.push(await hashPassword(temporaryPassword));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "No changes were provided" });
    return;
  }

  updates.push("updated_at = NOW()");
  params.push(userId);

  try {
    const [updated] = await db.query(
      `UPDATE app_users SET ${updates.join(", ")}
       WHERE id = ?
       RETURNING id, email, name, role, staff_id, department, is_active, last_login_at, created_at, updated_at`,
      params
    );

    if (!updated[0]) {
      res.status(404).json({ error: "User was not found" });
      return;
    }

    await writeAudit(req.user.id, "update_user", "app_user", userId, {
      resetPassword: Boolean(req.body.resetPassword),
    });

    res.json({
      user: publicUser(updated[0]),
      temporaryPassword,
    });
  } catch (error) {
    console.error("Update user error:", error);
    if (error.code === "23505") {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to update user" });
  }
});

module.exports = router;

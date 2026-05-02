const express = require("express");
const db = require("../config/database");
const { setSessionCookie, clearSessionCookie } = require("../config/auth");
const { verifyPassword } = require("../config/passwords");

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

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
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

    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?::jsonb)`,
      [
        user.id,
        "login",
        "app_user",
        user.id,
        JSON.stringify({ role: user.role }),
      ]
    );

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

module.exports = router;

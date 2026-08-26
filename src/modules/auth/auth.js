const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../../core/database/database.service"); // or require("../config/database")
const sendEmail = require("../../core/email/email.service").sendEmail; // or require("../utils/sendEmail")

/* ---------------- REGISTER ---------------- */

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        console.log(`[register] Attempt: name=${name}, email=${email}, role=${role || "user"}`);

        if (!name || !email || !password) {
            console.warn(`[register] Missing required fields`);
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // check if user exists
        const userExists = await db.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );
        if (userExists.rows.length > 0) {
            console.warn(`[register] User already exists: ${email}`);
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // insert user
        const result = await db.query(
            `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
            [name, email, hashedPassword, role || "user"]
        );

        console.log(`[register] User registered: id=${result.rows[0].id}, email=${email}`);

        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(`[register] Error:`, error.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- LOGIN ---------------- */

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(`[login] Attempt for email: ${email}`);

        if (!email || !password) {
            console.warn(`[login] Missing email or password`);
            return res.status(400).json({ message: "Email and password required" });
        }

        const result = await db.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            console.warn(`[login] No user found with email: ${email}`);
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const user = result.rows[0];

        const valid = await bcrypt.compare(password, user.password_hash);

        if (!valid) {
            console.warn(`[login] Wrong password for email: ${email}`);
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // generate access token (short-lived)
        const accessToken = jwt.sign(
            { user_id: user.id, role: user.role },
            process.env.JWT_SECRET || "super-secret-erp-key",
            { expiresIn: "15m" }
        );

        // generate refresh token (random, stored in DB)
        const refreshToken = crypto.randomBytes(40).toString("hex");

        await db.query(
            "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)",
            [user.id, refreshToken]
        );

        console.log(`[login] Login successful for user_id=${user.id}, role=${user.role}`);

        res.json({ accessToken, refreshToken });

    } catch (err) {
        console.error(`[login] Error:`, err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- ME ---------------- */

exports.me = async (req, res) => {
    try {
        const userId = req.user.user_id;

        console.log(`[me] Fetching profile for user_id=${userId}`);

        const result = await db.query(
            `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            console.warn(`[me] User not found for user_id=${userId}`);
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`[me] Profile returned for user_id=${userId}`);

        res.json(result.rows[0]);

    } catch (error) {
        console.error(`[me] Error:`, error.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- REFRESH TOKEN ---------------- */

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        console.log(`[refreshToken] Token refresh requested`);

        if (!refreshToken) {
            console.warn(`[refreshToken] No refresh token provided`);
            return res.status(401).json({ message: "Token required" });
        }

        const result = await db.query(
            "SELECT * FROM refresh_tokens WHERE token = $1",
            [refreshToken]
        );

        if (result.rows.length === 0) {
            console.warn(`[refreshToken] Refresh token not found in DB`);
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const userId = result.rows[0].user_id;

        console.log(`[refreshToken] Token belongs to user_id=${userId}`);

        const user = await db.query(
            "SELECT id, role FROM users WHERE id = $1",
            [userId]
        );

        const newAccessToken = jwt.sign(
            { user_id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET || "super-secret-erp-key",
            { expiresIn: "15m" }
        );

        console.log(`[refreshToken] New access token issued for user_id=${userId}`);

        res.json({ accessToken: newAccessToken });

    } catch (err) {
        console.error(`[refreshToken] Error:`, err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- LOGOUT ---------------- */

exports.logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        console.log(`[logout] Logout requested`);

        if (!refreshToken) {
            console.warn(`[logout] No refresh token provided, proceeding anyway`);
        }

        const del = await db.query(
            "DELETE FROM refresh_tokens WHERE token = $1",
            [refreshToken]
        );

        console.log(`[logout] Refresh token deleted (rows affected: ${del.rowCount})`);

        res.json({ message: "Logged out successfully" });

    } catch (err) {
        console.error(`[logout] Error:`, err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- CHANGE PASSWORD ---------------- */

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        console.log(`[changePassword] Request for user_id=${req.user.user_id}`);

        const user = await db.query(
            "SELECT * FROM users WHERE id = $1",
            [req.user.user_id]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const valid = await bcrypt.compare(
            currentPassword,
            user.rows[0].password_hash
        );

        if (!valid) {
            console.warn(`[changePassword] Incorrect current password for user_id=${req.user.user_id}`);
            return res.status(400).json({ message: "Current password incorrect" });
        }

        const hash = await bcrypt.hash(newPassword, 12);

        await db.query(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            [hash, req.user.user_id]
        );

        console.log(`[changePassword] Password updated for user_id=${req.user.user_id}`);

        res.json({ message: "Password updated" });

    } catch (err) {
        console.error(`[changePassword] Error:`, err.message);
        res.status(500).json({ message: "Server error" });
    }
};

/* ---------------- FORGOT PASSWORD ---------------- */

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        console.log(`[forgotPassword] Request received for email: ${email}`);

        const user = await db.query(
            "SELECT id FROM users WHERE email=$1",
            [email]
        );

        if (user.rows.length === 0) {
            console.log(`[forgotPassword] Email not found in DB: ${email}`);
            return res.json({
                message: "If email exists, reset link sent"
            });
        }

        const token = crypto.randomBytes(32).toString("hex");

        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await db.query(
            `INSERT INTO password_resets (user_id,token,expires_at)
     VALUES ($1,$2,$3)`,
            [user.rows[0].id, token, expires]
        );

        console.log(`[forgotPassword] Reset token generated for user ID: ${user.rows[0].id}`);

        const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

        const html = `
    <h3>Password Reset</h3>
    <p>Click the link below to reset your password</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link expires in 15 minutes.</p>
  `;

        console.log(`[forgotPassword] Calling sendEmail...`);

        await sendEmail(email, "Reset your password", html);

        console.log(`[forgotPassword] sendEmail completed for: ${email}`);

        res.json({
            message: "Reset email sent"
        });

    } catch (err) {
        console.error(`[forgotPassword] Error:`, err.message);
        res.status(500).json({
            message: "Server error"
        });
    }
};

/* ---------------- RESET PASSWORD ---------------- */

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const result = await db.query(
            `SELECT * FROM password_resets
     WHERE token=$1 AND expires_at > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Invalid or expired token"
            });
        }

        const userId = result.rows[0].user_id;

        const hash = await bcrypt.hash(newPassword, 12);

        await db.query(
            "UPDATE users SET password_hash=$1 WHERE id=$2",
            [hash, userId]
        );

        await db.query(
            "DELETE FROM password_resets WHERE token=$1",
            [token]
        );

        res.json({
            message: "Password reset successful"
        });

    } catch (err) {
        console.error(`[resetPassword] Error:`, err.message);
        res.status(500).json({
            message: "Server error"
        });
    }
};

/* ---------------- AUTH MIDDLEWARE ---------------- */

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.warn(`[authMiddleware] No Authorization header on ${req.method} ${req.url}`);
        return res.status(401).json({
            message: "Token missing"
        });
    }

    const token = authHeader.split(" ")[1];

    console.log(`[authMiddleware] Verifying token for ${req.method} ${req.url}...`);

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "super-secret-erp-key"
        );

        req.user = decoded;

        console.log(`[authMiddleware] Token valid | user_id: ${decoded.user_id} | role: ${decoded.role}`);

        next();

    } catch (error) {
        console.warn(`[authMiddleware] Token verification failed: ${error.message}`);

        return res.status(401).json({
            message: "Invalid token"
        });
    }
}

exports.authMiddleware = authMiddleware;

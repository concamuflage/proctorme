const bcrypt = require("bcryptjs");
const pool = require("../database/pool");
const {
  buildVerificationLink,
  createVerificationToken,
  hashVerificationToken,
  sendVerificationEmail,
} = require("../services/emailVerification");
const {
  buildPasswordResetLink,
  createPasswordResetToken,
  hashPasswordResetToken,
  sendPasswordResetEmail,
} = require("../services/passwordReset");
const { PASSWORD_REQUIREMENTS_MESSAGE, isStrongPassword } = require("../../shared/passwordPolicy");
const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email before signing in.";
const SIGNUP_SUCCESS_MESSAGE = "Check your email to verify your account before signing in.";
const PASSWORD_RESET_REQUEST_MESSAGE =
  "If that account exists, a password reset email has been sent.";

function normalizeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

const ensureUsersTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_token TEXT,
      email_verification_expires TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_email TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`
  );
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_email TEXT");
};

async function issueEmailVerification(user) {
  const { rawToken, hashedToken, expiresAt } = createVerificationToken();

  await pool.query(
    `
      UPDATE users
      SET email_verified = FALSE,
          email_verification_token = $2,
          email_verification_expires = $3
      WHERE id = $1
    `,
    [user.id, hashedToken, expiresAt]
  );

  try {
    await sendVerificationEmail({
      to: user.email,
      firstName: user.first_name || user.firstName,
      verificationLink: buildVerificationLink(user.email, rawToken),
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    console.error("verification email error:", error);
    if (isProduction) {
      throw error;
    }
  }
}

async function issuePasswordReset(user) {
  const { rawToken, hashedToken, expiresAt } = createPasswordResetToken();

  await pool.query(
    `
      UPDATE users
      SET password_reset_token = $2,
          password_reset_expires = $3
      WHERE id = $1
    `,
    [user.id, hashedToken, expiresAt]
  );

  try {
    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.first_name || user.firstName,
      resetLink: buildPasswordResetLink(user.email, rawToken),
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    console.error("password reset email error:", error);
    if (isProduction) {
      throw error;
    }
  }
}

exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedFirstName = normalizeName(firstName);
    const normalizedLastName = normalizeName(lastName);

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Email, password, first name, and last name are required" });
    }

    if (!normalizedEmail) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: PASSWORD_REQUIREMENTS_MESSAGE,
      });
    }

    await ensureUsersTable();

    const existing = await pool.query(
      "SELECT id, email, first_name, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL",
      [normalizedEmail]
    );
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];

      if (!existingUser.email_verified) {
        await issueEmailVerification(existingUser);
        return res.status(409).json({
          error: "An account with this email already exists. We sent a new verification email.",
        });
      }

      return res.status(409).json({ error: "An account with this email already exists. Please sign in." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `
        INSERT INTO users (
          email,
          password_hash,
          first_name,
          last_name,
          email_verified,
          email_verification_token,
          email_verification_expires
        )
        VALUES ($1, $2, $3, $4, FALSE, NULL, NULL)
        RETURNING id, email, first_name, last_name
      `,
      [normalizedEmail, passwordHash, normalizedFirstName, normalizedLastName]
    );

    const user = result.rows[0];
    await issueEmailVerification(user);

    return res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      message: SIGNUP_SUCCESS_MESSAGE,
    });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    await ensureUsersTable();

    const result = await pool.query(
      `
        SELECT
          id,
          email,
          first_name,
          last_name,
          password_hash,
          email_verified
        FROM users
        WHERE email = $1
          AND deleted_at IS NULL
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        error: EMAIL_NOT_VERIFIED_MESSAGE,
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    req.clearAuthRateLimit?.();

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: user.email_verified,
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email || req.body?.email);
    const token = typeof (req.query.token || req.body?.token) === "string"
      ? (req.query.token || req.body?.token).trim()
      : "";

    if (!email || !token) {
      return res.status(400).json({ error: "Email and token are required." });
    }

    await ensureUsersTable();

    const result = await pool.query(
      `
        SELECT
          id,
          email_verified,
          email_verification_token,
          email_verification_expires
        FROM users
        WHERE email = $1
          AND deleted_at IS NULL
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification link." });
    }

    const user = result.rows[0];
    if (user.email_verified) {
      return res.json({ message: "Your email is already verified. You can sign in." });
    }

    const hashedToken = hashVerificationToken(token);
    const expiresAt = user.email_verification_expires ? new Date(user.email_verification_expires) : null;
    const isExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now();

    if (user.email_verification_token !== hashedToken || isExpired) {
      if (isExpired) {
        await pool.query(
          `
            UPDATE users
            SET email_verification_token = NULL,
                email_verification_expires = NULL
            WHERE id = $1
          `,
          [user.id]
        );
      }

      return res.status(400).json({ error: "Invalid or expired verification link." });
    }

    await pool.query(
      `
        UPDATE users
        SET email_verified = TRUE,
            email_verification_token = NULL,
            email_verification_expires = NULL
        WHERE id = $1
      `,
      [user.id]
    );

    return res.json({ message: "Email verified successfully. You can now sign in." });
  } catch (err) {
    console.error("verify email error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email is required." });
    }

    await ensureUsersTable();

    const result = await pool.query(
      "SELECT id, email, first_name, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.json({ message: "If that account exists, a verification email has been sent." });
    }

    const user = result.rows[0];
    if (user.email_verified) {
      return res.status(400).json({ error: "This email is already verified. Please sign in." });
    }

    await issueEmailVerification(user);

    return res.json({ message: "Verification email sent." });
  } catch (err) {
    console.error("resend verification error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    await ensureUsersTable();

    const result = await pool.query(
      `
        SELECT id, email, first_name
        FROM users
        WHERE email = $1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
    }

    await issuePasswordReset(result.rows[0]);
    return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
  } catch (err) {
    console.error("request password reset error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !token || !password) {
      return res.status(400).json({ error: "Email, token, and password are required." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: PASSWORD_REQUIREMENTS_MESSAGE,
      });
    }

    await ensureUsersTable();

    const result = await pool.query(
      `
        SELECT id, password_reset_token, password_reset_expires
        FROM users
        WHERE email = $1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const user = result.rows[0];
    const hashedToken = hashPasswordResetToken(token);
    const expiresAt = user.password_reset_expires ? new Date(user.password_reset_expires) : null;
    const isExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now();

    if (user.password_reset_token !== hashedToken || isExpired) {
      if (isExpired) {
        await pool.query(
          `
            UPDATE users
            SET password_reset_token = NULL,
                password_reset_expires = NULL
            WHERE id = $1
          `,
          [user.id]
        );
      }
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `
        UPDATE users
        SET password_hash = $2,
            password_reset_token = NULL,
            password_reset_expires = NULL,
            email_verified = TRUE,
            email_verification_token = NULL,
            email_verification_expires = NULL
        WHERE id = $1
      `,
      [user.id, passwordHash]
    );

    return res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (err) {
    console.error("reset password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const env = require("../config/env");
const { createUser, findUserByEmail } = require("../repositories/user.repository");
const { createAuditLog } = require("../repositories/audit.repository");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { revokeToken } = require("../repositories/token.repository");

async function register(req, res, next) {
  try {
    const { name, email, password, role = "admin", inviteCode } = req.body;

    if (!env.adminInviteCode || inviteCode !== env.adminInviteCode) {
      return res.status(403).json({
        error: {
          message: "Invalid invite code",
          code: "INVALID_INVITE_CODE"
        }
      });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: {
          message: "Email already registered",
          code: "EMAIL_ALREADY_EXISTS"
        }
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ name, email, passwordHash, role });

    await createAuditLog({
      actorType: "user",
      actorId: String(user.id),
      action: "auth.register",
      entity: "user",
      entityId: String(user.id),
      metadata: {
        role: user.role,
        email: user.email
      }
    });

    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    await createAuditLog({
      actorType: "user",
      actorId: String(user.id),
      action: "auth.login",
      entity: "user",
      entityId: String(user.id),
      metadata: {
        role: user.role,
        email: user.email
      }
    });

    res.status(201).json({
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    if (!req.user.jti || !req.user.exp) {
      return res.status(400).json({ error: { message: "Token cannot be revoked", code: "INVALID_TOKEN" } });
    }
    await revokeToken({ jti: req.user.jti, userId: req.user.sub, expiresAt: new Date(req.user.exp * 1000) });
    res.status(204).send();
  } catch (error) { next(error); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: {
          message: "Invalid credentials",
          code: "INVALID_CREDENTIALS"
        }
      });
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: {
          message: "Invalid credentials",
          code: "INVALID_CREDENTIALS"
        }
      });
    }

    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login
  ,logout
};

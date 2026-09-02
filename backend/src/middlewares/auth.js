const { verifyAccessToken } = require("../utils/jwt");
const { isTokenRevoked } = require("../repositories/token.repository");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: {
        message: "Missing or invalid Authorization header",
        code: "UNAUTHORIZED"
      }
    });
  }

  try {
    req.user = verifyAccessToken(token);
    if (await isTokenRevoked(req.user.jti)) {
      return res.status(401).json({ error: { message: "Invalid or expired token", code: "UNAUTHORIZED" } });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: "Invalid or expired token",
        code: "UNAUTHORIZED"
      }
    });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: "Forbidden",
          code: "FORBIDDEN"
        }
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  authorizeRoles
};

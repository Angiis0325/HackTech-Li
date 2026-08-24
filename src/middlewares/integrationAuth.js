const env = require("../config/env");

function requireIntegrationToken(req, res, next) {
  if (!env.n8nWebhookToken) {
    return res.status(503).json({
      error: {
        message: "Integration token not configured",
        code: "INTEGRATION_NOT_CONFIGURED"
      }
    });
  }

  const headerToken = req.headers["x-integration-token"];

  if (!headerToken || headerToken !== env.n8nWebhookToken) {
    return res.status(401).json({
      error: {
        message: "Invalid integration token",
        code: "INVALID_INTEGRATION_TOKEN"
      }
    });
  }

  next();
}

module.exports = {
  requireIntegrationToken
};

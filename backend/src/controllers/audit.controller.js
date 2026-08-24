const { listAuditLogs } = require("../repositories/audit.repository");

async function getAuditLogs(req, res, next) {
  try {
    const { limit = 100 } = req.query;
    const logs = await listAuditLogs(limit);

    res.json({
      data: logs
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAuditLogs
};

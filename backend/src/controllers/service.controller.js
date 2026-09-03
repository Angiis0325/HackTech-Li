const { listActiveServices } = require("../repositories/service.repository");

async function getActiveServices(req, res, next) {
  try {
    const services = await listActiveServices();

    res.json({
      data: services
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActiveServices
};

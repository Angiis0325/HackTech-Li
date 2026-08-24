function notFound(req, res) {
  res.status(404).json({
    error: {
      message: "Route not found",
      code: "ROUTE_NOT_FOUND"
    }
  });
}

module.exports = notFound;

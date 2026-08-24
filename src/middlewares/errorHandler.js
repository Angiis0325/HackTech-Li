function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  res.status(status).json({
    error: {
      message,
      code: err.code || "INTERNAL_ERROR"
    }
  });
}

module.exports = errorHandler;

function errorHandler(err, req, res, next) {
  const isMulterLimit = err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_FILE_COUNT";
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  const message = isMulterLimit
    ? "File exceeds the configured upload limit"
    : err.message || "Internal Server Error";
  const code = isMulterLimit ? "FILE_UPLOAD_LIMIT_EXCEEDED" : err.code || "INTERNAL_ERROR";

  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  res.status(status).json({
    error: {
      message,
      code
    }
  });
}

module.exports = errorHandler;

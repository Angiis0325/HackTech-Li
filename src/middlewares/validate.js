function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: "Validation error",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten()
        }
      });
    }

    req.body = parsed.data.body;
    req.params = parsed.data.params;
    req.query = parsed.data.query;

    next();
  };
}

module.exports = validate;

const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(e => e.message).join('; ');
      return res.status(400).json({ error: 'Validation failed', details });
    }
    Object.defineProperty(req, 'body', { value: result.data, writable: true, configurable: true, enumerable: true });
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = result.error.issues.map(e => e.message).join('; ');
      return res.status(400).json({ error: 'Validation failed', details });
    }
    Object.defineProperty(req, 'params', { value: result.data, writable: true, configurable: true, enumerable: true });
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.issues.map(e => e.message).join('; ');
      return res.status(400).json({ error: 'Validation failed', details });
    }
    Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true, enumerable: true });
    next();
  };
};

module.exports = { validateBody, validateParams, validateQuery };

export const errorHandler = (err, req, res, next) => {
  console.error('❌ Server Error:', err.message || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

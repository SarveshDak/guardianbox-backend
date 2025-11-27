import { ValidationError } from './validation.js';

/**
 * Central error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      statusCode: 400,
    });
  }

  // File not found errors
  if (err.message === 'File not found') {
    return res.status(404).json({
      error: 'Not Found',
      message: 'File not found',
      statusCode: 404,
    });
  }

  // File expired or limit reached
  if (err.message.includes('expired') || err.message.includes('limit')) {
    return res.status(410).json({
      error: 'Gone',
      message: err.message,
      statusCode: 410,
    });
  }

  // Multer file size errors
  if (err.message.includes('File too large')) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'File size exceeds maximum allowed size',
      statusCode: 413,
    });
  }

  // Generic server errors
  return res.status(500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    statusCode: 500,
  });
}

/**
 * 404 handler for unknown routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
}

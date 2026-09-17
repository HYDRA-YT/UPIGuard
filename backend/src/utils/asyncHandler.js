// Wraps an async Express handler so rejections reach the error middleware
// instead of becoming unhandled promise rejections.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
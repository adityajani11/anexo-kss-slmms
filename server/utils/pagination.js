// helper to parse pagination params safely
exports.parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    200,
    Math.max(1, parseInt(req.query.limit || "20", 10))
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

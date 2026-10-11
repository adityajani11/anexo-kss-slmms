const authBase = require("./authBase");

module.exports = [
  authBase(),
  (req, res, next) => {
    if (req.auth.role !== "admin") {
      return res.status(403).json({ message: "Admin only access" });
    }

    req.user = { id: req.auth.id };
    next();
  },
];

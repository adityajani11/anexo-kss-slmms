const authBase = require("./authBase");
const Staff = require("../models/StaffAdmin");

module.exports = [
  authBase(),
  async (req, res, next) => {
    if (req.auth.role !== "staff") {
      return res.status(403).json({ message: "Staff only access" });
    }

    const staff = await Staff.findById(req.auth.id).lean();
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    req.user = {
      id: staff._id,
      contactNumber: staff.contactNumber,
      username: staff.username,
    };

    next();
  },
];

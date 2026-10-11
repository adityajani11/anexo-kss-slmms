const authBase = require("./authBase");
const Student = require("../models/Student");

module.exports = [
  authBase(),
  async (req, res, next) => {
    if (req.auth.role !== "student") {
      return res.status(403).json({ message: "Student only access" });
    }

    const student = await Student.findById(req.auth.id).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    req.user = {
      id: student._id,
      standard: student.standard,
      division: student.division,
    };

    next();
  },
];

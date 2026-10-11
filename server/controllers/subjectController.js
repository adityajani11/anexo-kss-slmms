const Subject = require("../models/Subject");

// Create Subject
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await Subject.findOne({ name: name.trim() });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Subject already exists" });
    }

    const subject = new Subject({ name: name.trim() });
    await subject.save();

    return res.status(201).json({ success: true, data: subject });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// List Subjects
exports.list = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    res.json({ success: true, data: subjects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Subject
exports.delete = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject)
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });

    res.json({ success: true, message: "Subject deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

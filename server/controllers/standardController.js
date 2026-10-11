const Standard = require("../models/Standard");
const mongoose = require("mongoose");

exports.create = async (req, res) => {
  try {
    const { standard } = req.body;

    // Validate input
    if (!standard || standard < 8 || standard > 12) {
      return res
        .status(400)
        .json({ success: false, message: "Standard must be between 8 and 12" });
    }

    // Check for existing standard
    const existingStandard = await Standard.findOne({ standard });
    if (existingStandard) {
      return res
        .status(400)
        .json({ success: false, message: "Standard already exists" });
    }

    // Create new standard
    const doc = new Standard({ standard });
    await doc.save();

    return res.status(201).json({
      success: true,
      message: "Standard added successfully",
      data: doc,
    });
  } catch (err) {
    console.error("Error creating standard:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const standards = await Standard.find().sort({ standard: 1 });

    if (standards.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "No standards found", data: [] });
    }

    return res.status(200).json({
      success: true,
      data: standards,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Hard Delete Standard
exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid standard ID" });
    }

    const deleted = await Standard.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Standard not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Standard ${deleted.standard} deleted successfully.`,
    });
  } catch (err) {
    console.error("Error deleting standard:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete standard",
      error: err.message,
    });
  }
};

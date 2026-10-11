const Category = require("../models/Category");

// Create category
exports.create = async (req, res) => {
  try {
    const doc = new Category(req.body);
    await doc.save();
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

// List categories
exports.list = async (req, res) => {
  try {
    const items = await Category.find().sort({ name: 1 });
    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Hard delete (permanent)
exports.hardDelete = async (req, res) => {
  try {
    const result = await Category.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0)
      return res
        .status(404)
        .json({ success: false, error: "Category not found" });

    return res.json({ success: true, message: "Category permanently deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

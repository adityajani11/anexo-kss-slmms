const Student = require("../models/Student");
const Admin = require("../models/Admin");
const Standard = require("../models/Standard");
const Paper = require("../models/Paper");
const ExamAttempt = require("../models/ExamAttempt");
const Material = require("../models/Material");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { parsePagination } = require("../utils/pagination");
const { parseInt: _p } = Number;
const { saveOtpDb, verifyOtpDb } = require("../utils/otpDbStore");
const axios = require("axios");
const deleteFromS3 = require("../utils/s3Delete");

const buildFilters = async (q) => {
  const filter = {};

  // -----------------------------
  // 1. StandardId handling:
  // If user sends "9", "10" etc. → convert to number → find Standard → get _id
  // -----------------------------
  if (q.standardId) {
    const stdNum = Number(q.standardId);
    if (!isNaN(stdNum)) {
      const std = await Standard.findOne({ standard: stdNum }).select("_id");
      if (std) {
        filter.standardId = std._id;
      } else {
        // No matching standard → ensure NO match in results
        filter.standardId = null;
      }
    }
  }

  if (q.city) filter.city = new RegExp(q.city, "i");
  if (q.district) filter.district = new RegExp(q.district, "i");
  if (q.category) filter.category = q.category;
  if (q.gender) filter.gender = q.gender;
  if (q.cast) filter.cast = new RegExp(q.cast, "i");
  if (q.schoolName) filter.schoolName = new RegExp(q.schoolName, "i");
  if (!q.includeDisabled) filter.disabled = { $ne: true };

  const hasSpecificFieldSearch = q.city || q.district || q.cast || q.schoolName;

  // General search only if not using field-specific filters
  if (q.search && !hasSpecificFieldSearch) {
    const txt = q.search.trim();
    filter.$or = [
      { fullName: new RegExp(txt, "i") },
      { username: new RegExp(txt, "i") },
    ];
  }

  return filter;
};

exports.create = async (req, res) => {
  try {
    const payload = req.body;

    // Required field validation
    const requiredFields = [
      "fullName",
      "standardId",
      "contactNumber",
      "whatsappNumber",
      "city",
      "district",
      "schoolName",
    ];
    const missingFields = requiredFields.filter((f) => !payload[f]);
    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(", ")}.`,
      });
    }

    // Check for duplicate username
    if (payload.username) {
      const existing = await Student.findOne({ username: payload.username });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Username already exists. Please choose another.",
        });
      }
    }

    // Validate gender, category, and stream (if provided)
    const validGenders = ["Male", "Female"];
    const validCategories = ["SC", "ST", "OBC", "OPEN", "OTHER"];
    const validStreams = ["SCIENCE", "COMMERCE", "ARTS", "OTHER"];

    if (payload.gender && !validGenders.includes(payload.gender)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gender value. Allowed: ${validGenders.join(", ")}`,
      });
    }

    if (payload.category && !validCategories.includes(payload.category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category value. Allowed: ${validCategories.join(
          ", "
        )}`,
      });
    }

    if (payload.stream && !validStreams.includes(payload.stream)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stream value. Allowed: ${validStreams.join(", ")}`,
      });
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    // Create student document
    const newStudent = new Student({
      username: payload.username.toLowerCase(),
      passwordHash: hashedPassword,
      fullName: payload.fullName.trim(),
      city: payload.city.trim(),
      district: payload.district.trim(),
      schoolName: payload.schoolName.trim(),
      standardId: payload.standardId,
      stream: payload.stream || null,
      contactNumber: payload.contactNumber,
      whatsappNumber: payload.whatsappNumber,
      gender: payload.gender.trim(),
      cast: payload.cast.trim(),
      category: payload.category.trim(),
    });

    await newStudent.save();

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: newStudent,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while creating an account.",
      error: err.message,
    });
  }
};

// Login API
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
    }

    // Find student (ignore soft-deleted)
    const student = await Student.findOne({
      username,
      deleted: { $ne: true },
    });

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, student.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password." });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: student._id,
        username: student.username,
        role: "student",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Send minimal safe info
    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: student._id,
        username: student.username,
        fullName: student.fullName,
        standardId: student.standardId,
        role: "student",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error.", error: error.message });
  }
};

// Display student API
exports.list = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const q = await buildFilters(req.query);

    // Run two queries in parallel: paged items and total count
    const [items, total] = await Promise.all([
      Student.find(q)
        .populate("standardId", "standard")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(q),
    ]);

    return res.status(200).json({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error listing students:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching student records.",
      error: err.message,
    });
  }
};

// Export student endpoint: supports format=csv or format=json
exports.export = async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const q = buildFilters(req.query);

    // Use cursor to avoid loading everything in memory for very large sets
    const cursor = Student.find(q)
      .populate("standardId", "standard")
      .sort({ createdAt: -1 })
      .lean()
      .cursor();

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="students.csv"'
      );

      // write CSV header
      const header = [
        "#",
        "Full Name",
        "Username",
        "City",
        "District",
        "School Name",
        "Standard",
        "Stream",
        "Gender",
        "Cast",
        "Category",
        "Contact Number",
        "WhatsApp Number",
        "Registered On",
      ];
      res.write(header.join(",") + "\n");

      let index = 0;
      for await (const s of cursor) {
        index++;
        const row = [
          index,
          '"' + (s.fullName || "").replace(/"/g, '""') + '"',
          '"' + (s.username || "").replace(/"/g, '""') + '"',
          '"' + (s.city || "").replace(/"/g, '""') + '"',
          '"' + (s.district || "").replace(/"/g, '""') + '"',
          '"' + (s.schoolName || "").replace(/"/g, '""') + '"',
          '"' + ((s.standardId && s.standardId.standard) || "") + '"',
          '"' + (s.stream || "") + '"',
          '"' + (s.gender || "") + '"',
          '"' + (s.cast || "") + '"',
          '"' + (s.category || "") + '"',
          '"' + (s.contactNumber || "") + '"',
          '"' + (s.whatsappNumber || "") + '"',
          '"' +
            (s.createdAt ? new Date(s.createdAt).toLocaleString() : "") +
            '"',
        ];
        res.write(row.join(",") + "\n");
      }

      return res.end();
    }

    // JSON streaming: send array start, then items, then end
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="students.json"'
      );

      res.write("[");
      let first = true;
      for await (const s of cursor) {
        if (!first) res.write(",");
        res.write(JSON.stringify(s));
        first = false;
      }
      res.write("]");
      return res.end();
    }

    return res
      .status(400)
      .json({ success: false, message: "Unsupported export format" });
  } catch (err) {
    console.error("Export error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Export failed", error: err.message });
  }
};

// Get Student by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find student by ID (ignore soft-deleted ones)
    const student = await Student.findOne({ _id: id, deleted: { $ne: true } })
      .select("-passwordHash -__v") // exclude sensitive/internal fields
      .populate("standardId", "standard");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error("Error fetching student by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching student.",
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    // Check if student exists
    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Validate duplicate username (if changed)
    if (payload.username && payload.username !== existingStudent.username) {
      const duplicate = await Student.findOne({ username: payload.username });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Username already exists. Please choose another.",
        });
      }
    }

    // Validate enums (only if provided)
    const validGenders = ["Male", "Female"];
    const validCategories = ["SC", "ST", "OBC", "OPEN", "OTHER"];
    const validStreams = ["SCIENCE", "COMMERCE", "ARTS", "OTHER"];

    if (payload.gender && !validGenders.includes(payload.gender)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gender value. Allowed: ${validGenders.join(", ")}`,
      });
    }

    if (payload.category && !validCategories.includes(payload.category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category value. Allowed: ${validCategories.join(
          ", "
        )}`,
      });
    }

    if (payload.stream && !validStreams.includes(payload.stream)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stream value. Allowed: ${validStreams.join(", ")}`,
      });
    }

    // Prepare update fields safely
    const updateData = {
      ...(payload.username && { username: payload.username.toLowerCase() }),
      ...(payload.fullName && { fullName: payload.fullName.trim() }),
      ...(payload.city && { city: payload.city.trim() }),
      ...(payload.district && { district: payload.district.trim() }),
      ...(payload.schoolName && { schoolName: payload.schoolName.trim() }),
      ...(payload.standardId && { standardId: payload.standardId }),
      ...(payload.stream && { stream: payload.stream }),
      ...(payload.contactNumber && { contactNumber: payload.contactNumber }),
      ...(payload.whatsappNumber && { whatsappNumber: payload.whatsappNumber }),
      ...(payload.gender && { gender: payload.gender }),
      ...(payload.cast && { cast: payload.cast.trim() }),
      ...(payload.category && { category: payload.category }),

      // Update password ONLY IF provided
      ...(payload.passwordHash && { passwordHash: payload.passwordHash }),
    };

    // Perform update
    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("standardId", "standard");

    return res.status(200).json({
      success: true,
      message: "Student updated successfully.",
      data: updatedStudent,
    });
  } catch (err) {
    console.error("Error updating student:", err);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred while updating the student.",
      error: err.message,
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    // Check if student exists
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Perform deletion
    await Student.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: `Student '${student.fullName}' deleted successfully.`,
    });
  } catch (err) {
    console.error("Error deleting student:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the student.",
      error: err.message,
    });
  }
};

// Hard delete ALL students of a standard, along with their generated papers,
// exam/test history, and any generated PDF materials linked to those papers.
exports.hardDeleteByStandard = async (req, res) => {
  try {
    const { standardId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(standardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid standard ID.",
      });
    }

    const standard = await Standard.findById(standardId);
    if (!standard) {
      return res.status(404).json({
        success: false,
        message: "Standard not found.",
      });
    }

    // includeDisabled bypasses the soft-delete plugin filter so this wipes
    // out disabled/soft-deleted students for this standard as well.
    const students = await Student.find({
      standardId,
      includeDisabled: true,
    })
      .select("_id")
      .lean();

    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: `No students found for Standard ${standard.standard}.`,
      });
    }

    const studentIds = students.map((s) => s._id);

    // Student-authored papers (practice/draft papers) and any generated
    // PDF materials linked to them.
    const papers = await Paper.find({
      createdBy: { $in: studentIds },
      createdByModel: "Student",
      includeDisabled: true,
    })
      .select("_id generatedPdf")
      .lean();

    const paperIds = papers.map((p) => p._id);
    const materialIds = papers.map((p) => p.generatedPdf?.fileId).filter(Boolean);

    if (materialIds.length) {
      const materials = await Material.find({ _id: { $in: materialIds } })
        .select("file.fileId")
        .lean();
      await Promise.all(materials.map((m) => deleteFromS3(m.file?.fileId)));
      await Material.deleteMany({ _id: { $in: materialIds } });
    }

    // Exam/test history for these students (covers attempts on both their
    // own draft papers and admin-generated papers).
    await ExamAttempt.deleteMany({ studentId: { $in: studentIds } });

    if (paperIds.length) {
      await Paper.deleteMany({ _id: { $in: paperIds } });
    }

    await Student.deleteMany({ _id: { $in: studentIds } });

    return res.status(200).json({
      success: true,
      message: `${studentIds.length} student(s) from Standard ${standard.standard} and all their related data were deleted successfully.`,
      deletedCount: studentIds.length,
    });
  } catch (err) {
    console.error("Error bulk deleting students by standard:", err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting students for this standard.",
      error: err.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, newPassword } = req.body;

    const student = await Student.findById(id);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const phone = student.whatsappNumber.toString();

    const isValid = await verifyOtpDb({
      userId: student._id,
      phone,
      otp,
      purpose: "PASSWORD_RESET",
    });

    if (!isValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    student.passwordHash = hash;

    await student.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const phone = student.whatsappNumber.toString();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP in DB
    await saveOtpDb({
      userId: student._id,
      phone,
      otp,
      purpose: "PASSWORD_RESET",
    });

    // WhatsApp template JSON (same structure as Admin)
    const templateJson = {
      to: phone,
      recipient_type: "individual",
      type: "template",
      template: {
        language: {
          policy: "deterministic",
          code: "en",
        },
        name: "send_otp_message",
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },
        ],
      },
    };

    // Send via WhatsApp API (same as admin)
    await axios.post(process.env.WHATSAPP_API_URL, templateJson, {
      headers: {
        Authorization: `Bearer ${process.env.WHATAPI_TOKEN}`,
      },
    });

    res.json({
      success: true,
      message: "OTP sent successfully to WhatsApp",
    });
  } catch (err) {
    console.error("Student OTP send error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

exports.verifyOtp = (req, res) => {
  const { phone, otp } = req.body;

  const valid = verifyOtpDb(phone, otp);

  if (!valid) {
    return res.json({ success: false, message: "Invalid or expired OTP" });
  }

  res.json({ success: true, message: "OTP verified" });
};

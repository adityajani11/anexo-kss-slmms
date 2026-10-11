const mongoose = require("mongoose");
const { Schema } = mongoose;

const auditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, required: true, refPath: "actorModel" },
  actorModel: { type: String, enum: ["Student", "StaffAdmin"], required: true },
  action: { type: String, required: true },
  entity: {
    collection: String,
    id: Schema.Types.ObjectId
  },
  meta: Object,
  at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);

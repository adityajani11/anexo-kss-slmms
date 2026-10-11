module.exports = function softDeletePlugin(schema) {
  // Add disabled if not already present
  if (!schema.path("disabled")) {
    schema.add({ disabled: { type: Boolean, default: false } });
  }

  // Auto-filter queries
  const excludeDisabled = function (next) {
    if (!this.getFilter().includeDisabled) {
      this.setQuery({ ...this.getFilter(), disabled: false });
    } else {
      const filter = this.getFilter();
      delete filter.includeDisabled;
      this.setQuery(filter);
    }
    next();
  };

  schema.pre("find", excludeDisabled);
  schema.pre("findOne", excludeDisabled);
  schema.pre("count", excludeDisabled);
  schema.pre("countDocuments", excludeDisabled);
  schema.pre("findOneAndUpdate", excludeDisabled);
  schema.pre("updateMany", excludeDisabled);
  schema.pre("updateOne", excludeDisabled);

  // Soft delete helper method
  schema.methods.softDelete = async function () {
    this.disabled = true;
    await this.save();
  };
};

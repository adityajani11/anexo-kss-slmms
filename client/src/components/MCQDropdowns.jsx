import React from "react";
import { Select, Space } from "antd";

export default function MCQDropdowns({
  standards,
  categories,
  subjects,
  form,
  setForm,
}) {
  return (
    <Space wrap>
      <Select
        placeholder="Select Standard"
        value={form.standardId || undefined}
        onChange={(v) => setForm({ ...form, standardId: v })}
        options={standards.map((s) => ({
          value: s._id,
          label: `Standard ${s.standard}`,
        }))}
        allowClear
        style={{ width: 180 }}
      />
      <Select
        placeholder="Select Category"
        value={form.categoryId || undefined}
        onChange={(v) => setForm({ ...form, categoryId: v })}
        options={categories.map((c) => ({
          value: c._id,
          label: c.name,
        }))}
        allowClear
        style={{ width: 180 }}
      />
      <Select
        placeholder="Select Subject"
        value={form.subjectId || undefined}
        onChange={(v) => setForm({ ...form, subjectId: v })}
        options={subjects.map((s) => ({
          value: s._id,
          label: s.name,
        }))}
        allowClear
        style={{ width: 180 }}
      />
    </Space>
  );
}

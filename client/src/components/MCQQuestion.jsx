import React from "react";
import { Upload, Button } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import MathEditor from "./MathEditor";

export default function MCQQuestion({
  questionText,
  setQuestionText,
  questionImage,
  setQuestionImage,
  uploadProps,
}) {
  return (
    <>
      {/* Question Text */}
      <div className="mt-4">
        <label className="font-medium text-gray-700">Question Text</label>
        <MathEditor value={questionText} onChange={setQuestionText} />
      </div>

      {/* Question Image Upload */}
      <div className="mt-4">
        <Upload
          {...uploadProps}
          maxCount={1}
          fileList={
            questionImage
              ? [{ uid: "-1", name: questionImage.name, status: "done" }]
              : []
          }
          onChange={({ file }) =>
            setQuestionImage(
              file.status === "removed" ? null : file.originFileObj || file
            )
          }
          beforeUpload={() => false}
          showUploadList={{ showRemoveIcon: true }}
        >
          <Button icon={<UploadOutlined />}>
            Upload Question Image (<span className="text-red-500">≤200KB</span>)
          </Button>
        </Upload>
      </div>
    </>
  );
}

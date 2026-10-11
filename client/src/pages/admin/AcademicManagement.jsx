import React from "react";
import ManageCategory from "./ManageCategory";
import ManageStandard from "./ManageStandard";
import ManageSubject from "./ManageSubject";
const AcademicManagement = () => {
  return (
    <div className="flex flex-col gap-5">
      <ManageStandard />
      <ManageSubject />
      <ManageCategory />
    </div>
  );
};

export default AcademicManagement;

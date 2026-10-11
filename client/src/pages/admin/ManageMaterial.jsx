import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Upload,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Tooltip,
  Spin,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  ReadOutlined,
  AppstoreOutlined,
  BookTwoTone,
  FolderTwoTone,
  TeamOutlined,
} from "@ant-design/icons";
import axios from "axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const { Title } = Typography;
const { Option } = Select;

export default function ManageMaterial() {
  const [form] = Form.useForm();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [standards, setStandards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const base = import.meta.env.VITE_API_BASE_URL;

  const axiosAuth = axios.create({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stdRes, subRes, catRes] = await Promise.all([
          axiosAuth.get(`${base}/standards`),
          axiosAuth.get(`${base}/subjects`),
          axiosAuth.get(`${base}/categories`),
        ]);
        setStandards(stdRes?.data?.data || []);
        setSubjects(subRes?.data?.data || []);
        setCategories(catRes?.data?.data || []);
      } catch {
        Swal.fire("Error", "Failed to load dropdown data", "error");
      }
    };
    fetchData();
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await axiosAuth.get(`${base}/materials`);
      setMaterials(res.data.data || []);
    } catch {
      Swal.fire("Error", "Failed to load materials", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (values) => {
    if (!values.file || !values.file.file) {
      return Swal.fire("Warning", "Please upload a PDF file", "warning");
    }

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) {
      return Swal.fire(
        "Error",
        "User not found. Please log in again.",
        "error"
      );
    }

    const formData = new FormData();
    formData.append("file", values.file.file);
    formData.append("title", values.title);
    formData.append("standardId", values.standardId);
    formData.append("subjectId", values.subjectId);
    formData.append("categoryId", values.categoryId);
    formData.append("uploadedBy", user.id);
    formData.append(
      "uploadedByModel",
      user.role &&
        (user.role.toLowerCase().includes("staff") ||
          user.role.toLowerCase().includes("admin"))
        ? "staffadmin"
        : "student"
    );

    setUploading(true);
    try {
      await axios.post(`${base}/materials`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      Swal.fire("Success", "Material uploaded successfully!", "success");
      form.resetFields();
      fetchMaterials();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This material will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axiosAuth.delete(`${base}/materials/${id}/hard`);
        Swal.fire("Deleted!", "Material has been deleted.", "success");
        fetchMaterials();
      } catch {
        Swal.fire("Error", "Failed to delete material", "error");
      }
    }
  };

  const handleView = (record) => {
    if (!record.file?.fileId)
      return Swal.fire("Error", "No file available to view", "error");
    const fileUrl = `${base}/materials/${record._id}`;
    window.open(fileUrl, "_blank");
  };

  const handleDownload = async (record) => {
    const confirm = await Swal.fire({
      title: "Download Material?",
      text: `Do you want to download "${record.title}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Yes, Download",
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: "Preparing download...",
      text: "Please wait...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const downloadUrl = `${base}/materials/${record._id}/download`;

      // Create a temporary link
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = record.title.replace(/\s+/g, "_") + ".pdf";
      document.body.appendChild(link);

      // Trigger browser download
      link.click();

      // STOP LOADER IMMEDIATELY AFTER CLICK
      Swal.close();

      // Cleanup
      link.remove();

      // Optional small toast
      Swal.fire({
        icon: "success",
        title: "Download in progress",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", "Failed to download file", "error");
    }
  };

  return (
    <>
      <h1 className="text-left mb-4 text-3xl font-semibold">
        Manage Learning Materials
      </h1>

      {/* Upload New Material */}
      <Card
        title="Upload New Material"
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="title"
                label="Material Title"
                rules={[{ required: true, message: "Please enter title" }]}
              >
                <Input placeholder="Enter material title" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="standardId"
                label="Standard"
                rules={[{ required: true, message: "Select standard" }]}
              >
                <Select placeholder="Select standard" showSearch>
                  {standards.map((std) => (
                    <Option key={std._id} value={std._id}>
                      {std.standard}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="subjectId"
                label="Subject"
                rules={[{ required: true, message: "Select subject" }]}
              >
                <Select placeholder="Select subject" showSearch>
                  {subjects.map((sub) => (
                    <Option key={sub._id} value={sub._id}>
                      {sub.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="categoryId"
                label="Category"
                rules={[{ required: true, message: "Select category" }]}
              >
                <Select placeholder="Select category" showSearch>
                  {categories.map((cat) => (
                    <Option key={cat._id} value={cat._id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="file"
                label="Upload PDF"
                valuePropName="file"
                rules={[{ required: true, message: "Upload a PDF file" }]}
              >
                <Upload maxCount={1} beforeUpload={() => false} accept=".pdf">
                  <Button icon={<UploadOutlined />}>Select PDF</Button>
                </Upload>
              </Form.Item>
            </Col>

            <Col xs={24} style={{ textAlign: "right" }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={uploading}
                style={{ borderRadius: 6 }}
              >
                Upload Material
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Uploaded Materials */}
      <Card
        title="Uploaded Materials"
        bordered={false}
        className="rounded-xl shadow-md"
      >
        {loading ? (
          <div className="text-center py-8">
            <Spin />
          </div>
        ) : materials.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            No materials uploaded yet.
          </p>
        ) : (
          <div className="flex flex-wrap justify-center sm:justify-start gap-6">
            {materials.map((item) => (
              <div
                key={item._id}
                className="relative flex flex-col overflow-hidden justify-between bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl w-fit max-w-[500px] p-4"
                style={{ minWidth: "260px", position: "relative" }}
              >
                {/* Delete Icon - top right */}
                <Tooltip title="Delete Material">
                  <Button
                    type="text"
                    danger
                    shape="circle"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(item._id)}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      zIndex: 10,
                    }}
                  />
                </Tooltip>

                <div>
                  <div className="flex items-center mb-3 space-x-2 pr-8">
                    <BookTwoTone twoToneColor="#1677ff" />
                    <span className="font-semibold text-gray-800 text-lg break-words">
                      {item.title}
                    </span>
                  </div>

                  <div className="space-y-1 text-gray-700 leading-relaxed text-sm">
                    <p className="flex items-center">
                      <ReadOutlined className="text-green-500 mr-2" />
                      <b>Standard:</b>&nbsp;{item.standard || "-"}
                    </p>
                    <p className="flex items-center">
                      <AppstoreOutlined className="text-yellow-500 mr-2" />
                      <b>Subject:</b>&nbsp;{item.subject || "-"}
                    </p>
                    <p className="flex items-center">
                      <FolderTwoTone twoToneColor="#eb2f96" className="mr-2" />
                      <b>Category:</b>&nbsp;{item.category || "-"}
                    </p>
                    <p className="flex items-center">
                      <TeamOutlined className="text-blue-500 mr-2" />
                      <b>Uploaded By:</b>&nbsp;{item.uploadedBy || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-center gap-3 flex-wrap">
                  <Tooltip title="View PDF">
                    <Button
                      icon={<FilePdfOutlined />}
                      onClick={() => handleView(item)}
                    >
                      View
                    </Button>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(item)}
                    >
                      Download
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

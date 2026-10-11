// src/utils/imageUtils.js

const getBaseURL = () => {
  return import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "";
};

export const buildImageUrl = (imagePath) => {
  if (!imagePath) {
    return null;
  }
  const baseURL = getBaseURL();
  // Ensure the path is correctly formatted for web URLs
  const cleanPath = imagePath.replace(/\\/g, "/");

  return `${baseURL}/${cleanPath}`;
};

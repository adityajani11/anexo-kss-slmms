import Swal from "sweetalert2";
import axios from "axios";

export const deleteWithPassword = async ({
  base,
  deleteUrl,
  fetchCallback,
  itemName = "item",
}) => {
  try {
    // Step 1 — Ask for admin additional password
    const { value: password } = await Swal.fire({
      title: "Admin password required",
      input: "password",
      inputLabel: "Enter admin password for delete data",
      inputPlaceholder: "Password",
      inputAttributes: { autocapitalize: "off" },
      showCancelButton: true,
      confirmButtonText: "Verify",
    });

    if (!password) return;

    // Step 2 — Verify password
    const verifyRes = await axios.post(
      `${base}/admin/verify-additional-password`,
      { password }
    );

    if (!verifyRes.data.success) {
      Swal.fire("Invalid!", "Incorrect admin password", "error");
      return;
    }

    // Step 3 — Ask delete confirmation
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: `This will permanently delete the ${itemName}!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    // Step 4 — Perform delete
    await axios.delete(deleteUrl);

    Swal.fire("Deleted!", `${itemName} has been deleted`, "success");

    if (fetchCallback) fetchCallback();
  } catch (error) {
    console.error(error);
    Swal.fire("Error", `Failed to delete ${itemName}`, "error");
  }
};

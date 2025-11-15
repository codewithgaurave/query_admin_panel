// src/components/modals/UpdateEmployeeModal.jsx
import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import employeeAPI from "../../apis/employeeAPI";

const UpdateEmployeeModal = ({ isOpen, onClose, employee, onEmployeeUpdated }) => {
  const { themeColors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    name: { first: "", last: "" },
    email: "",
    mobile: "",
    alternateMobile: "",
    whatsappNumber: "",
    gender: "",
    dob: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      pincode: ""
    },
    role: "Employee",
    manager: "",
    designation: "",
    salary: "",
    dateOfJoining: ""
  });

  // Fetch managers for dropdown
  const fetchManagers = async () => {
    try {
      const { data } = await employeeAPI.getAll({
        role: "HR_Manager,Team_Leader",
        isActive: true
      });
      setManagers(data.employees || []);
    } catch (err) {
      console.error("Error fetching managers:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchManagers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        name: {
          first: employee.name?.first || "",
          last: employee.name?.last || ""
        },
        email: employee.email || "",
        mobile: employee.mobile || "",
        alternateMobile: employee.alternateMobile || "",
        whatsappNumber: employee.whatsappNumber || "",
        gender: employee.gender || "",
        dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : "",
        address: {
          street: employee.address?.street || "",
          city: employee.address?.city || "",
          state: employee.address?.state || "",
          country: employee.address?.country || "",
          pincode: employee.address?.pincode || ""
        },
        role: employee.role || "Employee",
        manager: employee.manager?._id || "",
        designation: employee.designation || "",
        salary: employee.salary || "",
        dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
    }
  }, [employee, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else if (name.startsWith('name.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        name: {
          ...prev.name,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.first || !formData.name.last || !formData.email || 
        !formData.mobile || !formData.alternateMobile || !formData.whatsappNumber ||
        !formData.designation || !formData.salary) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        ...formData,
        salary: Number(formData.salary),
        // Convert empty strings to undefined for optional fields
        gender: formData.gender || undefined,
        dob: formData.dob || undefined,
        manager: formData.manager || undefined,
        address: formData.address.street ? formData.address : undefined
      };

      const { data } = await employeeAPI.update(employee._id, updateData);
      onEmployeeUpdated(data.employee);
      onClose();

    } catch (err) {
      setError(err.response?.data?.message || err.message || "Error updating employee");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: themeColors.surface,
          color: themeColors.text
        }}
      >
        <div className="p-6 border-b" style={{ borderColor: themeColors.border }}>
          <h2 className="text-xl font-bold">Update Employee</h2>
          <p className="text-sm mt-1" style={{ color: themeColors.textSecondary }}>
            Update details for {employee.name?.first} {employee.name?.last}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div 
              className="p-3 rounded-lg mb-4 text-sm"
              style={{
                backgroundColor: themeColors.danger + '20',
                color: themeColors.danger,
                border: `1px solid ${themeColors.danger}`
              }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg" style={{ color: themeColors.primary }}>
                Personal Information
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">First Name *</label>
                  <input
                    type="text"
                    name="name.first"
                    value={formData.name.first}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Last Name *</label>
                  <input
                    type="text"
                    name="name.last"
                    value={formData.name.last}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Mobile *</label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Alternate Mobile *</label>
                  <input
                    type="text"
                    name="alternateMobile"
                    value={formData.alternateMobile}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">WhatsApp Number *</label>
                <input
                  type="text"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg" style={{ color: themeColors.primary }}>
                Address Information
              </h3>

              <div>
                <label className="block text-sm font-medium mb-2">Street</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <input
                    type="text"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Pincode</label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: themeColors.background,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg" style={{ color: themeColors.primary }}>
                Employment Information
              </h3>

              <div>
                <label className="block text-sm font-medium mb-2">Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                >
                  <option value="Employee">Employee</option>
                  <option value="Team_Leader">Team Leader</option>
                  <option value="HR_Manager">HR Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Manager</label>
                <select
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                >
                  <option value="">Select Manager</option>
                  {managers.map(manager => (
                    <option key={manager._id} value={manager._id}>
                      {manager.name.first} {manager.name.last} ({manager.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Designation *</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Salary *</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date of Joining</label>
                <input
                  type="date"
                  name="dateOfJoining"
                  value={formData.dateOfJoining}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>
            </div>

            {/* Employee Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg" style={{ color: themeColors.primary }}>
                Employee Information
              </h3>

              <div>
                <label className="block text-sm font-medium mb-2">Employee ID</label>
                <input
                  type="text"
                  value={employee.employeeId}
                  disabled
                  className="w-full p-2 rounded-md border text-sm opacity-70"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className={`px-3 py-1 rounded-full text-xs inline-block ${employee.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {employee.isActive ? "Active" : "Inactive"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Added On</label>
                <input
                  type="text"
                  value={new Date(employee.createdAt).toLocaleDateString()}
                  disabled
                  className="w-full p-2 rounded-md border text-sm opacity-70"
                  style={{
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: themeColors.border }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border font-medium"
              style={{
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
              style={{
                backgroundColor: themeColors.primary
              }}
            >
              {loading ? "Updating..." : "Update Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateEmployeeModal;
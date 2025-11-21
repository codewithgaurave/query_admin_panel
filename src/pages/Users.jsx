// src/pages/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { toast } from "sonner";
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserTie,
  FaPlus,
  FaSearch,
  FaFilter,
  FaToggleOn,
  FaToggleOff,
  FaEdit,
  FaTrash,
  FaTable,
  FaThLarge,
  FaKey, // 🔐 NEW ICON
} from "react-icons/fa";
import {
  listUsers,
  createUser,
  updateUser,
  blockUser,
  unblockUser,
  deleteUser,
  resetUserPassword, // 🔐 NEW API
} from "../apis/users";

const ROLES = ["SURVEY_USER", "QUALITY_ENGINEER"];

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "-";
  }
};

export default function Users() {
  const { themeColors } = useTheme();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // view toggle
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards"

  // filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // create form
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: "",
    mobile: "",
    password: "",
    role: "SURVEY_USER",
    email: "",
    employeeCode: "",
    department: "",
    city: "",
    state: "",
    pincode: "",
    dateOfJoining: "",
    profilePhoto: null,
  });

  // edit modal
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // 🔐 reset password modal
  const [resetUser, setResetUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // block/unblock/delete loading
  const [actionId, setActionId] = useState(null);

  // fetch users
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await listUsers(); // { users }
      setUsers(res.users || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to load users.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // derived stats + filtered list
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const roleOk =
        roleFilter === "All" ? true : String(u.role) === String(roleFilter);
      const statusOk =
        statusFilter === "All"
          ? true
          : statusFilter === "Active"
          ? u.isActive
          : !u.isActive;

      const searchOk =
        !q ||
        [
          u.fullName,
          u.email,
          u.mobile,
          u.userCode,
          u.employeeCode,
          u.city,
          u.state,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

      return roleOk && statusOk && searchOk;
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const surveyUsers = users.filter((u) => u.role === "SURVEY_USER").length;
    const qEngineers = users.filter((u) => u.role === "QUALITY_ENGINEER").length;

    return [
      {
        title: "Total Users",
        value: total,
        icon: FaUsers,
        description: "All users in system",
      },
      {
        title: "Active Users",
        value: active,
        icon: FaUserCheck,
        description: "Currently enabled",
      },
      {
        title: "Survey Users",
        value: surveyUsers,
        icon: FaUserTie,
        description: "Field survey users",
      },
      {
        title: "Quality Engineers",
        value: qEngineers,
        icon: FaUserTie,
        description: "QA / review users",
      },
    ];
  }, [users]);

  // ---- CREATE USER ----
  const handleCreateChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newUser.fullName || !newUser.mobile || !newUser.password || !newUser.role) {
      toast.error("Full name, mobile, password and role are required.");
      return;
    }

    try {
      setCreating(true);
      const payload = {
        fullName: newUser.fullName,
        mobile: newUser.mobile,
        password: newUser.password,
        role: newUser.role,
        email: newUser.email,
        employeeCode: newUser.employeeCode,
        department: newUser.department,
        city: newUser.city,
        state: newUser.state,
        pincode: newUser.pincode,
        dateOfJoining: newUser.dateOfJoining,
        profilePhoto: newUser.profilePhoto,
      };

      const res = await createUser(payload);
      const created = res?.user;
      if (created) {
        setUsers((prev) => [created, ...prev]);
      }
      toast.success(res?.message || "User created successfully");
      setNewUser({
        fullName: "",
        mobile: "",
        password: "",
        role: "SURVEY_USER",
        email: "",
        employeeCode: "",
        department: "",
        city: "",
        state: "",
        pincode: "",
        dateOfJoining: "",
        profilePhoto: null,
      });
      setCreateOpen(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create user.";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // ---- EDIT USER ----
  const openEditModal = (user) => {
    setEditingUser(user);
    setEditData({
      fullName: user.fullName || "",
      email: user.email || "",
      employeeCode: user.employeeCode || "",
      department: user.department || "",
      city: user.city || "",
      state: user.state || "",
      pincode: user.pincode || "",
      dateOfJoining: user.dateOfJoining ? user.dateOfJoining.slice(0, 10) : "",
      role: user.role || "SURVEY_USER",
      mobile: user.mobile || "",
      isActive: user.isActive,
    });
  };

  const handleEditChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSavingEdit(true);
      const res = await updateUser(editingUser._id, editData);
      const updated = res?.user;
      if (updated) {
        setUsers((prev) =>
          prev.map((u) => (u._id === updated._id ? updated : u))
        );
      }
      toast.success(res?.message || "User updated");
      setEditingUser(null);
      setEditData({});
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update user.";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  // 🔐 RESET PASSWORD ----
  const openResetModal = (user) => {
    setResetUser(user);
    setResetPasswordValue("");
    setResetConfirmPassword("");
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetUser) return;

    if (!resetPasswordValue) {
      toast.error("New password is required.");
      return;
    }
    if (resetPasswordValue.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (resetPasswordValue !== resetConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setResetting(true);
      const res = await resetUserPassword(resetUser._id, resetPasswordValue);
      toast.success(res?.message || "User password reset successfully");
      // optional: update user in local list, if backend returns it
      if (res?.user) {
        const updated = res.user;
        setUsers((prev) =>
          prev.map((u) => (u._id === updated._id ? { ...u, ...updated } : u))
        );
      }
      setResetUser(null);
      setResetPasswordValue("");
      setResetConfirmPassword("");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reset password.";
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  };

  // ---- BLOCK / UNBLOCK ----
  const handleToggleActive = async (user) => {
    try {
      setActionId(user._id);

      if (user.isActive) {
        const res = await blockUser(user._id); // backend: PATCH /user/:id/block
        const updated = res?.user;
        if (updated) {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === updated._id ? { ...u, isActive: updated.isActive } : u
            )
          );
        }
        toast.success(res?.message || "User blocked");
      } else {
        const res = await unblockUser(user._id); // backend: PATCH /user/:id/unblock
        const updated = res?.user;
        if (updated) {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === updated._id ? { ...u, isActive: updated.isActive } : u
            )
          );
        }
        toast.success(res?.message || "User unblocked");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update user status.";
      toast.error(msg);
      console.error("Block/unblock error:", err?.response || err);
    } finally {
      setActionId(null);
    }
  };

  // ---- DELETE ----
  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user ${user.fullName} (${user.userCode})?`)) {
      return;
    }
    try {
      setActionId(user._id);
      const res = await deleteUser(user._id);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      toast.success(res?.message || "User deleted");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete user.";
      toast.error(msg);
    } finally {
      setActionId(null);
    }
  };

  // ---- UI ----
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading users...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border"
        style={{
          borderColor: themeColors.border,
          color: themeColors.danger,
          backgroundColor: themeColors.surface,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ color: themeColors.text }}
          >
            User Management
          </h1>
          <p
            className="text-sm mt-1 opacity-75"
            style={{ color: themeColors.text }}
          >
            Create and manage <span className="font-semibold">SURVEY_USER</span>{" "}
            and <span className="font-semibold">QUALITY_ENGINEER</span> accounts.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen((o) => !o)}
          className="px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-semibold shadow-sm"
          style={{
            borderColor: themeColors.primary,
            backgroundColor: createOpen
              ? themeColors.primary
              : themeColors.surface,
            color: createOpen ? themeColors.onPrimary : themeColors.primary,
          }}
        >
          <FaPlus />
          {createOpen ? "Close Create User" : "Create User"}
        </button>
      </div>

      {/* Create User Card */}
      {createOpen && (
        <div
          className="rounded-xl border p-4 md:p-6 shadow-sm"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaPlus />
            New User
          </h2>
          <form
            onSubmit={handleCreateSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Full Name */}
            <div>
              <label className="text-xs font-medium block mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={newUser.fullName}
                onChange={(e) =>
                  handleCreateChange("fullName", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="text-xs font-medium block mb-1">Mobile *</label>
              <input
                type="tel"
                value={newUser.mobile}
                onChange={(e) => handleCreateChange("mobile", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium block mb-1">
                Password *
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  handleCreateChange("password", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-medium block mb-1">Role *</label>
              <select
                value={newUser.role}
                onChange={(e) => handleCreateChange("role", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-medium block mb-1">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => handleCreateChange("email", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Employee Code */}
            <div>
              <label className="text-xs font-medium block mb-1">
                Employee Code
              </label>
              <input
                type="text"
                value={newUser.employeeCode}
                onChange={(e) =>
                  handleCreateChange("employeeCode", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-medium block mb-1">
                Department
              </label>
              <input
                type="text"
                value={newUser.department}
                onChange={(e) =>
                  handleCreateChange("department", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* City */}
            <div>
              <label className="text-xs font-medium block mb-1">City</label>
              <input
                type="text"
                value={newUser.city}
                onChange={(e) => handleCreateChange("city", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* State */}
            <div>
              <label className="text-xs font-medium block mb-1">State</label>
              <input
                type="text"
                value={newUser.state}
                onChange={(e) => handleCreateChange("state", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="text-xs font-medium block mb-1">Pincode</label>
              <input
                type="text"
                value={newUser.pincode}
                onChange={(e) =>
                  handleCreateChange("pincode", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Date of Joining */}
            <div>
              <label className="text-xs font-medium block mb-1">
                Date of Joining
              </label>
              <input
                type="date"
                value={newUser.dateOfJoining}
                onChange={(e) =>
                  handleCreateChange("dateOfJoining", e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* Profile Photo */}
            <div>
              <label className="text-xs font-medium block mb-1">
                Profile Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleCreateChange("profilePhoto", e.target.files?.[0] || null)
                }
                className="w-full text-sm"
              />
            </div>

            {/* Submit button */}
            <div className="md:col-span-2 lg:col-span-3 mt-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
                style={{
                  backgroundColor: themeColors.primary,
                  color: themeColors.onPrimary,
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters + Search + View Toggle */}
      <div
        className="rounded-xl border p-3 md:p-4 shadow-sm"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Top row: search + view toggle */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, mobile, userCode, city, state"
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-2 justify-end">
              <span
                className="text-xs font-medium"
                style={{ color: themeColors.text }}
              >
                View:
              </span>
              <div
                className="inline-flex rounded-lg overflow-hidden border text-xs font-semibold"
                style={{ borderColor: themeColors.border }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className="px-3 py-1.5 flex items-center gap-1 transition-colors"
                  style={{
                    backgroundColor:
                      viewMode === "table"
                        ? themeColors.primary
                        : themeColors.surface,
                    color:
                      viewMode === "table"
                        ? themeColors.onPrimary
                        : themeColors.text,
                  }}
                >
                  <FaTable />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className="px-3 py-1.5 flex items-center gap-1 transition-colors"
                  style={{
                    backgroundColor:
                      viewMode === "cards"
                        ? themeColors.primary
                        : themeColors.surface,
                    color:
                      viewMode === "cards"
                        ? themeColors.onPrimary
                        : themeColors.text,
                  }}
                >
                  <FaThLarge />
                  Cards
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row: filters */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            {/* Role filter */}
            <div className="min-w-[180px]">
              <label
                className="text-xs mb-1 block opacity-70"
                style={{ color: themeColors.text }}
              >
                Role
              </label>
              <div className="flex items-center gap-2">
                <FaFilter className="opacity-70" />
                <select
                  className="w-full p-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status filter */}
            <div className="min-w-[160px]">
              <label
                className="text-xs mb-1 block opacity-70"
                style={{ color: themeColors.text }}
              >
                Status
              </label>
              <select
                className="w-full p-2 rounded-lg border text-sm"
                style={{
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.background,
                  color: themeColors.text,
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border transition-all duration-300 hover:shadow-lg group"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p
                  className="text-sm font-medium mb-1 opacity-75"
                  style={{ color: themeColors.text }}
                >
                  {s.title}
                </p>
                <p
                  className="text-2xl font-bold mb-2"
                  style={{ color: themeColors.primary }}
                >
                  {s.value}
                </p>
                <p
                  className="text-xs opacity-60"
                  style={{ color: themeColors.text }}
                >
                  {s.description}
                </p>
              </div>
              <div
                className="p-3 rounded-xl group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: themeColors.primary + "15" }}
              >
                <s.icon
                  className="text-lg"
                  style={{ color: themeColors.primary }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Users list: table ya cards */}
      {viewMode === "table" ? (
        // ---- TABLE VIEW ----
        <div
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: themeColors.background + "30" }}>
                  {[
                    "Name",
                    "User Code",
                    "Role",
                    "Mobile",
                    "Email",
                    "Department",
                    "City",
                    "State",
                    "DOJ",
                    "Status",
                    "Actions",
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: themeColors.text }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: themeColors.border }}
              >
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td className="px-4 py-3">
                      <div
                        className="font-medium"
                        style={{ color: themeColors.text }}
                      >
                        {u.fullName}
                      </div>
                      {u.employeeCode && (
                        <div
                          className="text-xs opacity-70"
                          style={{ color: themeColors.text }}
                        >
                          Emp: {u.employeeCode}
                        </div>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {u.userCode}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {u.role}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {u.mobile}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {u.email || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {u.department || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {u.city || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {u.state || "-"}
                    </td>
                    <td
                      className="px-4 py-3 text-xs"
                      style={{ color: themeColors.text }}
                    >
                      {fmtDate(u.dateOfJoining)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: u.isActive
                            ? themeColors.success + "20"
                            : themeColors.danger + "20",
                          color: u.isActive
                            ? themeColors.success
                            : themeColors.danger,
                        }}
                      >
                        {u.isActive ? (
                          <>
                            <FaToggleOn /> Active
                          </>
                        ) : (
                          <>
                            <FaToggleOff /> Blocked
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* toggle active */}
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={actionId === u._id}
                          className="p-2 rounded-lg border text-xs"
                          style={{
                            borderColor: themeColors.border,
                            color: u.isActive
                              ? themeColors.danger
                              : themeColors.success,
                          }}
                          title={u.isActive ? "Block user" : "Unblock user"}
                        >
                          {u.isActive ? <FaUserTimes /> : <FaUserCheck />}
                        </button>

                        {/* 🔐 reset password */}
                        <button
                          onClick={() => openResetModal(u)}
                          className="p-2 rounded-lg border text-xs"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.text,
                          }}
                          title="Reset password"
                        >
                          <FaKey />
                        </button>

                        {/* edit */}
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 rounded-lg border text-xs"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.text,
                          }}
                          title="Edit user"
                        >
                          <FaEdit />
                        </button>

                        {/* delete */}
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={actionId === u._id}
                          className="p-2 rounded-lg border text-xs"
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.danger,
                          }}
                          title="Delete user"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8 text-center text-sm"
                      style={{ color: themeColors.text }}
                    >
                      No users found for current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // ---- CARD VIEW ----
        <div>
          {filteredUsers.length === 0 ? (
            <div
              className="rounded-2xl border p-6 text-center text-sm"
              style={{
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
            >
              No users found for current filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => (
                <div
                  key={u._id}
                  className="rounded-2xl border p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.border,
                  }}
                >
                  {/* Top: name + status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div
                        className="font-semibold text-sm md:text-base"
                        style={{ color: themeColors.text }}
                      >
                        {u.fullName}
                      </div>
                      <div
                        className="text-xs opacity-70"
                        style={{ color: themeColors.text }}
                      >
                        {u.userCode}
                      </div>
                      {u.employeeCode && (
                        <div
                          className="text-[11px] opacity-70 mt-1"
                          style={{ color: themeColors.text }}
                        >
                          Emp: {u.employeeCode}
                        </div>
                      )}
                    </div>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        backgroundColor: u.isActive
                          ? themeColors.success + "20"
                          : themeColors.danger + "20",
                        color: u.isActive
                          ? themeColors.success
                          : themeColors.danger,
                      }}
                    >
                      {u.isActive ? (
                        <>
                          <FaToggleOn /> Active
                        </>
                      ) : (
                        <>
                          <FaToggleOff /> Blocked
                        </>
                      )}
                    </span>
                  </div>

                  {/* Middle: details */}
                  <div className="space-y-1 text-xs mb-3">
                    <div style={{ color: themeColors.text }}>
                      <span className="font-semibold">Role:</span> {u.role}
                    </div>
                    <div style={{ color: themeColors.text }}>
                      <span className="font-semibold">Mobile:</span> {u.mobile}
                    </div>
                    <div style={{ color: themeColors.text }}>
                      <span className="font-semibold">Email:</span>{" "}
                      {u.email || "-"}
                    </div>
                    <div style={{ color: themeColors.text }}>
                      <span className="font-semibold">Dept:</span>{" "}
                      {u.department || "-"}
                    </div>
                    <div style={{ color: themeColors.text }}>
                      <span className="font-semibold">Location:</span>{" "}
                      {u.city || "-"}, {u.state || "-"}
                    </div>
                    <div style={{ color: themeColors.text }}>
                      <span className="font-semibold">DOJ:</span>{" "}
                      {fmtDate(u.dateOfJoining)}
                    </div>
                  </div>

                  {/* Bottom: actions */}
                  <div
                    className="flex items-center gap-2 mt-auto pt-2 border-t"
                    style={{ borderColor: themeColors.border }}
                  >
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={actionId === u._id}
                      className="p-2 rounded-lg border text-xs"
                      style={{
                        borderColor: themeColors.border,
                        color: u.isActive
                          ? themeColors.danger
                          : themeColors.success,
                      }}
                      title={u.isActive ? "Block user" : "Unblock user"}
                    >
                      {u.isActive ? <FaUserTimes /> : <FaUserCheck />}
                    </button>
                    <button
                      onClick={() => openResetModal(u)}
                      className="p-2 rounded-lg border text-xs"
                      style={{
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      }}
                      title="Reset password"
                    >
                      <FaKey />
                    </button>
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-2 rounded-lg border text-xs"
                      style={{
                        borderColor: themeColors.border,
                        color: themeColors.text,
                      }}
                      title="Edit user"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={actionId === u._id}
                      className="p-2 rounded-lg border text-xs ml-auto"
                      style={{
                        borderColor: themeColors.border,
                        color: themeColors.danger,
                      }}
                      title="Delete user"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => !savingEdit && setEditingUser(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border p-5 md:p-6 shadow-lg"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: themeColors.text }}
            >
              Edit User – {editingUser.fullName} ({editingUser.userCode})
            </h2>
            <form
              onSubmit={handleEditSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Full name */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editData.fullName || ""}
                  onChange={(e) =>
                    handleEditChange("fullName", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={editData.mobile || ""}
                  onChange={(e) =>
                    handleEditChange("mobile", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) =>
                    handleEditChange("email", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Role
                </label>
                <select
                  value={editData.role || "SURVEY_USER"}
                  onChange={(e) =>
                    handleEditChange("role", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee code */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Employee Code
                </label>
                <input
                  type="text"
                  value={editData.employeeCode || ""}
                  onChange={(e) =>
                    handleEditChange("employeeCode", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editData.department || ""}
                  onChange={(e) =>
                    handleEditChange("department", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* City */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={editData.city || ""}
                  onChange={(e) =>
                    handleEditChange("city", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* State */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={editData.state || ""}
                  onChange={(e) =>
                    handleEditChange("state", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={editData.pincode || ""}
                  onChange={(e) =>
                    handleEditChange("pincode", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* DOJ */}
              <div>
                <label className="text-xs font-medium block mb-1">
                  Date of Joining
                </label>
                <input
                  type="date"
                  value={editData.dateOfJoining || ""}
                  onChange={(e) =>
                    handleEditChange("dateOfJoining", e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2 mt-6">
                <span className="text-xs" style={{ color: themeColors.text }}>
                  Active
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleEditChange("isActive", !editData.isActive)
                  }
                  className="p-2 rounded-lg border"
                  style={{
                    borderColor: themeColors.border,
                    color: editData.isActive
                      ? themeColors.success
                      : themeColors.danger,
                  }}
                >
                  {editData.isActive ? <FaToggleOn /> : <FaToggleOff />}
                </button>
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.surface,
                    color: themeColors.text,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: themeColors.primary,
                    color: themeColors.onPrimary,
                    opacity: savingEdit ? 0.7 : 1,
                  }}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔐 Reset Password Modal */}
      {resetUser && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => !resetting && setResetUser(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border p-5 md:p-6 shadow-lg"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-lg font-semibold mb-2 flex items-center gap-2"
              style={{ color: themeColors.text }}
            >
              <FaKey />
              Reset Password
            </h2>
            <p
              className="text-xs mb-4 opacity-80"
              style={{ color: themeColors.text }}
            >
              User: <span className="font-semibold">{resetUser.fullName}</span>{" "}
              ({resetUser.userCode})
            </p>
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={resetting}
                  onClick={() => setResetUser(null)}
                  className="px-4 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.surface,
                    color: themeColors.text,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                  style={{
                    backgroundColor: themeColors.primary,
                    color: themeColors.onPrimary,
                    opacity: resetting ? 0.7 : 1,
                  }}
                >
                  {resetting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

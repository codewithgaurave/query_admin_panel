// src/pages/SubAdmins.jsx
import React, { useState, useEffect } from "react";
import {
  FaUserShield,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
  FaKey,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaExternalLinkAlt,
  FaEye,
  FaEyeSlash,
  FaTachometerAlt,
  FaChartBar,
  FaUsers,
  FaMapMarkerAlt,
  FaThumbtack,
  FaLock,
  FaCheck,
  FaSlidersH,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  listSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
} from "../apis/subAdmins";

// Permission module definitions with icons and descriptions
export const AVAILABLE_MODULES = [
  {
    key: "dashboard",
    name: "Dashboard Overview",
    desc: "View overall summary counters, active surveys, response stats & recent activity",
    icon: FaTachometerAlt,
    bgActive: "bg-indigo-50 border-indigo-200 text-indigo-700",
    badgeBg: "bg-indigo-100 text-indigo-800",
  },
  {
    key: "surveys",
    name: "Surveys Management",
    desc: "Create, edit, duplicate surveys and configure survey questions",
    icon: FaClipboardList,
    bgActive: "bg-blue-50 border-blue-200 text-blue-700",
    badgeBg: "bg-blue-100 text-blue-800",
  },
  {
    key: "surveyResponses",
    name: "Survey Responses",
    desc: "Access submissions list, answer details, surveyor info, maps & Excel export",
    icon: FaUsers,
    bgActive: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-800",
  },
  {
    key: "surveyCharts",
    name: "Analytics & Charts",
    desc: "View visual graphical breakdowns and charts for survey questions",
    icon: FaChartBar,
    bgActive: "bg-purple-50 border-purple-200 text-purple-700",
    badgeBg: "bg-purple-100 text-purple-800",
  },
  {
    key: "users",
    name: "User Management",
    desc: "Manage surveyors and QC engineers, create accounts, edit and block/unblock",
    icon: FaUser,
    bgActive: "bg-amber-50 border-amber-200 text-amber-800",
    badgeBg: "bg-amber-100 text-amber-900",
  },
  {
    key: "punchins",
    name: "Punch-ins & Attendance",
    desc: "Inspect surveyor punch-in history, selfie verification photos & timestamps",
    icon: FaMapMarkerAlt,
    bgActive: "bg-rose-50 border-rose-200 text-rose-700",
    badgeBg: "bg-rose-100 text-rose-800",
  },
  {
    key: "pinnedQuestions",
    name: "Pinned Questions",
    desc: "View and manage pinned questions dynamic analytical cards on dashboard",
    icon: FaThumbtack,
    bgActive: "bg-cyan-50 border-cyan-200 text-cyan-800",
    badgeBg: "bg-cyan-100 text-cyan-900",
  },
];

export const DEFAULT_PERMISSIONS = {
  dashboard: true,
  surveys: true,
  surveyResponses: true,
  surveyCharts: true,
  users: false,
  punchins: false,
  pinnedQuestions: false,
};

export default function SubAdmins() {
  const navigate = useNavigate();
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    adminId: "",
    name: "",
    password: "",
    mobile: "",
    email: "",
    permissions: { ...DEFAULT_PERMISSIONS },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    mobile: "",
    email: "",
    isActive: true,
    password: "",
    permissions: { ...DEFAULT_PERMISSIONS },
  });
  const [updating, setUpdating] = useState(false);

  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const res = await listSubAdmins();
      setSubAdmins(res.subAdmins || []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load Sub Admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  // Handle Create Sub Admin
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.adminId.trim() || !createForm.name.trim() || !createForm.password.trim()) {
      toast.error("Please fill in Login ID, Full Name, and Password");
      return;
    }

    try {
      setCreating(true);
      const res = await createSubAdmin(createForm);
      toast.success(res.message || "Sub Admin created successfully!");
      setShowCreateModal(false);
      setCreateForm({
        adminId: "",
        name: "",
        password: "",
        mobile: "",
        email: "",
        permissions: { ...DEFAULT_PERMISSIONS },
      });
      fetchSubAdmins();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create Sub Admin");
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (subAdmin) => {
    setEditingSubAdmin(subAdmin);
    setEditForm({
      name: subAdmin.name || "",
      mobile: subAdmin.mobile || "",
      email: subAdmin.email || "",
      isActive: subAdmin.isActive !== false,
      password: "",
      permissions: {
        ...DEFAULT_PERMISSIONS,
        ...(subAdmin.permissions || {}),
      },
    });
    setShowEditModal(true);
  };

  // Handle Update Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setUpdating(true);
      const res = await updateSubAdmin(editingSubAdmin._id, editForm);
      toast.success(res.message || "Sub Admin updated successfully!");
      setShowEditModal(false);
      setEditingSubAdmin(null);
      fetchSubAdmins();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update Sub Admin");
    } finally {
      setUpdating(false);
    }
  };

  // Handle Delete / Deactivate
  const handleDelete = async (subAdmin) => {
    const confirmMsg = `Are you sure you want to delete/deactivate Sub Admin "${subAdmin.name}" (${subAdmin.adminId})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await deleteSubAdmin(subAdmin._id);
      toast.success(res.message || "Sub Admin status updated");
      fetchSubAdmins();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete Sub Admin");
    }
  };

  // Permission toggle helpers
  const toggleCreatePermission = (key) => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const setAllCreatePermissions = (value) => {
    const newPerms = {};
    AVAILABLE_MODULES.forEach((m) => {
      newPerms[m.key] = value;
    });
    setCreateForm((prev) => ({ ...prev, permissions: newPerms }));
  };

  const toggleEditPermission = (key) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const setAllEditPermissions = (value) => {
    const newPerms = {};
    AVAILABLE_MODULES.forEach((m) => {
      newPerms[m.key] = value;
    });
    setEditForm((prev) => ({ ...prev, permissions: newPerms }));
  };

  // Filtered Sub Admins
  const filteredSubAdmins = subAdmins.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.adminId?.toLowerCase().includes(term) ||
      s.mobile?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term)
    );
  });

  // Overview stats
  const totalSubAdmins = subAdmins.length;
  const activeSubAdmins = subAdmins.filter((s) => s.isActive !== false).length;
  const totalSurveysCreated = subAdmins.reduce(
    (acc, curr) => acc + (curr.totalSurveys || 0),
    0
  );
  const totalActiveSurveys = subAdmins.reduce(
    (acc, curr) => acc + (curr.activeSurveys || 0),
    0
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
              <FaUserShield className="text-2xl text-yellow-300" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Sub Admin & Permission Management
            </h1>
          </div>
          <p className="text-blue-100 text-sm md:text-base">
            Create Sub Admin accounts and manage module access permissions (Surveys, Responses, Users, Attendance, Analytics).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <FaPlus />
          <span>Add New Sub Admin</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Sub Admins</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{totalSubAdmins}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            <FaUserShield />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Sub Admins</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeSubAdmins}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            <FaCheckCircle />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Surveys Created</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalSurveysCreated}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
            <FaClipboardList />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Surveys</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{totalActiveSurveys}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
            <FaClipboardList />
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, Login ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredSubAdmins.length}</span> Sub Admins
        </div>
      </div>

      {/* Table of Sub Admins */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm">Loading Sub Admins...</p>
          </div>
        ) : filteredSubAdmins.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FaUserShield className="text-5xl mx-auto mb-3 text-slate-300" />
            <p className="text-base font-medium text-slate-600">No Sub Admins found</p>
            <p className="text-sm text-slate-400 mt-1">
              Click "Add New Sub Admin" above to create one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs tracking-wider">
                  <th className="py-3.5 px-4">Sub Admin</th>
                  <th className="py-3.5 px-4">Login ID</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Module Permissions</th>
                  <th className="py-3.5 px-4">Surveys</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubAdmins.map((subAdmin) => {
                  const isActive = subAdmin.isActive !== false;
                  const perms = subAdmin.permissions || DEFAULT_PERMISSIONS;
                  const activePermsCount = Object.values(perms).filter(Boolean).length;

                  return (
                    <tr
                      key={subAdmin._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-sm text-sm">
                            {subAdmin.name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {subAdmin.name}
                            </div>
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 mt-0.5">
                              Sub Admin
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Login ID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                          {subAdmin.adminId}
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {subAdmin.mobile && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <FaPhone className="text-slate-400 text-[10px]" />
                            <span>{subAdmin.mobile}</span>
                          </div>
                        )}
                        {subAdmin.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <FaEnvelope className="text-slate-400 text-[10px]" />
                            <span>{subAdmin.email}</span>
                          </div>
                        )}
                        {!subAdmin.mobile && !subAdmin.email && (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Module Permissions Chips */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1 items-center">
                          {AVAILABLE_MODULES.map((mod) => {
                            const isAllowed = perms[mod.key] === true;
                            if (!isAllowed) return null;
                            const Icon = mod.icon;
                            return (
                              <span
                                key={mod.key}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${mod.badgeBg}`}
                                title={`${mod.name}: Allowed`}
                              >
                                <Icon className="text-[10px]" />
                                <span>{mod.name.split(" ")[0]}</span>
                              </span>
                            );
                          })}
                          {activePermsCount === 0 && (
                            <span className="text-xs text-slate-400 italic">
                              No permissions granted
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenEdit(subAdmin)}
                            className="ml-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                            title="Edit Permissions"
                          >
                            ({activePermsCount}/{AVAILABLE_MODULES.length})
                          </button>
                        </div>
                      </td>

                      {/* Surveys stats */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`/surveys?subAdminId=${subAdmin._id}`)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition-colors cursor-pointer"
                            title="View all surveys created by this Sub Admin"
                          >
                            <FaClipboardList className="text-indigo-500" />
                            <span>{subAdmin.totalSurveys || 0} Surveys</span>
                            <FaExternalLinkAlt className="text-[10px] ml-0.5 opacity-70" />
                          </button>
                          {subAdmin.activeSurveys > 0 && (
                            <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                              {subAdmin.activeSurveys} Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {subAdmin.createdAtIST ||
                          (subAdmin.createdAt
                            ? new Date(subAdmin.createdAt).toLocaleDateString("en-IN")
                            : "-")}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(subAdmin)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Sub Admin / Permissions / Reset Password"
                          >
                            <FaEdit className="text-base" />
                          </button>
                          <button
                            onClick={() => handleDelete(subAdmin)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete or Deactivate Sub Admin"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE SUB ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaUserShield className="text-xl text-yellow-300" />
                <div>
                  <h3 className="text-lg font-bold">Create New Sub Admin</h3>
                  <p className="text-xs text-blue-100">Set login credentials & configure module access</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Login ID (Unique) *
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. subadmin_delhi"
                      value={createForm.adminId}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, adminId: e.target.value })
                      }
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <FaKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Create password"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={createForm.mobile}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, mobile: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* MODULE PERMISSIONS SECTION */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FaSlidersH className="text-blue-600" />
                      <span>Module Permissions & Access Control</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Choose which features and sections this Sub Admin is allowed to access
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setAllCreatePermissions(true)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllCreatePermissions(false)}
                      className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = createForm.permissions[mod.key] === true;
                    const Icon = mod.icon;
                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleCreatePermission(mod.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                          isChecked
                            ? `${mod.bgActive} shadow-xs`
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border text-xs transition-colors ${
                            isChecked
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-slate-300 text-transparent"
                          }`}
                        >
                          <FaCheck className="text-[10px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className="text-sm shrink-0" />
                            <span className="text-xs font-bold truncate">
                              {mod.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {creating ? "Creating Sub Admin..." : "Create Sub Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUB ADMIN MODAL */}
      {showEditModal && editingSubAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-slate-800 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaEdit className="text-xl text-yellow-400" />
                <div>
                  <h3 className="text-lg font-bold">Edit Sub Admin & Permissions</h3>
                  <p className="text-xs text-slate-300">
                    Login ID: <span className="font-mono text-yellow-200">{editingSubAdmin.adminId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white/80 hover:text-white text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <div className="flex items-center gap-4 h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={editForm.isActive === true}
                        onChange={() =>
                          setEditForm({ ...editForm, isActive: true })
                        }
                        className="text-blue-600"
                      />
                      <span className="text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="isActive"
                        checked={editForm.isActive === false}
                        onChange={() =>
                          setEditForm({ ...editForm, isActive: false })
                        }
                        className="text-blue-600"
                      />
                      <span className="text-xs font-semibold text-rose-700">
                        Inactive
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile
                  </label>
                  <input
                    type="text"
                    value={editForm.mobile}
                    onChange={(e) =>
                      setEditForm({ ...editForm, mobile: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reset Password
                  </label>
                  <div className="relative">
                    <FaKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm({ ...editForm, password: e.target.value })
                      }
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* MODULE PERMISSIONS SECTION */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FaSlidersH className="text-indigo-600" />
                      <span>Configure Module Permissions</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Grant or revoke module access for this Sub Admin
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setAllEditPermissions(true)}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllEditPermissions(false)}
                      className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isChecked = editForm.permissions[mod.key] === true;
                    const Icon = mod.icon;
                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleEditPermission(mod.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                          isChecked
                            ? `${mod.bgActive} shadow-xs`
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <div
                          className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border text-xs transition-colors ${
                            isChecked
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white border-slate-300 text-transparent"
                          }`}
                        >
                          <FaCheck className="text-[10px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className="text-sm shrink-0" />
                            <span className="text-xs font-bold truncate">
                              {mod.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {updating ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

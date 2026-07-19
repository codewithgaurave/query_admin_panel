import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAdminProfile, updateAdminProfile, changeAdminPassword } from "../apis/auth";
import { useAuth } from "../context/AuthContext";
import { FaUser, FaLock } from "react-icons/fa";

const AdminProfile = () => {
  const { logout } = useAuth();
  
  const [profileData, setProfileData] = useState({ adminId: "", name: "" });
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setFetching(true);
      const res = await getAdminProfile();
      setProfileData({ adminId: res.admin.adminId, name: res.admin.name || "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch profile");
    } finally {
      setFetching(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoadingProfile(true);
      const res = await updateAdminProfile({ name: profileData.name });
      toast.success(res.message || "Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("New passwords do not match!");
    }
    
    try {
      setLoadingPassword(true);
      const res = await changeAdminPassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      toast.success(res.message || "Password changed successfully!");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      
      // Usually logout is required after password change
      setTimeout(() => {
        logout();
      }, 2000);
      
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoadingPassword(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 border-b pb-4">Admin Profile Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Edit Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <FaUser size={20} />
            </div>
            <h2 className="text-xl font-semibold">Update Profile</h2>
          </div>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin ID</label>
              <input
                type="text"
                value={profileData.adminId}
                disabled
                className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Admin ID cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Enter your name"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loadingProfile}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors disabled:bg-blue-400"
            >
              {loadingProfile ? "Updating..." : "Update Profile"}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
              <FaLock size={20} />
            </div>
            <h2 className="text-xl font-semibold">Change Password</h2>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
              <input
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loadingPassword}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors disabled:bg-red-400"
            >
              {loadingPassword ? "Changing Password..." : "Change Password"}
            </button>
          </form>
          <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
            <strong>Note:</strong> Changing your password will automatically log you out of all devices for security reasons.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;

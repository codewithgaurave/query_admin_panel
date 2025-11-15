// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

const USER_KEY = "admin-data";
const TOKEN_KEY = "admin-token";

export const AuthProvider = ({ children }) => {
  // admin object: { adminId, name, id, token }
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null); // string
  const [loading, setLoading] = useState(true);

  // hydrate from localStorage (persisted login)
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedUser) setAdmin(JSON.parse(savedUser));
    if (savedToken) setToken(savedToken);
    setLoading(false);
  }, []);

  // called after successful login
  const setLoginData = (adminData) => {
    setAdmin(adminData);
    setToken(adminData?.token || null);

    localStorage.setItem(USER_KEY, JSON.stringify(adminData));
    if (adminData?.token) {
      localStorage.setItem(TOKEN_KEY, adminData.token);
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const isLoggedIn = Boolean(admin && token);

  return (
    <AuthContext.Provider
      value={{ admin, token, setLoginData, logout, isLoggedIn, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

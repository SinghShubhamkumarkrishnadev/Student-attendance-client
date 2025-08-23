import React, { createContext, useContext, useEffect, useState } from "react";
import { loginHod, getHodProfile } from "../services/api";

/**
 * AuthContext
 * - Keeps token in localStorage and in state
 * - On load: if token exists, fetch HOD profile from backend
 * - Exposes login(credentials) which calls loginHod, stores token, fetches profile
 * - Exposes logout()
 * - Exposes loading while profile is being fetched
 */

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [hod, setHod] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("hodToken") || null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("hodToken"))); // true if token exists -> fetch profile

  // Helper to fetch profile from backend and set hod
  const fetchProfile = async () => {
    if (!token) {
      setHod(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await getHodProfile();
      // backend shapes vary; prefer res.data.data.hod or res.data.hod or res.data
      const data = res?.data || {};
      let profile = null;
      if (data.data && data.data.hod) profile = data.data.hod;
      else if (data.hod) profile = data.hod;
      else if (data.data && (data.data.username || data.data.collegeName)) profile = data.data;
      else if (data.username || data.collegeName) profile = data;

      if (profile) {
        // normalize
        setHod({
          id: profile.id || profile._id,
          username: profile.username,
          collegeName: profile.collegeName,
          email: profile.email,
          ...profile,
        });
      } else {
        console.warn("AuthContext: unexpected profile shape", data);
        setHod(null);
      }
    } catch (err) {
      console.error("AuthContext: fetchProfile error", err);
      // if token invalid, clear it
      localStorage.removeItem("hodToken");
      setToken(null);
      setHod(null);
    } finally {
      setLoading(false);
    }
  };

  // When token changes, persist to localStorage and refetch profile
  useEffect(() => {
    if (token) {
      localStorage.setItem("hodToken", token);
    } else {
      localStorage.removeItem("hodToken");
    }
    // fetch profile if we have a token
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // login: call loginHod (from services/api), extract token, then fetch profile
  const login = async (credentials) => {
    try {
      const res = await loginHod(credentials);
      // token may be res.data.token or res.data.data.token
      const tokenFromServer = res?.data?.token || res?.data?.data?.token || null;
      if (!tokenFromServer) {
        // fallback: maybe token under different key, but bail
        console.warn("AuthContext.login: token not found in response", res.data);
        throw new Error("Token not returned by server");
      }
      setToken(tokenFromServer); // this triggers fetchProfile via useEffect

      // If login response already included hod info, set it immediately
      const data = res?.data || {};
      let profile = null;
      if (data.data && data.data.hod) profile = data.data.hod;
      else if (data.hod) profile = data.hod;
      else if (data.data && (data.data.username || data.data.collegeName)) profile = data.data;
      else if (data.username || data.collegeName) profile = data;

      if (profile) {
        setHod({
          id: profile.id || profile._id,
          username: profile.username,
          collegeName: profile.collegeName,
          email: profile.email,
          ...profile,
        });
      }

      return res;
    } catch (err) {
      console.error("AuthContext.login error", err);

      // show server message if available
      const serverMsg = err?.response?.data?.error || err?.response?.data?.message;
      if (serverMsg) {
        // you can replace with your UI toast/alert logic
        alert(`Login failed: ${serverMsg}`);
      } else {
        alert('Login failed: Unexpected error. Check console for details.');
      }

      throw err;

    }
  };

  const logout = () => {
    setHod(null);
    setToken(null);
    localStorage.removeItem("hodToken");
  };

  // new helper for flows like OTP verify
  const setAuth = (hodData, tokenFromServer) => {
    if (!tokenFromServer) return;

    setToken(tokenFromServer); // triggers fetchProfile via useEffect
    localStorage.setItem("hodToken", tokenFromServer);

    if (hodData) {
      setHod({
        id: hodData.id || hodData._id,
        username: hodData.username,
        collegeName: hodData.collegeName,
        email: hodData.email,
        ...hodData,
      });
    }
  };


  return (
    <AuthContext.Provider value={{ hod, token, login, logout,setAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

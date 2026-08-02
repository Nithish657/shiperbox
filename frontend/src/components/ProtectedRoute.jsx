import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // Check if the admin token exists in local storage
  const adminToken = localStorage.getItem("adminToken");

  // If there is no token, redirect them to the login page immediately
  if (!adminToken) {
    return <Navigate to="/admin/login" replace />;
  }

  // If the token exists, allow them to view the protected component
  return children;
}
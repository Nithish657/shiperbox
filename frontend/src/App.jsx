import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// DESKTOP IMPORTS
import Home from "./pages/Home";
import SearchResults from "./pages/SearchResults";
import CategoryItems from "./pages/CategoryItems";
import CustomGarland from "./pages/CustomGarland";
import AdminGarlandReview from "./admin/AdminGarlandReview";
import CourierOrder from "./pages/CourierOrder";
import MyOrders from "./pages/MyOrders";
import MyAddress from "./pages/MyAddress";
import AboutUs from "./pages/AboutUs";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import Address from './pages/Address';

// NEW: IMPORT PROTECTED ROUTE
import ProtectedRoute from "./components/ProtectedRoute"; // Adjust path if you saved it elsewhere

// MOBILE IMPORTS
import MobileHome from "./mobile/MobileHome";
import MobileSearchResults from "./mobile/MobileSearchResults";
import MobileItemsList from "./mobile/MobileItemsList";
import MobileGarlandOrder from "./mobile/MobileGarlandOrder";
import MobileCourierOrder from "./mobile/MobilecourierOrder";

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isMobile ? <MobileHome /> : <Home />} />
        <Route path="/home" element={isMobile ? <MobileHome /> : <Home />} />
        <Route path="/search" element={isMobile ? <MobileSearchResults /> : <SearchResults />} />
        <Route path="/category/:categoryId" element={isMobile ? <MobileItemsList /> : <CategoryItems />} />
        <Route path="/m-garland" element={<MobileGarlandOrder />} />

        {/* Garland order flow */}
        <Route path="/garland" element={isMobile ? <MobileGarlandOrder /> : <CustomGarland />} />
        <Route path="/admin/garland" element={<AdminGarlandReview />} />

        <Route path="/courier" element={isMobile ? <MobileCourierOrder /> : <CourierOrder />} />
        <Route path="/custom-garland" element={<CustomGarland />} />

        {/* NEW: profile menu destinations */}
        <Route path="/my-orders" element={<MyOrders />} />
        {/* FIXED: Changed from /address to /my-address to match your mobile navigation */}
        <Route path="/my-address" element={<MyAddress />} /> 
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/address" element={<Address />} />
        
        {/* === PUBLIC ADMIN ROUTES === */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* === PROTECTED ADMIN ROUTES === */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all redirect for /admin */}
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { Routes, Route, Navigate, useLocation  } from "react-router-dom";
import MyClassLayout from "./MyClassLayout.jsx";
import MyClassLogin from "./MyClassLogin.jsx";
import MyClassHome from "./MyClassHome.jsx";
import MyClassClasses from "./MyClassClasses.jsx";
import MyClassCourses from "./MyClassCourses.jsx";
import LiveRoomPage from "../LiveRoomPage.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { MC } from "./base.js";

function RequireUser({ children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return null;
  return user ? children : <Navigate to={MC("/login")} state={{ from: pathname }} replace />;
}

export default function MyClassRoutes() {
  return (
    <Routes>
      <Route path="login" element={<MyClassLogin />} />
      <Route element={<MyClassLayout />}>
        <Route index element={<MyClassHome />} />
        <Route path="classes" element={<MyClassClasses />} />
        <Route path="courses" element={<MyClassCourses />} />
      </Route>
      <Route path="live-class/:sessionId" element={<RequireUser><LiveRoomPage /></RequireUser>} />
      <Route path="*" element={<Navigate to={MC("/")} replace />} />
    </Routes>
  );
}
import { Routes, Route } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import RequireRole from "./guards.jsx";
import HomePage from "../pages/HomePage.jsx";
import CoursesPage from "../pages/CoursesPage.jsx";
import CourseDetailPage from "../pages/CourseDetailPage.jsx";
import CheckoutPage from "../pages/CheckoutPage.jsx";
import PaymentCallbackPage from "../pages/PaymentCallbackPage.jsx";
import BatchSelectPage from "../pages/BatchSelectPage.jsx";
import { LoginPage, RegisterPage } from "../pages/AuthPages.jsx";
import { AboutPage, LearningPathsPage, LiveClassesPublicPage, NotFoundPage } from "../pages/PublicInfoPages.jsx";
import DashboardHome from "../pages/dashboard/DashboardHome.jsx";
import MyCourses from "../pages/dashboard/MyCourses.jsx";
import LiveClasses from "../pages/dashboard/LiveClasses.jsx";
import Attendance from "../pages/dashboard/Attendance.jsx";
import Certificates from "../pages/dashboard/Certificates.jsx";
import Payments from "../pages/dashboard/Payments.jsx";
import Profile from "../pages/dashboard/Profile.jsx";
import LiveRoomPage from "../pages/LiveRoomPage.jsx";
import InstructorDashboard, { InstructorLayout } from "../pages/InstructorDashboard.jsx";
import AdminLayout from "../pages/admin/AdminLayout.jsx";
import AdminOverview from "../pages/admin/AdminOverview.jsx";
import AdminUsers from "../pages/admin/AdminUsers.jsx";
import AdminCourses from "../pages/admin/AdminCourses.jsx";
import AdminBatches from "../pages/admin/AdminBatches.jsx";
import AdminPromos from "../pages/admin/AdminPromos.jsx";
import AdminSettings from "../pages/admin/AdminSettings.jsx";
import AdminCashPayments from "../pages/admin/AdminCashPayments.jsx";
import AdminCategories from "../pages/admin/AdminCategories.jsx";
import MyClassRoutes from "../pages/myclass/MyClassRoutes.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/live-classes" element={<LiveClassesPublicPage />} />
        <Route path="/learning-paths" element={<LearningPathsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route element={<RequireRole roles={["student"]} />}>
          <Route path="/checkout/:courseId" element={<CheckoutPage />} />
          <Route path="/batch-select/:courseId" element={<BatchSelectPage />} />
          <Route path="/payment/callback/:gateway" element={<PaymentCallbackPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
       <Route path="/myclass/*" element={<MyClassRoutes />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireRole roles={["student"]} />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="live-classes" element={<LiveClasses />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="payments" element={<Payments />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>
      <Route element={<RequireRole roles={["student", "instructor"]} />}><Route path="/live-class/:sessionId" element={<LiveRoomPage />} /></Route>
      <Route element={<RequireRole roles={["instructor"]} />}><Route element={<InstructorLayout />}><Route path="/instructor/dashboard" element={<InstructorDashboard />} /></Route></Route>

      <Route element={<RequireRole roles={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="batches" element={<AdminBatches />} />
          <Route path="promos" element={<AdminPromos />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="cash-payments" element={<AdminCashPayments />} />
        </Route>
      </Route>
    </Routes>
  );
}
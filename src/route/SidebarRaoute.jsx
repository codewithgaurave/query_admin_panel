// src/routes/index.js
import { lazy } from "react";
import {
  FaCoins,
  FaUsers,
  FaBox,
  FaGavel,
  FaTachometerAlt,
  FaClipboardList,   // Survey icon
  FaQuestionCircle,  // Questions icon
  FaChartBar,        // Charts icon
  FaMapMarkerAlt,    // ⭐ Punch-ins icon
  FaThumbtack,       // ⭐ Pinned questions icon
  FaUserCog,         // Admin Profile icon
  FaStopCircle,      // Closed surveys icon
  FaUserShield,      // ⭐ Sub Admin icon
} from "react-icons/fa";

// Pages
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Users = lazy(() => import("../pages/Users"));
const SubAdmins = lazy(() => import("../pages/SubAdmins")); // ⭐ Sub Admins page (Super Admin only)
const Surveys = lazy(() => import("../pages/Surveys"));
const SurveyQuestions = lazy(() => import("../pages/SurveyQuestions"));
const SurveyResponses = lazy(() => import("../pages/SurveyResponses"));
const SurveyCharts = lazy(() => import("../pages/SurveyCharts"));
const Punchins = lazy(() => import("../pages/Punchins"));
const SurveyDashboardPins = lazy(() => import("../pages/SurveyDashboardPins"));
const AdminProfile = lazy(() => import("../pages/AdminProfile"));

const routes = [
  {
    path: "/dashboard",
    component: Dashboard,
    name: "Dashboard",
    icon: FaTachometerAlt,
    permission: "dashboard",
  },

  // ⭐ Sub Admins management (Super Admin Only)
  {
    path: "/sub-admins",
    component: SubAdmins,
    name: "Sub Admins",
    icon: FaUserShield,
    superAdminOnly: true,
  },

  // ⭐ Pinned Questions Dashboard
  {
    path: "/survey-dashboard",
    component: SurveyDashboardPins,
    name: "Pinned Questions",
    icon: FaThumbtack,
    permission: "pinnedQuestions",
  },

  // ⭐ Users management
  {
    path: "/users",
    component: Users,
    name: "Users",
    icon: FaUsers,
    permission: "users",
  },

  // ⭐ Punch-ins history page
  {
    path: "/punchins",
    component: Punchins,
    name: "Punch-ins",
    icon: FaMapMarkerAlt,
    permission: "punchins",
  },

  // ⭐ Active Surveys main page
  {
    path: "/surveys",
    component: Surveys,
    name: "Active Surveys",
    icon: FaClipboardList,
    permission: "surveys",
  },

  // ⭐ Closed / Inactive Surveys page
  {
    path: "/closed-surveys",
    component: Surveys,
    name: "Closed Surveys",
    icon: FaStopCircle,
    permission: "surveys",
  },

  // ⭐ Survey responses dashboard
  {
    path: "/survey-responses",
    component: SurveyResponses,
    name: "Survey Responses",
    icon: FaUsers,
    permission: "surveyResponses",
  },

  // ⭐ Survey charts / analytics page
  {
    path: "/survey-charts",
    component: SurveyCharts,
    name: "Survey Charts",
    icon: FaChartBar,
    permission: "surveyCharts",
  },

  // ⭐ Admin Profile (Accessible to everyone)
  {
    path: "/profile",
    component: AdminProfile,
    name: "Profile Settings",
    icon: FaUserCog,
  },

  // ⭐ Question builder route — HIDDEN from sidebar
  {
    path: "/surveys/:surveyIdOrCode/questions",
    component: SurveyQuestions,
    name: "Manage Questions",
    icon: FaQuestionCircle,
    permission: "surveys",
    hide: true,
  },
];

export default routes;

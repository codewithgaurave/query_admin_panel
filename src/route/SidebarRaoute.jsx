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
} from "react-icons/fa";

// Existing pages
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Users = lazy(() => import("../pages/Users"));

// New survey pages
const Surveys = lazy(() => import("../pages/Surveys"));
const SurveyQuestions = lazy(() => import("../pages/SurveyQuestions"));
const SurveyResponses = lazy(() => import("../pages/SurveyResponses"));
const SurveyCharts = lazy(() => import("../pages/SurveyCharts")); // ⭐ charts page

// ⭐ NEW: Punch-ins page
const Punchins = lazy(() => import("../pages/Punchins"));

// ⭐ NEW: Pinned Questions Dashboard page
const SurveyDashboardPins = lazy(() =>
  import("../pages/SurveyDashboardPins")
);

const routes = [
  {
    path: "/dashboard",
    component: Dashboard,
    name: "Dashboard",
    icon: FaTachometerAlt,
  },

  // ⭐ NEW: Pinned Questions Dashboard – sidebar me Dashboard ke just niche
  {
    path: "/survey-dashboard",
    component: SurveyDashboardPins,
    name: "Pinned Questions",
    icon: FaThumbtack,
  },

  { path: "/users", component: Users, name: "Users", icon: FaUsers },

  // ⭐ Punch-ins history page
  {
    path: "/punchins",
    component: Punchins,
    name: "Punch-ins",
    icon: FaMapMarkerAlt,
  },

  // ⭐ Surveys main page
  {
    path: "/surveys",
    component: Surveys,
    name: "Surveys",
    icon: FaClipboardList,
  },

  // ⭐ Survey responses dashboard
  {
    path: "/survey-responses",
    component: SurveyResponses,
    name: "Survey Responses",
    icon: FaUsers, // ya koi aur icon jo tumhe pasand ho
  },

  // ⭐ Survey charts / analytics page
  {
    path: "/survey-charts",
    component: SurveyCharts,
    name: "Survey Charts",
    icon: FaChartBar,
  },

  // ⭐ Question builder route — HIDDEN from sidebar
  {
    path: "/surveys/:surveyIdOrCode/questions",
    component: SurveyQuestions,
    name: "Manage Questions",
    icon: FaQuestionCircle,
    hide: true, // ✅ sidebar me mat dikhana
  },
];

export default routes;

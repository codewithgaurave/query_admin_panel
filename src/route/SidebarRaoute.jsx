// src/routes/index.js
import { lazy } from "react";
import {
  FaCoins,
  FaUsers,
  FaBox,
  FaGavel,
  FaTachometerAlt,
  FaClipboardList,   // Survey icon
  FaQuestionCircle, // Questions icon
} from "react-icons/fa";

// Existing pages
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Users = lazy(() => import("../pages/Users"));

// New survey pages
const Surveys = lazy(() => import("../pages/Surveys"));
const SurveyQuestions = lazy(() => import("../pages/SurveyQuestions"));
const SurveyResponses = lazy(() => import("../pages/SurveyResponses"));

const routes = [
  { path: "/dashboard", component: Dashboard, name: "Dashboard", icon: FaTachometerAlt },

  { path: "/users", component: Users, name: "Users", icon: FaUsers },

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

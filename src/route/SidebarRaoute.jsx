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
const Auctions = lazy(() => import("../pages/Auctions"));
const Lots = lazy(() => import("../pages/Lots"));
const Bids = lazy(() => import("../pages/Bids"));
const Plans = lazy(() => import("../pages/Plans"));
const Purchases = lazy(() => import("../pages/Purchases"));

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

  // (Baaki tumhare pehle wale routes agar use ho rahe hain to unko bhi yaha rakho:)
  // { path: "/auctions", component: Auctions, name: "Auctions", icon: FaGavel },
  // { path: "/lots", component: Lots, name: "Lots", icon: FaBox },
  // { path: "/bids", component: Bids, name: "Bids", icon: FaCoins },
  // { path: "/plans", component: Plans, name: "Plans", icon: FaCoins },
  // { path: "/purchases", component: Purchases, name: "Purchases", icon: FaCoins },
];

export default routes;

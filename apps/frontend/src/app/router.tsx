import { createBrowserRouter, redirect } from "react-router-dom";

import { LoginPage } from "../features/auth/pages/LoginPage";
import { OidcCallbackPage } from "../features/auth/pages/OidcCallbackPage";
import { AddFamilyMemberPage } from "../features/family/pages/AddFamilyMemberPage";
import { CalendarSetupPage } from "../features/family/pages/CalendarSetupPage";
import { getSession } from "../features/auth/services/authStorage";
import { CreateFamilyPage } from "../features/families/pages/CreateFamilyPage";
import { CalendarPage } from "../features/calendar/pages/CalendarPage";
import { CalendarOAuthCallbackPage } from "../features/calendar/pages/CalendarOAuthCallbackPage";
import { HomePage } from "../features/home/pages/HomePage";
import { ShoppingListPage } from "../features/shopping/pages/ShoppingListPage";
import { TodoPage } from "../features/todo/pages/TodoPage";
import { hasStoredFamily } from "../features/families/services/familyStorage";
import { FamilySettingsPage } from "../features/family/pages/FamilySettingsPage";
import { ProfileSetupPage } from "../features/profile/pages/ProfileSetupPage";
import { hasStoredProfile } from "../features/profile/services/profileStorage";

import { AppLayout } from "./AppLayout";

const getPostAuthRedirect = () => {
  if (!hasStoredProfile()) {
    return "/app/profile";
  }
  return hasStoredFamily() ? "/app/home" : "/app/create-family";
};
const requireFamily = () => {
  if (!hasStoredProfile()) {
    return redirect("/app/profile");
  }
  if (!hasStoredFamily()) {
    return redirect("/app/create-family");
  }
  return null;
};

export const router = createBrowserRouter([
  {
    path: "/",
    loader: () => redirect("/login"),
  },
  {
    path: "/login",
    loader: () => {
      const session = getSession();
      if (session) {
        return redirect(getPostAuthRedirect());
      }
      return null;
    },
    element: <LoginPage />,
  },
  {
    path: "/auth/oidc/callback",
    element: <OidcCallbackPage />,
  },
  {
    path: "/calendar/oauth/callback",
    element: <CalendarOAuthCallbackPage />,
  },
  {
    path: "/app",
    loader: () => {
      const session = getSession();
      if (!session) {
        return redirect("/login");
      }
      return null;
    },
    element: <AppLayout />,
    children: [
      {
        index: true,
        loader: () => redirect(getPostAuthRedirect()),
      },
      {
        path: "profile",
        loader: () => {
          if (hasStoredProfile()) {
            return redirect(getPostAuthRedirect());
          }
          return null;
        },
        element: <ProfileSetupPage />,
      },
      {
        path: "home",
        loader: requireFamily,
        element: <HomePage />,
      },
      {
        path: "calendar",
        loader: requireFamily,
        element: <CalendarPage />,
      },
      {
        path: "todo",
        loader: requireFamily,
        element: <TodoPage />,
      },
      {
        path: "shopping-list",
        loader: requireFamily,
        element: <ShoppingListPage />,
      },
      {
        path: "family/add",
        loader: requireFamily,
        element: <AddFamilyMemberPage />,
      },
      {
        path: "family/calendar-setup",
        loader: requireFamily,
        element: <CalendarSetupPage />,
      },
      {
        path: "family/settings",
        loader: requireFamily,
        element: <FamilySettingsPage />,
      },
      {
        path: "create-family",
        loader: () => {
          if (!hasStoredProfile()) {
            return redirect("/app/profile");
          }
          if (hasStoredFamily()) {
            return redirect("/app/home");
          }
          return null;
        },
        element: <CreateFamilyPage />,
      },
    ],
  },
]);

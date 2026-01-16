import { createBrowserRouter, redirect } from "react-router-dom";

import { LoginPage } from "../features/auth/pages/LoginPage";
import { AddFamilyMemberPage } from "../features/family/pages/AddFamilyMemberPage";
import { getSession } from "../features/auth/services/authStorage";
import { CreateFamilyPage } from "../features/families/pages/CreateFamilyPage";
import { CalendarPage } from "../features/calendar/pages/CalendarPage";
import { HomePage } from "../features/home/pages/HomePage";
import { ShoppingListPage } from "../features/shopping/pages/ShoppingListPage";
import { TodoPage } from "../features/todo/pages/TodoPage";
import { FamilySettingsPage } from "../features/family/pages/FamilySettingsPage";

import { AppLayout } from "./AppLayout";

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
        return redirect("/app");
      }
      return null;
    },
    element: <LoginPage />,
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
        loader: () => redirect("/app/home"),
      },
      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "calendar",
        element: <CalendarPage />,
      },
      {
        path: "todo",
        element: <TodoPage />,
      },
      {
        path: "shopping-list",
        element: <ShoppingListPage />,
      },
      {
        path: "family/add",
        element: <AddFamilyMemberPage />,
      },
      {
        path: "family/settings",
        element: <FamilySettingsPage />,
      },
      {
        path: "create-family",
        element: <CreateFamilyPage />,
      },
    ],
  },
]);

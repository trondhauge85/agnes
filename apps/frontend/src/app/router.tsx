import { createBrowserRouter, redirect } from "react-router-dom";

import { LoginPage } from "../features/auth/pages/LoginPage";
import { AddFamilyMemberPage } from "../features/family/pages/AddFamilyMemberPage";
import { getSession } from "../features/auth/services/authStorage";
import { CreateFamilyPage } from "../features/families/pages/CreateFamilyPage";
import { CalendarPage } from "../features/calendar/pages/CalendarPage";
import { HomePage } from "../features/home/pages/HomePage";
import { ShoppingListPage } from "../features/shopping/pages/ShoppingListPage";
import { TodoPage } from "../features/todo/pages/TodoPage";
import { hasStoredFamily } from "../features/families/services/familyStorage";

import { AppLayout } from "./AppLayout";

const getPostAuthRedirect = () => (hasStoredFamily() ? "/app/home" : "/app/create-family");
const requireFamily = () => {
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
        path: "create-family",
        loader: () => {
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

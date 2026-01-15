import { createBrowserRouter, redirect } from "react-router-dom";

import { LoginPage } from "../features/auth/pages/LoginPage";
import { HomePage } from "../features/home/pages/HomePage";
import { AddFamilyMemberPage } from "../features/family/pages/AddFamilyMemberPage";
import { CreateFamilyPage } from "../features/families/pages/CreateFamilyPage";
import { getSession } from "../features/auth/services/authStorage";

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
    loader: () => redirect("/app/home"),
  },
  {
    path: "/app/home",
    loader: () => {
      const session = getSession();
      if (!session) {
        return redirect("/login");
      }
      return null;
    },
    element: <HomePage />,
  },
  {
    path: "/app/family/add",
    loader: () => {
      const session = getSession();
      if (!session) {
        return redirect("/login");
      }
      return null;
    },
    element: <AddFamilyMemberPage />,
  },
  {
    path: "/app/create-family",
    element: <CreateFamilyPage />,
  },
]);

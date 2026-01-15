import { createBrowserRouter, redirect } from "react-router-dom";

import { LoginPage } from "../features/auth/pages/LoginPage";
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
    loader: () => redirect("/app/create-family"),
  },
  {
    path: "/app/create-family",
    element: <CreateFamilyPage />,
  },
]);

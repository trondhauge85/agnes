import { createBrowserRouter, redirect } from "react-router-dom";

import { LoginPage } from "../features/auth/pages/LoginPage";
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
    element: (
      <main style={{ padding: "2rem", fontFamily: "Inter, sans-serif" }}>
        <h1>Welcome to Agnes</h1>
        <p>Authenticated routes will live here.</p>
      </main>
    ),
  },
]);

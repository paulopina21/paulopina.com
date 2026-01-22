import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./styles.css";
import RootLayout from "./ui/RootLayout";
import DashboardPage from "./ui/pages/DashboardPage";
import PatientsPage from "./ui/pages/PatientsPage";
import PatientNewPage from "./ui/pages/PatientNewPage";
import PatientDetailPage from "./ui/pages/PatientDetailPage";
import FinancePage from "./ui/pages/FinancePage";
import CalendarPage from "./ui/pages/CalendarPage";
import QuestionsPage from "./ui/pages/QuestionsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "patients", element: <PatientsPage /> },
      { path: "patients/new", element: <PatientNewPage /> },
      { path: "patients/:id", element: <PatientDetailPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "questions", element: <QuestionsPage /> },
    ],
  },
]);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);

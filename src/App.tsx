import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import WorkerGridPage from "./pages/WorkerGridPage";
import WorkerDetailPage from "./pages/WorkerDetailPage";
import CustomersPage from "./pages/CustomersPage";
import WorkersPage from "./pages/WorkersPage";
import WeeklyReportPage from "./pages/WeeklyReportPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<WorkerGridPage />} />
              <Route path="/worker/:id" element={<WorkerDetailPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/report" element={<WeeklyReportPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

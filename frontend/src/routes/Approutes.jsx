import { Routes, Route } from "react-router-dom";
import Clients from "../pages/Clients/Clients";
import Dashboard from "../pages/Dashboard/Dashboard"
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/clients" element={<Clients />} />
      <Route path="/" element={<Dashboard />} />
      {/* add more routes here */}
    </Routes>
  );
}
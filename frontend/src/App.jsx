import { BrowserRouter } from "react-router-dom";
import Navbar from "./components/Layout/Navbar";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <div style={{ marginLeft: 260, padding: 20, marginTop: 80 }}>
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
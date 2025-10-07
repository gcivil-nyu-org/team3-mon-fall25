// Application routes configuration.
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import App from "../App";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

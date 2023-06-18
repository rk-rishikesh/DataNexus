import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Nexus from "./nexus";
import Deal from "./deal";
import { BrowserRouter, Routes, Route } from "react-router-dom";
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/nexus" element={<Deal />}/>
        <Route path="/" element={<Nexus />}/>
      </Routes>
    </BrowserRouter>

  </React.StrictMode>
);


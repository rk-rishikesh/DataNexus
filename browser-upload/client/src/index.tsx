import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Upload from "./Upload";
import App from "./app";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <App/>
    <Upload />
  </React.StrictMode>
);

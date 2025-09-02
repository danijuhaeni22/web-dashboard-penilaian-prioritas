// frontend/src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // <-- WAJIB agar @tailwind/@apply diproses

createRoot(document.getElementById("root")).render(<App />);

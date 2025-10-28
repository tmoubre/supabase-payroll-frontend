// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import TicketForm from "./components/TicketForm";

function Placeholder({ title }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p>Coming soon.</p>
    </div>
  );
}

function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        {/* Landing */}
        <Route path="/" element={<Home />} />

        {/* Ticket creation */}
        <Route path="/tickets/new" element={<TicketForm />} />
        {/* Alias so /new also goes to the form */}
        <Route path="/new" element={<Navigate to="/tickets/new" replace />} />

        {/* Stubs for future pages */}
        <Route path="/tickets" element={<Placeholder title="Tickets" />} />
        <Route
          path="/rate-cards"
          element={<Placeholder title="Rate Cards" />}
        />
        <Route path="/reports" element={<Placeholder title="Reports" />} />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}

export default App;

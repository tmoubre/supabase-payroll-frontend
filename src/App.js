//App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import TicketForm from "./components/TicketForm";
import SignIn from "./pages/SignIn";
import RequireAuth from "./components/RequireAuth";
import TicketsList from "./pages/TicketsList";

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
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />

        {/* Protected */}
        <Route
          path="/tickets/new"
          element={
            <RequireAuth>
              <TicketForm />
            </RequireAuth>
          }
        />
        <Route
          path="/tickets"
          element={
            <RequireAuth>
              <TicketsList />
            </RequireAuth>
          }
        />

        {/* Alias */}
        <Route path="/new" element={<Navigate to="/tickets/new" replace />} />

        {/* Other stubs (protected) */}
        <Route
          path="/rate-cards"
          element={
            <RequireAuth>
              <Placeholder title="Rate Cards" />
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth>
              <Placeholder title="Reports" />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}

export default App;

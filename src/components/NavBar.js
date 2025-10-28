// src/components/NavBar.js
import React from "react";
import { Link, NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>
        Ops Portal
      </Link>
      <div style={{ display: "flex", gap: 12 }}>
        <NavLink to="/tickets/new" style={styles.link}>
          Create Ticket
        </NavLink>
        <NavLink to="/tickets" style={styles.link}>
          Tickets
        </NavLink>
        <NavLink to="/rate-cards" style={styles.link}>
          Rate Cards
        </NavLink>
        <NavLink to="/reports" style={styles.link}>
          Reports
        </NavLink>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #eee",
    background: "#fff",
  },
  brand: { fontWeight: 800, textDecoration: "none", color: "#111827" },
  link: ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "#111827" : "#4b5563",
    fontWeight: 600,
    padding: "6px 10px",
    borderRadius: 8,
    background: isActive ? "#f3f4f6" : "transparent",
  }),
};

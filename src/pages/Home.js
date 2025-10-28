// src/pages/Home.js
import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={{ marginTop: 0 }}>Operations Portal</h1>
        <p style={{ color: "#555" }}>Choose an action to get started.</p>

        <div style={styles.grid}>
          <Link to="/tickets/new" style={styles.tile}>
            <span role="img" aria-label="ticket">
              📝
            </span>
            <div>Create Ticket</div>
          </Link>
          <Link to="/tickets" style={styles.tile}>
            <span role="img" aria-label="list">
              📋
            </span>
            <div>View Tickets</div>
          </Link>
          <Link to="/rate-cards" style={styles.tile}>
            <span role="img" aria-label="rates">
              💵
            </span>
            <div>Rate Cards</div>
          </Link>
          <Link to="/reports" style={styles.tile}>
            <span role="img" aria-label="reports">
              📈
            </span>
            <div>Reports</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f8fafc",
    padding: 24,
  },
  card: {
    width: "min(960px, 100%)",
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,.05)",
    padding: 24,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  tile: {
    display: "grid",
    placeItems: "center",
    gap: 8,
    textDecoration: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    color: "#111827",
    background: "#fafafa",
    fontWeight: 600,
  },
};

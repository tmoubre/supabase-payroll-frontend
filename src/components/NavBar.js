//NavBar.js
import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function NavBar() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>
        Ops Portal
      </Link>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
        {session ? (
          <button onClick={signOut} style={styles.btn}>
            Sign out
          </button>
        ) : (
          <NavLink to="/signin" style={styles.link}>
            Sign in
          </NavLink>
        )}
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
  btn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  },
};

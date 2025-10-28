//TicketList.js
// src/pages/TicketsList.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function TicketsList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  async function load() {
    setLoading(true);
    setMsg(null);

    // Pull recent tickets with joined job number
    const { data, error } = await supabase
      .from("time_tickets")
      .select(
        "ticket_id, ticket_number, ticket_date, weekending_date, job_id, jobs:job_id ( job_number )"
      )
      .order("ticket_number", { ascending: false }) // newest first
      .limit(300);

    setLoading(false);
    if (error) setMsg({ type: "error", text: error.message });
    else setRows(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  // simple search by ticket # or job #
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const tnum = (r.ticket_number ?? "").toString();
      const job = (r.jobs?.job_number || "").toLowerCase();
      return tnum.includes(s) || job.includes(s);
    });
  }, [rows, q]);

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Tickets</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Search by Ticket # or Job #"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              width: 260,
            }}
          />
          <button onClick={load} style={btn}>
            Refresh
          </button>
          <Link
            to="/tickets/new"
            style={{ ...btn, textDecoration: "none", lineHeight: "32px" }}
          >
            + New Ticket
          </Link>
        </div>
      </div>

      {loading && <div style={{ marginTop: 12 }}>Loading…</div>}
      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 8,
            background: "#fdeaea",
            border: "1px solid #f0c2c2",
          }}
        >
          {msg.text}
        </div>
      )}

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}
        >
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={th}>Ticket #</th>
              <th style={th}>Job #</th>
              <th style={th}>Ticket Date</th>
              <th style={th}>Weekending</th>
              <th style={thRight}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.ticket_id} style={{ borderTop: "1px solid #eee" }}>
                <td style={tdMono}>{r.ticket_number ?? "—"}</td>
                <td style={td}>{r.jobs?.job_number || "—"}</td>
                <td style={td}>{fmt(r.ticket_date)}</td>
                <td style={td}>{fmt(r.weekending_date)}</td>
                <td style={tdRight}>
                  {/* Placeholder detail link—wire up when you add a details page */}
                  {/* <Link to={`/tickets/${r.ticket_id}`} style={linkBtn}>View</Link> */}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: 12, color: "#666" }}>
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  padding: "10px 8px",
  fontWeight: 700,
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};
const thRight = { ...th, textAlign: "right" };
const td = { padding: "10px 8px", verticalAlign: "top" };
const tdRight = { ...td, textAlign: "right" };
const tdMono = {
  ...td,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
};
const btn = {
  border: "1px solid #ddd",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 600,
};
const linkBtn = {
  border: "1px solid #ddd",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  textDecoration: "none",
  color: "#111827",
  fontWeight: 600,
};

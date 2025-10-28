//TicketList.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export default function TicketsList() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      // adjust select to your table/column names
      const { data, error } = await supabase
        .from("time_tickets")
        .select(
          "ticket_id, ticket_date, weekending_date, job_id, jobs:job_id ( job_number )"
        )
        .order("ticket_date", { ascending: false })
        .limit(200);
      if (ignore) return;
      setLoading(false);
      if (error) setMsg({ type: "error", text: error.message });
      else setRows(data || []);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      (r.jobs?.job_number || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Recent Tickets</h2>

      <input
        placeholder="Search by Job #"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          width: "100%",
          maxWidth: 320,
        }}
      />

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

      <table
        style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={th}>Ticket ID</th>
            <th style={th}>Job #</th>
            <th style={th}>Ticket Date</th>
            <th style={th}>Weekending</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.ticket_id} style={{ borderTop: "1px solid #eee" }}>
              <td style={td}>{r.ticket_id}</td>
              <td style={td}>{r.jobs?.job_number || "—"}</td>
              <td style={td}>{r.ticket_date}</td>
              <td style={td}>{r.weekending_date || "—"}</td>
              <td style={td}>
                <a href={`/tickets/${r.ticket_id}`} style={linkBtn}>
                  View
                </a>
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
  );
}

const th = {
  padding: "8px 6px",
  fontWeight: 700,
  borderBottom: "1px solid #eee",
};

const td = {
  padding: "8px 6px",
};

const linkBtn = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  textDecoration: "none",
  color: "#111827",
  fontWeight: 600,
};

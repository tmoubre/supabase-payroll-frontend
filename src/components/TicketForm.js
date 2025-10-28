// src/components/TicketForm.js
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function TicketForm() {
  // Base data
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paycodes, setPaycodes] = useState([]);

  // Ticket header
  const [jobSearch, setJobSearch] = useState('');
  const [jobId, setJobId] = useState('');
  const [ticketDate, setTicketDate] = useState('');
  const [notes, setNotes] = useState('');

  // Line groups
  const [laborRows, setLaborRows] = useState([
    { employee_id: '', pay_code_id: '', hours: 8, day_date: '' }
  ]);
  const [equipRows, setEquipRows] = useState([]);   // { equipment_code, quantity, hours, rate, cost, notes }
  const [matRows, setMatRows] = useState([]);       // { material_code, quantity, unit, rate, cost, notes }
  const [svcRows, setSvcRows] = useState([]);       // { service_code, quantity, hours, rate, cost, notes }

  // UX
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Load lookups
  useEffect(() => {
    let ignore = false;
    (async () => {
      const [{ data: jobsData, error: jobsErr }, { data: empData, error: empErr }, { data: pcData, error: pcErr }] =
        await Promise.all([
          supabase.from('jobs').select('job_id, job_number, po_number, work_order').limit(1000),
          supabase.from('employees').select('employee_id, badge_id, first_name, last_name').limit(2000),
          supabase.from('paycodes').select('pay_code_id, code').order('code')
        ]);
      if (ignore) return;
      if (jobsErr || empErr || pcErr) {
        setMessage({ type: 'error', text: (jobsErr||empErr||pcErr).message });
        return;
      }
      setJobs(jobsData || []);
      setEmployees(empData || []);
      setPaycodes(pcData || []);
    })();
    return () => { ignore = true; };
  }, []);

  // Search filter for jobs
  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(j =>
      (j.job_number || '').toLowerCase().includes(q) ||
      (j.po_number || '').toLowerCase().includes(q) ||
      (j.work_order || '').toLowerCase().includes(q)
    );
  }, [jobs, jobSearch]);

  // Weekending preview (DB trigger sets the real value)
  const weekendingPreview = useMemo(() => {
    if (!ticketDate) return '';
    const d = new Date(ticketDate);
    const day = d.getUTCDay(); // 0=Sun
    const diffToSun = (7 - day) % 7;
    const sunday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diffToSun));
    return sunday.toISOString().slice(0, 10);
  }, [ticketDate]);

  // Helpers
  const addRow = (setter, blank) => setter(prev => [...prev, blank]);
  const removeRow = (setter, i) => setter(prev => prev.filter((_, idx) => idx !== i));
  const setRowField = (setter, i, key, val) =>
    setter(prev => prev.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (!jobId || !ticketDate) {
      setMessage({ type: 'error', text: 'Job and Ticket Date are required.' });
      return;
    }

    // Prepare payloads (filter out empty rows)
    const labor = laborRows
      .filter(r => r.employee_id && r.pay_code_id && Number(r.hours) > 0)
      .map(r => ({
        ...r,
        hours: Number(r.hours),
        day_date: r.day_date || ticketDate
      }));

    const equipment = equipRows
      .filter(r => r.equipment_code && (Number(r.hours) > 0 || Number(r.quantity) > 0))
      .map(r => ({
        ...r,
        hours: r.hours ? Number(r.hours) : null,
        quantity: r.quantity ? Number(r.quantity) : null,
        rate: r.rate ? Number(r.rate) : null,
        cost: r.cost ? Number(r.cost) : null
      }));

    const materials = matRows
      .filter(r => r.material_code && Number(r.quantity) > 0)
      .map(r => ({
        ...r,
        quantity: Number(r.quantity),
        rate: r.rate ? Number(r.rate) : null,
        cost: r.cost ? Number(r.cost) : null
      }));

    const services = svcRows
      .filter(r => r.service_code && (Number(r.hours) > 0 || Number(r.quantity) > 0))
      .map(r => ({
        ...r,
        hours: r.hours ? Number(r.hours) : null,
        quantity: r.quantity ? Number(r.quantity) : null,
        rate: r.rate ? Number(r.rate) : null,
        cost: r.cost ? Number(r.cost) : null
      }));

    setSaving(true);
    const { data, error } = await supabase.rpc('create_ticket_with_lines', {
      p_job_id: jobId,
      p_ticket_date: ticketDate,
      p_notes: notes || null,
      p_labor: labor,
      p_equipment: equipment,
      p_materials: materials,
      p_services: services
    });
    setSaving(false);

    if (error) {
      const fnMissing = /function .* does not exist/i.test(error.message);
      const rlsHint = /row-level security/i.test(error.message)
        ? ' RLS may be blocking inserts; confirm your policies or use SECURITY DEFINER on the function.'
        : '';
      setMessage({
        type: 'error',
        text: fnMissing
          ? 'RPC function create_ticket_with_lines not found. Run the SQL to create it, then try again.'
          : `Failed to save: ${error.message}.${rlsHint}`
      });
      return;
    }

    const newId = data?.[0]?.ticket_id || '(created)';
    setMessage({ type: 'success', text: `Ticket ${newId} created with all lines.` });

    // reset lines; keep job/date for speed if you want
    setLaborRows([{ employee_id: '', pay_code_id: '', hours: 8, day_date: '' }]);
    setEquipRows([]); setMatRows([]); setSvcRows([]);
  }

  return (
    <div style={styles.wrapper}>
      <h2 style={{ margin: 0 }}>Create Ticket + Lines</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
        {/* Header */}
        <section style={styles.section}>
          <div style={styles.grid3}>
            <div>
              <label style={styles.label}>Search Jobs</label>
              <input
                style={styles.input}
                placeholder="Job #, PO, or WO"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>Job</label>
              <select style={styles.input} value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value="">— Select Job —</option>
                {filteredJobs.map(j => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.job_number} · PO {j.po_number || '—'} · WO {j.work_order || '—'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Ticket Date</label>
              <input style={styles.input} type="date" value={ticketDate} onChange={(e)=>setTicketDate(e.target.value)} />
              {!!ticketDate && <div style={styles.hint}>Weekending (preview): <b>{weekendingPreview}</b></div>}
            </div>
          </div>

          <label style={styles.label}>Notes (optional)</label>
          <input style={styles.input} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="e.g., night shift, special access" />
        </section>

        {/* Labor */}
        <section style={styles.section}>
          <div style={styles.headRow}>
            <h3 style={{ margin: 0 }}>Labor Lines</h3>
            <button type="button" onClick={()=>addRow(setLaborRows, { employee_id:'', pay_code_id:'', hours:8, day_date:'' })}>+ Add labor</button>
          </div>
          <div style={styles.tableHead}>
            <div>Employee</div><div>Pay Code</div><div>Hours</div><div>Day (optional)</div><div></div>
          </div>
          {laborRows.map((r,i)=>(
            <div key={`lab-${i}`} style={styles.tableRow}>
              <select style={styles.input}
                      value={r.employee_id}
                      onChange={(e)=>setRowField(setLaborRows,i,'employee_id',e.target.value)}>
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.badge_id} — {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
              <select style={styles.input}
                      value={r.pay_code_id}
                      onChange={(e)=>setRowField(setLaborRows,i,'pay_code_id',e.target.value)}>
                <option value="">Pay code</option>
                {paycodes.map(pc => (
                  <option key={pc.pay_code_id} value={pc.pay_code_id}>{pc.code}</option>
                ))}
              </select>
              <input type="number" step="0.25" style={styles.input}
                     value={r.hours}
                     onChange={(e)=>setRowField(setLaborRows,i,'hours',e.target.value)} />
              <input type="date" style={styles.input}
                     value={r.day_date||''}
                     onChange={(e)=>setRowField(setLaborRows,i,'day_date',e.target.value)} />
              <button type="button" onClick={()=>removeRow(setLaborRows,i)}>Remove</button>
            </div>
          ))}
        </section>

        {/* Equipment */}
        <section style={styles.section}>
          <div style={styles.headRow}>
            <h3 style={{ margin: 0 }}>Equipment</h3>
            <button type="button" onClick={()=>addRow(setEquipRows, { equipment_code:'', quantity:'', hours:'', rate:'', cost:'', notes:'' })}>+ Add equipment</button>
          </div>
          <div style={styles.tableHead}>
            <div>Code</div><div>Qty</div><div>Hours</div><div>Rate</div><div>Cost</div><div>Notes</div><div></div>
          </div>
          {equipRows.map((r,i)=>(
            <div key={`eq-${i}`} style={styles.tableRow7}>
              <input style={styles.input} placeholder="equipment_code" value={r.equipment_code||''} onChange={e=>setRowField(setEquipRows,i,'equipment_code',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.quantity||''} onChange={e=>setRowField(setEquipRows,i,'quantity',e.target.value)} />
              <input style={styles.input} type="number" step="0.25" value={r.hours||''} onChange={e=>setRowField(setEquipRows,i,'hours',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.rate||''} onChange={e=>setRowField(setEquipRows,i,'rate',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.cost||''} onChange={e=>setRowField(setEquipRows,i,'cost',e.target.value)} />
              <input style={styles.input} placeholder="notes" value={r.notes||''} onChange={e=>setRowField(setEquipRows,i,'notes',e.target.value)} />
              <button type="button" onClick={()=>removeRow(setEquipRows,i)}>Remove</button>
            </div>
          ))}
        </section>

        {/* Materials */}
        <section style={styles.section}>
          <div style={styles.headRow}>
            <h3 style={{ margin: 0 }}>Materials</h3>
            <button type="button" onClick={()=>addRow(setMatRows, { material_code:'', quantity:'', unit:'', rate:'', cost:'', notes:'' })}>+ Add material</button>
          </div>
          <div style={styles.tableHead}>
            <div>Code</div><div>Qty</div><div>Unit</div><div>Rate</div><div>Cost</div><div>Notes</div><div></div>
          </div>
          {matRows.map((r,i)=>(
            <div key={`mat-${i}`} style={styles.tableRow7}>
              <input style={styles.input} placeholder="material_code" value={r.material_code||''} onChange={e=>setRowField(setMatRows,i,'material_code',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.quantity||''} onChange={e=>setRowField(setMatRows,i,'quantity',e.target.value)} />
              <input style={styles.input} placeholder="unit" value={r.unit||''} onChange={e=>setRowField(setMatRows,i,'unit',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.rate||''} onChange={e=>setRowField(setMatRows,i,'rate',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.cost||''} onChange={e=>setRowField(setMatRows,i,'cost',e.target.value)} />
              <input style={styles.input} placeholder="notes" value={r.notes||''} onChange={e=>setRowField(setMatRows,i,'notes',e.target.value)} />
              <button type="button" onClick={()=>removeRow(setMatRows,i)}>Remove</button>
            </div>
          ))}
        </section>

        {/* Services */}
        <section style={styles.section}>
          <div style={styles.headRow}>
            <h3 style={{ margin: 0 }}>Services</h3>
            <button type="button" onClick={()=>addRow(setSvcRows, { service_code:'', quantity:'', hours:'', rate:'', cost:'', notes:'' })}>+ Add service</button>
          </div>
          <div style={styles.tableHead}>
            <div>Code</div><div>Qty</div><div>Hours</div><div>Rate</div><div>Cost</div><div>Notes</div><div></div>
          </div>
          {svcRows.map((r,i)=>(
            <div key={`svc-${i}`} style={styles.tableRow7}>
              <input style={styles.input} placeholder="service_code" value={r.service_code||''} onChange={e=>setRowField(setSvcRows,i,'service_code',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.quantity||''} onChange={e=>setRowField(setSvcRows,i,'quantity',e.target.value)} />
              <input style={styles.input} type="number" step="0.25" value={r.hours||''} onChange={e=>setRowField(setSvcRows,i,'hours',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.rate||''} onChange={e=>setRowField(setSvcRows,i,'rate',e.target.value)} />
              <input style={styles.input} type="number" step="0.01" value={r.cost||''} onChange={e=>setRowField(setSvcRows,i,'cost',e.target.value)} />
              <input style={styles.input} placeholder="notes" value={r.notes||''} onChange={e=>setRowField(setSvcRows,i,'notes',e.target.value)} />
              <button type="button" onClick={()=>removeRow(setSvcRows,i)}>Remove</button>
            </div>
          ))}
        </section>

        <button disabled={saving} style={styles.button}>
          {saving ? 'Saving…' : 'Create Ticket + Lines'}
        </button>

        {message && (
          <div
            style={{
              marginTop: 8, padding: '10px 12px', borderRadius: 8,
              background: message.type === 'success' ? '#e8f7ed' : '#fdeaea',
              color: message.type === 'success' ? '#155d27' : '#7a1e1e',
              border: `1px solid ${message.type === 'success' ? '#b3e6c3' : '#f0c2c2'}`
            }}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: 1100, margin: '24px auto', padding: 20,
    borderRadius: 12, border: '1px solid #eee', background: '#fff',
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  },
  section: { border: '1px solid #eee', borderRadius: 10, padding: 12 },
  label: { fontWeight: 600, marginBottom: 4, display: 'block' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', width: '100%' },
  hint: { fontSize: 12, color: '#666', marginTop: 6 },
  headRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  tableHead: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8,
    fontWeight: 600, color: '#444', marginBottom: 6
  },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 },
  tableRow7: { display: 'grid', gridTemplateColumns: '1.2fr .8fr .8fr .8fr .8fr 1fr auto', gap: 8, marginBottom: 8 },
  button: {
    marginTop: 6, padding: '10px 14px', borderRadius: 10,
    background: '#111827', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600
  }
};


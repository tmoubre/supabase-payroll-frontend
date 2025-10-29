// src/components/TicketForm.js
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function TicketForm() {
  // header fields
  const [jobId, setJobId] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [ticketDate, setTicketDate] = useState('');
  const [notes, setNotes] = useState('');

  // reference data
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paycodes, setPaycodes] = useState([]);

  // dynamic lines
  const emptyLabor = { employee_id: '', pay_code_id: '', hours: '8', day_date: '' };
  const [labor, setLabor] = useState([{ ...emptyLabor }]);

  // equipment: { code, qty, hours, rate, notes }
  const [equipment, setEquipment] = useState([]);

  // materials: reserved for future; keep empty array
  const [materials, setMaterials] = useState([]);

  // services: { code, qty, rate, notes }
  const [services, setServices] = useState([]);

  // ui state
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  // load lookups
  useEffect(() => {
    let ignore = false;
    (async () => {
      const [{ data: jobData, error: jobErr }, { data: empData }, { data: pcData }] =
        await Promise.all([
          supabase.from('jobs').select('job_id, job_number, po_number, work_order').order('job_number'),
          supabase.from('employees').select('employee_id, name').order('name'),
          supabase.from('paycodes').select('pay_code_id, code, description').order('code'),
        ]);
      if (ignore) return;
      if (jobErr) console.error(jobErr);
      setJobs(jobData || []);
      setEmployees(empData || []);
      setPaycodes(pcData || []);
    })();
    return () => { ignore = true; };
  }, []);

  const filteredJobs = useMemo(() => {
    const s = jobSearch.trim().toLowerCase();
    if (!s) return jobs;
    return jobs.filter(j =>
      (j.job_number || '').toLowerCase().includes(s) ||
      (j.po_number || '').toLowerCase().includes(s) ||
      (j.work_order || '').toLowerCase().includes(s)
    );
  }, [jobs, jobSearch]);

  // ----- labor helpers -----
  const addLabor = () => setLabor(r => [...r, { ...emptyLabor }]);
  const removeLabor = (i) => setLabor(r => r.filter((_, idx) => idx !== i));
  const setLaborField = (i, field, value) =>
    setLabor(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  // ----- equipment helpers -----
  const addEquipment = () => setEquipment(r => [...r, { code: '', qty: '', hours: '', rate: '', notes: '' }]);
  const removeEquipment = (i) => setEquipment(r => r.filter((_, idx) => idx !== i));
  const setEqField = (i, field, value) =>
    setEquipment(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  // ----- services helpers -----
  const addService = () => setServices(r => [...r, { code: '', qty: '', rate: '', notes: '' }]);
  const removeService = (i) => setServices(r => r.filter((_, idx) => idx !== i));
  const setSvcField = (i, field, value) =>
    setServices(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  // ----- submit calls the RPC (this is the complete snippet wired up) -----
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    if (!jobId) return setMessage({ type: 'error', text: 'Please select a Job.' });
    if (!ticketDate) return setMessage({ type: 'error', text: 'Please choose a Ticket Date.' });

    // sanitize payloads (filter out blank rows)
    const laborPayload = labor
      .filter(r => r.employee_id && r.pay_code_id && Number(r.hours) > 0)
      .map(r => ({
        employee_id: r.employee_id,
        pay_code_id: r.pay_code_id,
        hours: Number(r.hours),
        day_date: r.day_date || ticketDate,
        // optional fields left null – backend fills defaults from employees
        craft_code: null,
        schedule: null,
        bill_craft_code: null,
        bill_schedule: null,
      }));

    const equipmentPayload = equipment.filter(r =>
      r.code || r.qty || r.hours || r.rate || r.notes
    );

    const servicesPayload = services.filter(r =>
      r.code || r.qty || r.rate || r.notes
    );

    setBusy(true);

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // COMPLETE RPC CALL SNIPPET:
    const { data, error } = await supabase.rpc('create_ticket_with_lines', {
      p_job_id: jobId,
      p_ticket_date: ticketDate,
      p_notes: notes || null,
      p_labor: laborPayload,         // [{ employee_id, pay_code_id, hours, day_date? }]
      p_equipment: equipmentPayload, // [{ code, qty, hours, rate, notes }]
      p_materials: materials,        // [] for now
      p_services: servicesPayload    // [{ code, qty, rate?, notes }]
    });
    // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    setBusy(false);

    if (error) {
      console.error('RPC error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create ticket.' });
      return;
    }

    // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    // COMPLETE "READ RETURN FIELDS" SNIPPET:
    const newId  = data?.[0]?.ticket_id;
    const newNo  = data?.[0]?.ticket_number;     // numeric ticket #
    const wkEnd  = data?.[0]?.weekending_date;   // computed in SQL

    setMessage({ type: 'success', text: `Ticket #${newNo} created (Week ending ${wkEnd}).` });
    // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    // optionally reset form
    setJobId('');
    setTicketDate('');
    setNotes('');
    setLabor([{ ...emptyLabor }]);
    setEquipment([]);
    setServices([]);
  }

  // ----- UI -----
  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>
      <form onSubmit={handleSubmit}>
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Create Ticket + Lines</h2>

          <div style={grid3}>
            <div>
              <label>Search Jobs</label>
              <input
                value={jobSearch}
                onChange={(e)=>setJobSearch(e.target.value)}
                placeholder="Job #, PO, or WO"
                style={input}
              />
            </div>

            <div>
              <label>Job</label>
              <select value={jobId} onChange={(e)=>setJobId(e.target.value)} style={input}>
                <option value="">— Select Job —</option>
                {filteredJobs.map(j => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.job_number} · PO {j.po_number || '—'} · WO {j.work_order || '—'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Ticket Date</label>
              <input type="date" value={ticketDate} onChange={(e)=>setTicketDate(e.target.value)} style={input}/>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Notes (optional)</label>
            <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="e.g., night shift" style={input}/>
          </div>
        </div>

        {/* Labor */}
        <div style={card}>
          <h3 style={{ margin: '6px 0 12px' }}>Labor Lines</h3>

          <div style={{ fontWeight: 700, display:'grid', gridTemplateColumns:'1.2fr 1fr .6fr .9fr auto', gap:12, marginBottom:6 }}>
            <div>Employee</div><div>Pay Code</div><div>Hours</div><div>Day</div><div></div>
          </div>

          {labor.map((row, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr .6fr .9fr auto', gap:12, alignItems:'center', marginBottom:8 }}>
              <select value={row.employee_id} onChange={(e)=>setLaborField(i,'employee_id',e.target.value)} style={input}>
                <option value="">Select employee</option>
                {employees.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.name}</option>)}
              </select>

              <select value={row.pay_code_id} onChange={(e)=>setLaborField(i,'pay_code_id',e.target.value)} style={input}>
                <option value="">Pay code</option>
                {paycodes.map(pc => <option key={pc.pay_code_id} value={pc.pay_code_id}>{pc.code} — {pc.description}</option>)}
              </select>

              <input type="number" min="0" step="0.25" value={row.hours} onChange={(e)=>setLaborField(i,'hours',e.target.value)} style={input} />
              <input type="date" value={row.day_date} onChange={(e)=>setLaborField(i,'day_date',e.target.value)} style={input} />

              <button type="button" onClick={()=>removeLabor(i)} style={btnLight}>Remove</button>
            </div>
          ))}

          <button type="button" onClick={addLabor} style={btn}>+ Add labor</button>
        </div>

        {/* Equipment */}
        <div style={card}>
          <h3 style={{ margin: '6px 0 12px' }}>Equipment</h3>

          <div style={{ fontWeight: 700, display:'grid', gridTemplateColumns:'1fr .6fr .6fr .6fr 1.2fr auto', gap:12, marginBottom:6 }}>
            <div>Code</div><div>Qty</div><div>Hours</div><div>Rate</div><div>Notes</div><div></div>
          </div>

          {equipment.map((row, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr .6fr .6fr .6fr 1.2fr auto', gap:12, alignItems:'center', marginBottom:8 }}>
              <input value={row.code}  onChange={(e)=>setEqField(i,'code', e.target.value)} style={input}/>
              <input value={row.qty}   onChange={(e)=>setEqField(i,'qty', e.target.value)} style={input}/>
              <input value={row.hours} onChange={(e)=>setEqField(i,'hours', e.target.value)} style={input}/>
              <input value={row.rate}  onChange={(e)=>setEqField(i,'rate', e.target.value)} style={input}/>
              <input value={row.notes} onChange={(e)=>setEqField(i,'notes', e.target.value)} style={input}/>
              <button type="button" onClick={()=>removeEquipment(i)} style={btnLight}>Remove</button>
            </div>
          ))}

          <button type="button" onClick={addEquipment} style={btn}>+ Add equipment</button>
        </div>

        {/* Services */}
        <div style={card}>
          <h3 style={{ margin: '6px 0 12px' }}>Services</h3>

          <div style={{ fontWeight: 700, display:'grid', gridTemplateColumns:'1fr .6fr .6fr 1.2fr auto', gap:12, marginBottom:6 }}>
            <div>Code</div><div>Qty</div><div>Rate</div><div>Notes</div><div></div>
          </div>

          {services.map((row, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr .6fr .6fr 1.2fr auto', gap:12, alignItems:'center', marginBottom:8 }}>
              <input value={row.code} onChange={(e)=>setSvcField(i,'code', e.target.value)} style={input}/>
              <input value={row.qty}  onChange={(e)=>setSvcField(i,'qty', e.target.value)}  style={input}/>
              <input value={row.rate} onChange={(e)=>setSvcField(i,'rate', e.target.value)} style={input}/>
              <input value={row.notes}onChange={(e)=>setSvcField(i,'notes',e.target.value)} style={input}/>
              <button type="button" onClick={()=>removeService(i)} style={btnLight}>Remove</button>
            </div>
          ))}

          <button type="button" onClick={addService} style={btn}>+ Add service</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy} style={submitBtn}>
            {busy ? 'Saving…' : 'Create Ticket + Lines'}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: message.type === 'error' ? '#fdeaea' : '#e8f7ed',
            border: `1px solid ${message.type === 'error' ? '#f0c2c2' : '#b3e6c3'}`
          }}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

/* styles */
const card = { background:'#fff', border:'1px solid #eee', borderRadius:12, padding:16, marginBottom:14, boxShadow:'0 2px 12px rgba(0,0,0,.04)' };
const grid3 = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 };
const input = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #ddd' };
const btn = { padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontWeight:600 };
const btnLight = { padding:'6px 10px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer' };
const submitBtn = { width:'100%', maxWidth:420, padding:'12px 14px', fontWeight:800, borderRadius:10, border:'none', background:'#0f172a', color:'#fff', cursor:'pointer' };

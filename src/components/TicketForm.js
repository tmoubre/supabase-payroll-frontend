// src/components/TicketForm.js
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function TicketForm() {
  // top-level ticket fields
  const [jobId, setJobId] = useState('');
  const [ticketDate, setTicketDate] = useState('');
  const [notes, setNotes] = useState('');

  // reference data
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paycodes, setPaycodes] = useState([]);

  // dynamic lines
  const emptyLabor = { employee_id: '', pay_code_id: '', hours: '8', day_date: '' };
  const [laborRows, setLaborRows] = useState([ { ...emptyLabor } ]);

  const [equipmentRows, setEquipmentRows] = useState([]); // { code, qty, hours, rate, notes }
  const [materialRows, setMaterialRows] = useState([]);   // { code, qty, unit, rate, notes }
  const [serviceRows, setServiceRows] = useState([]);     // { code, qty, hours, rate, notes }

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  // ---------- data loads ----------
  useEffect(() => {
    let ignore = false;
    (async () => {
      // RLS: requires policies for authenticated (already discussed)
      const [{ data: jobData }, { data: empData }, { data: pcData }] = await Promise.all([
        supabase.from('jobs').select('job_id, job_number, po_number, work_order').limit(5000),
        supabase.from('employees').select('employee_id, emp_name').limit(5000),
        supabase.from('paycodes').select('pay_code_id, code, description').limit(5000),
      ]);
      if (ignore) return;
      setJobs(jobData || []);
      setEmployees(empData || []);
      setPaycodes(pcData || []);
    })();
    return () => { ignore = true; };
  }, []);

  // simple search box for jobs
  const [jobSearch, setJobSearch] = useState('');
  const filteredJobs = useMemo(() => {
    const s = jobSearch.trim().toLowerCase();
    if (!s) return jobs;
    return jobs.filter(j =>
      (j.job_number || '').toLowerCase().includes(s) ||
      (j.po_number || '').toLowerCase().includes(s) ||
      (j.work_order || '').toLowerCase().includes(s)
    );
  }, [jobs, jobSearch]);

  // ---------- handlers ----------
  function addLabor() { setLaborRows(r => [...r, { ...emptyLabor }]); }
  function removeLabor(i) { setLaborRows(r => r.filter((_, idx) => idx !== i)); }
  function updateLabor(i, field, value) {
    setLaborRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function addEquipment() { setEquipmentRows(r => [...r, { code: '', qty: '', hours: '', rate: '', notes: '' }]); }
  function updateEquipment(i, field, value) {
    setEquipmentRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }
  function removeEquipment(i) { setEquipmentRows(r => r.filter((_, idx) => idx !== i)); }

  function addMaterial() { setMaterialRows(r => [...r, { code: '', qty: '', unit: '', rate: '', notes: '' }]); }
  function updateMaterial(i, field, value) {
    setMaterialRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }
  function removeMaterial(i) { setMaterialRows(r => r.filter((_, idx) => idx !== i)); }

  function addService() { setServiceRows(r => [...r, { code: '', qty: '', hours: '', rate: '', notes: '' }]); }
  function updateService(i, field, value) {
    setServiceRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }
  function removeService(i) { setServiceRows(r => r.filter((_, idx) => idx !== i)); }

  // ---------- submit ----------
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    // required fields
    if (!jobId) {
      setMessage({ type: 'error', text: 'Please select a Job before saving.' });
      return;
    }
    if (!ticketDate) {
      setMessage({ type: 'error', text: 'Please choose a Ticket Date.' });
      return;
    }

    const labor = laborRows
      .filter(r => r.employee_id && r.pay_code_id && Number(r.hours) > 0)
      .map(r => ({
        employee_id: r.employee_id,
        pay_code_id: r.pay_code_id,
        hours: Number(r.hours),
        day_date: r.day_date || ticketDate,
        craft_code: null,
        schedule: null,
        bill_craft_code: null,
        bill_schedule: null
      }));

    // equipment/materials/services can be left empty; send arrays anyway for future expansion
    const equipment = equipmentRows.filter(r =>
      r.code || r.qty || r.hours || r.rate || r.notes
    );
    const materials = materialRows.filter(r =>
      r.code || r.qty || r.unit || r.rate || r.notes
    );
    const services = serviceRows.filter(r =>
      r.code || r.qty || r.hours || r.rate || r.notes
    );

    setBusy(true);
    const { data, error } = await supabase.rpc('create_ticket_with_lines', {
      p_job_id: jobId,
      p_ticket_date: ticketDate,
      p_notes: notes || null,
      p_labor: labor,
      p_equipment: equipment,
      p_materials: materials,
      p_services: services
    });
    setBusy(false);

    if (error) {
      console.error('RPC error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create ticket.' });
      return;
    }

    const newId = data?.[0]?.ticket_id;
    const newNo = data?.[0]?.ticket_number; // <-- numeric ticket number from DB
    setMessage({ type: 'success', text: `Ticket #${newNo} created.` });

    // reset minimal fields but keep lines
    setJobId('');
    setTicketDate('');
    setNotes('');
    setLaborRows([ { ...emptyLabor } ]);
    setEquipmentRows([]);
    setMaterialRows([]);
    setServiceRows([]);

    console.log('Created ticket:', { ticket_id: newId, ticket_number: newNo });
  }

  // ---------- UI ----------
  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>
      <form onSubmit={handleSubmit}>
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Create Ticket + Lines</h2>

          <div style={grid3}>
            <div>
              <label>Search Jobs</label>
              <input
                placeholder="Job #, PO, or WO"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label>Job</label>
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={select}>
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
              <input type="date" value={ticketDate} onChange={(e) => setTicketDate(e.target.value)} style={input} />
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Notes (optional)</label>
            <input
              placeholder="e.g., night shift, special access"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={input}
            />
          </div>
        </div>

        {/* Labor */}
        <div style={card}>
          <SectionTitle>Labor Lines</SectionTitle>

          <div style={{ fontWeight: 700, display: 'grid', gridTemplateColumns: '1.2fr 1fr .6fr .9fr auto', gap: 12, marginBottom: 6 }}>
            <div>Employee</div><div>Pay Code</div><div>Hours</div><div>Day (optional)</div><div></div>
          </div>

          {laborRows.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .6fr .9fr auto', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <select value={row.employee_id} onChange={(e)=>updateLabor(i, 'employee_id', e.target.value)} style={select}>
                <option value="">Select employee</option>
                {employees.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.emp_name}</option>)}
              </select>

              <select value={row.pay_code_id} onChange={(e)=>updateLabor(i, 'pay_code_id', e.target.value)} style={select}>
                <option value="">Pay code</option>
                {paycodes.map(pc => <option key={pc.pay_code_id} value={pc.pay_code_id}>{pc.code} — {pc.description}</option>)}
              </select>

              <input type="number" min="0" step="0.25" value={row.hours} onChange={(e)=>updateLabor(i, 'hours', e.target.value)} style={input} />

              <input type="date" value={row.day_date} onChange={(e)=>updateLabor(i, 'day_date', e.target.value)} style={input} />

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => removeLabor(i)} style={btnLight}>Remove</button>
              </div>
            </div>
          ))}

          <div>
            <button type="button" onClick={addLabor} style={btn}>
              + Add labor
            </button>
          </div>
        </div>

        {/* Equipment */}
        <div style={card}>
          <SectionTitle>Equipment</SectionTitle>
          <HeaderRow cols="1fr .6fr .6fr .6fr 1.2fr" labels={['Code','Qty','Hours','Rate','Notes']} />
          {equipmentRows.map((row, i) => (
            <Row key={i} cols="1fr .6fr .6fr .6fr 1.2fr auto">
              <input value={row.code} onChange={(e)=>updateEquipment(i,'code',e.target.value)} style={input}/>
              <input value={row.qty} onChange={(e)=>updateEquipment(i,'qty',e.target.value)} style={input}/>
              <input value={row.hours} onChange={(e)=>updateEquipment(i,'hours',e.target.value)} style={input}/>
              <input value={row.rate} onChange={(e)=>updateEquipment(i,'rate',e.target.value)} style={input}/>
              <input value={row.notes} onChange={(e)=>updateEquipment(i,'notes',e.target.value)} style={input}/>
              <button type="button" onClick={()=>removeEquipment(i)} style={btnLight}>Remove</button>
            </Row>
          ))}
          <button type="button" onClick={addEquipment} style={btn}>+ Add equipment</button>
        </div>

        {/* Materials */}
        <div style={card}>
          <SectionTitle>Materials</SectionTitle>
          <HeaderRow cols="1fr .6fr .6fr .6fr 1.2fr" labels={['Code','Qty','Unit','Rate','Notes']} />
          {materialRows.map((row, i) => (
            <Row key={i} cols="1fr .6fr .6fr .6fr 1.2fr auto">
              <input value={row.code} onChange={(e)=>updateMaterial(i,'code',e.target.value)} style={input}/>
              <input value={row.qty} onChange={(e)=>updateMaterial(i,'qty',e.target.value)} style={input}/>
              <input value={row.unit} onChange={(e)=>updateMaterial(i,'unit',e.target.value)} style={input}/>
              <input value={row.rate} onChange={(e)=>updateMaterial(i,'rate',e.target.value)} style={input}/>
              <input value={row.notes} onChange={(e)=>updateMaterial(i,'notes',e.target.value)} style={input}/>
              <button type="button" onClick={()=>removeMaterial(i)} style={btnLight}>Remove</button>
            </Row>
          ))}
          <button type="button" onClick={addMaterial} style={btn}>+ Add material</button>
        </div>

        {/* Services */}
        <div style={card}>
          <SectionTitle>Services</SectionTitle>
          <HeaderRow cols="1fr .6fr .6fr .6fr 1.2fr" labels={['Code','Qty','Hours','Rate','Notes']} />
          {serviceRows.map((row, i) => (
            <Row key={i} cols="1fr .6fr .6fr .6fr 1.2fr auto">
              <input value={row.code} onChange={(e)=>updateService(i,'code',e.target.value)} style={input}/>
              <input value={row.qty} onChange={(e)=>updateService(i,'qty',e.target.value)} style={input}/>
              <input value={row.hours} onChange={(e)=>updateService(i,'hours',e.target.value)} style={input}/>
              <input value={row.rate} onChange={(e)=>updateService(i,'rate',e.target.value)} style={input}/>
              <input value={row.notes} onChange={(e)=>updateService(i,'notes',e.target.value)} style={input}/>
              <button type="button" onClick={()=>removeService(i)} style={btnLight}>Remove</button>
            </Row>
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

/* ---------- tiny presentational helpers ---------- */
function SectionTitle({ children }) {
  return <h3 style={{ margin: '6px 0 12px' }}>{children}</h3>;
}
function HeaderRow({ cols, labels }) {
  return (
    <div style={{ fontWeight: 700, display: 'grid', gridTemplateColumns: cols, gap: 12, marginBottom: 6 }}>
      {labels.map((x, i) => <div key={i}>{x}</div>)}
    </div>
  );
}
function Row({ cols, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', marginBottom: 8 }}>
      {children}
    </div>
  );
}

/* ---------- styles ---------- */
const card = { background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,.04)' };
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };
const input = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' };
const select = input;
const btn = { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontWeight: 600 };
const btnLight = { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const submitBtn = { width: '100%', maxWidth: 420, padding: '12px 14px', fontWeight: 800, borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', cursor: 'pointer' };

// src/components/TicketForm.js
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

function weekendingFrom(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0..6 (0 = Sun)
  const add = (7 - dow) % 7; // Sunday end
  const out = new Date(d);
  out.setDate(out.getDate() + add);
  return out.toISOString().slice(0, 10);
}

export default function TicketForm() {
  // ---------- header fields ----------
  const [jobId, setJobId] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [ticketDate, setTicketDate] = useState('');
  const [weekending, setWeekending] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [location, setLocation] = useState('');
  const [customerName, setCustomerName] = useState(''); // read-only
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // ---------- reference data ----------
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paycodes, setPaycodes] = useState([]);

  // suggestions
  const [poOptions, setPoOptions] = useState([]);
  const [locOptions, setLocOptions] = useState([]);
  const [emailOptions, setEmailOptions] = useState([]);

  // ---------- lines ----------
  const emptyLabor = { employee_code: '', employee_id: '', pay_code_id: '', hours: '8' };
  const [labor, setLabor] = useState([{ ...emptyLabor }]);
  const [equipment, setEquipment] = useState([]); // { code, qty, hours, rate, notes }
  const [services, setServices] = useState([]);   // { code, qty, rate, notes }

  // ---------- ui ----------
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [savedTicketNo, setSavedTicketNo] = useState(null);
  const [draftTicketId, setDraftTicketId] = useState(null);

  // ---------- load lookups ----------
  useEffect(() => {
    let ignore = false;
    (async () => {
      const jobsQ = supabase
        .from('jobs')
        .select('job_id, job_number, po_number, location, customer_id, customers:customer_id ( customer_name )')
        .order('job_number');

      // include employee_code for code-to-name autofill
      const empQ = supabase
        .from('employees')
        .select('employee_id, name, employee_code')
        .order('employee_code', { nulls: 'last' })
        .order('name');

      const pcQ = supabase
        .from('paycodes')
        .select('pay_code_id, code, description')
        .order('code');

      const poQ = supabase.from('jobs').select('po_number').not('po_number', 'is', null);
      const locQ = supabase.from('jobs').select('location').not('location', 'is', null);
      const emQ = supabase.from('customers').select('contact_email').not('contact_email', 'is', null);

      const [
        { data: jobData },
        { data: empData },
        { data: pcData },
        { data: poData },
        { data: locData },
        { data: emailData }
      ] = await Promise.all([jobsQ, empQ, pcQ, poQ, locQ, emQ]);

      if (ignore) return;
      setJobs(jobData || []);
      setEmployees(empData || []);
      setPaycodes(pcData || []);
      setPoOptions(Array.from(new Set((poData || []).map(r => r.po_number).filter(Boolean))));
      setLocOptions(Array.from(new Set((locData || []).map(r => r.location).filter(Boolean))));
      setEmailOptions(Array.from(new Set((emailData || []).map(r => r.contact_email).filter(Boolean))));
    })();
    return () => { ignore = true; };
  }, []);

  // filter jobs by search (job #, PO, location)
  const filteredJobs = useMemo(() => {
    const s = jobSearch.trim().toLowerCase();
    if (!s) return jobs;
    return jobs.filter(j =>
      (j.job_number || '').toLowerCase().includes(s) ||
      (j.po_number || '').toLowerCase().includes(s) ||
      (j.location || '').toLowerCase().includes(s)
    );
  }, [jobs, jobSearch]);

  // when job changes, default PO, location, customer
  useEffect(() => {
    if (!jobId) {
      setCustomerName('');
      return;
    }
    const j = jobs.find(x => x.job_id === jobId);
    if (!j) return;
    if (j.po_number && !poNumber) setPoNumber(j.po_number);
    if (j.location && !location) setLocation(j.location);
    setCustomerName(j.customers?.customer_name || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, jobs]);

  // recompute local preview of weekending whenever user picks date
  useEffect(() => {
    setWeekending(weekendingFrom(ticketDate));
  }, [ticketDate]);

  // ---------- auto-create DRAFT HEADER when job + date are set ----------
  useEffect(() => {
    let ignore = false;
    async function createHeaderIfNeeded() {
      if (!jobId || !ticketDate || draftTicketId) return;
      setBusy(true);
      const { data, error } = await supabase.rpc('create_ticket_header', {
        p_job_id: jobId,
        p_ticket_date: ticketDate,
        p_notes: notes || null,
        p_extras: {
          po_number: poNumber || null,
          location: location || null,
          email: email || null
        }
      });
      setBusy(false);
      if (ignore) return;
      if (error) {
        console.error('create_ticket_header error:', error);
        setMessage({ type: 'error', text: 'Could not create draft ticket header.' });
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.ticket_id) {
        setDraftTicketId(row.ticket_id);
        setSavedTicketNo(row.ticket_number ?? null);
        setWeekending(row.weekending_date ?? weekendingFrom(ticketDate));
        setMessage({ type: 'success', text: `Draft created — Ticket #${row.ticket_number}` });
      }
    }
    createHeaderIfNeeded();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, ticketDate]);

  // ---------- helpers ----------
  const addLabor = () => setLabor(r => [...r, { ...emptyLabor }]);
  const removeLabor = (i) => setLabor(r => r.filter((_, idx) => idx !== i));
  const setLaborField = (i, field, value) =>
    setLabor(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addEquipment = () => setEquipment(r => [...r, { code: '', qty: '', hours: '', rate: '', notes: '' }]);
  const removeEquipment = (i) => setEquipment(r => r.filter((_, idx) => idx !== i));
  const setEqField = (i, field, value) =>
    setEquipment(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addService = () => setServices(r => [...r, { code: '', qty: '', rate: '', notes: '' }]);
  const removeService = (i) => setServices(r => r.filter((_, idx) => idx !== i));
  const setSvcField = (i, field, value) =>
    setServices(rows => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  // employee code -> employee_id autofill
  function applyEmployeeCode(i, code) {
    const trimmed = (code || '').trim().toLowerCase();
    setLabor(rows => {
      const next = [...rows];
      const hit = employees.find(e => (e.employee_code || '').toLowerCase() === trimmed);
      if (hit) {
        next[i] = { ...next[i], employee_code: code, employee_id: hit.employee_id };
      } else {
        next[i] = { ...next[i], employee_code: code };
      }
      return next;
    });
  }

  // detect any line inputs (for cancel confirmation)
  function hasAnyLineInput() {
    const laborFilled = labor.some(r =>
      r.employee_id || r.employee_code || r.pay_code_id || (Number(r.hours) || 0) > 0
    );
    const eqFilled = equipment.some(r => r.code || r.qty || r.hours || r.rate || r.notes);
    const svcFilled = services.some(r => r.code || r.qty || r.rate || r.notes);
    return laborFilled || eqFilled || svcFilled;
  }

  async function cancelDraft() {
    if (!draftTicketId) return;
    if (hasAnyLineInput()) {
      const ok = window.confirm('You have line inputs on this draft. Delete the draft anyway?');
      if (!ok) return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('time_tickets')
      .delete()
      .eq('ticket_id', draftTicketId); // fix: correct PK column
    setBusy(false);
    if (error) {
      console.error('cancelDraft error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to cancel draft.' });
      return;
    }
    // clear everything
    setDraftTicketId(null);
    setSavedTicketNo(null);
    setJobId('');
    setTicketDate('');
    setWeekending('');
    setPoNumber('');
    setLocation('');
    setCustomerName('');
    setEmail('');
    setNotes('');
    setLabor([{ ...emptyLabor }]);
    setEquipment([]);
    setServices([]);
    setMessage({ type: 'success', text: 'Draft ticket removed.' });
  }

  // ---------- submit via RPC ----------
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    if (!jobId) return setMessage({ type: 'error', text: 'Please select a Job.' });
    if (!ticketDate) return setMessage({ type: 'error', text: 'Please choose a Ticket Date.' });

    const laborPayload = labor
      .filter(r => r.employee_id && r.pay_code_id && Number(r.hours) > 0)
      .map(r => ({
        employee_id: r.employee_id,
        pay_code_id: r.pay_code_id,
        hours: Number(r.hours),
        // always match the ticket date
        day_date: ticketDate,
        craft_code: null,
        schedule: null,
        bill_craft_code: null,
        bill_schedule: null
      }));

    const equipmentPayload = equipment.filter(r =>
      r.code || r.qty || r.hours || r.rate || r.notes
    );

    const servicesPayload = services.filter(r =>
      r.code || r.qty || r.rate || r.notes
    );

    setBusy(true);

    let resp = { data: null, error: null };
    if (draftTicketId) {
      const { error } = await supabase.rpc('append_lines_to_ticket', {
        p_ticket_id: draftTicketId,
        p_labor: laborPayload,
        p_equipment: equipmentPayload,
        p_services: servicesPayload
      });
      resp.error = error;
      resp.data = [{ ticket_id: draftTicketId, ticket_number: savedTicketNo, weekending_date: weekending }];
    } else {
      resp = await supabase.rpc('create_ticket_with_lines', {
        p_job_id: jobId,
        p_ticket_date: ticketDate,
        p_notes: notes || null,
        p_labor: laborPayload,
        p_equipment: equipmentPayload,
        p_materials: [],
        p_services: servicesPayload
      });
    }

    setBusy(false);

    if (resp.error) {
      console.error('RPC error:', resp.error);
      setMessage({ type: 'error', text: resp.error.message || 'Failed to save ticket.' });
      return;
    }

    const row = Array.isArray(resp.data) ? resp.data[0] : resp.data;
    const newId  = row?.ticket_id || draftTicketId || null;
    const newNo  = row?.ticket_number ?? savedTicketNo ?? '(New)';
    const wkEnd  = row?.weekending_date ?? weekendingFrom(ticketDate);

    if (newId && !draftTicketId) setDraftTicketId(newId);
    setSavedTicketNo(newNo);
    setWeekending(wkEnd);

    setMessage({ type: 'success', text: `Ticket #${newNo} saved (Week ending ${wkEnd}).` });

    // reset lines but keep header visible
    setLabor([{ ...emptyLabor }]);
    setEquipment([]);
    setServices([]);
    console.log('Created/updated ticket:', { ticket_id: newId, ticket_number: newNo, weekending: wkEnd });
  }

  // ---------- UI ----------
  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>
      {/* HEADER CARD */}
      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap: 12 }}>
          <h2 style={{ marginTop: 0 }}>TimeTicket Entry</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight:700 }}>
              Ticket #&nbsp;
              <span style={{ color: savedTicketNo ? '#111' : '#d00' }}>
                {savedTicketNo ?? '(New)'}
              </span>
            </div>
            {draftTicketId && (
              <button
                type="button"
                onClick={cancelDraft}
                disabled={busy}
                style={btnLight}
                title="Delete the draft header and clear the form"
              >
                Cancel draft
              </button>
            )}
          </div>
        </div>

        {/* grid like Access layout */}
        <div style={grid2x}>
          <label>Job #</label>
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <input
                placeholder="Search by Job #, PO, Location"
                value={jobSearch}
                onChange={(e)=>setJobSearch(e.target.value)}
                style={input}
              />
              <select value={jobId} onChange={(e)=>setJobId(e.target.value)} style={input}>
                <option value="">— Select Job —</option>
                {filteredJobs.map(j => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.job_number} · PO {j.po_number || '—'} · {j.location || '—'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label>PO #</label>
          <div>
            <input list="po-list" value={poNumber} onChange={(e)=>setPoNumber(e.target.value)} style={input} />
            <datalist id="po-list">
              {poOptions.map((po,i)=>(<option key={i} value={po} />))}
            </datalist>
          </div>

          <label>Location</label>
          <div>
            <input list="loc-list" value={location} onChange={(e)=>setLocation(e.target.value)} style={input} />
            <datalist id="loc-list">
              {locOptions.map((loc,i)=>(<option key={i} value={loc} />))}
            </datalist>
          </div>

          <label>Customer</label>
          <div>
            <input value={customerName} readOnly style={{ ...input, background:'#f7f7f7' }} />
          </div>

          <label>TKT Date</label>
          <div>
            <input type="date" value={ticketDate} onChange={(e)=>setTicketDate(e.target.value)} style={input}/>
          </div>

          <label>Wk Ending Date</label>
          <div>
            <input value={weekending} readOnly style={{ ...input, background:'#f7f7f7' }} />
          </div>

          <label>Email</label>
          <div>
            <input list="email-list" value={email} onChange={(e)=>setEmail(e.target.value)} style={input} />
            <datalist id="email-list">
              {emailOptions.map((em,i)=>(<option key={i} value={em} />))}
            </datalist>
          </div>

          <label>Notes</label>
          <div>
            <input placeholder="e.g., night shift" value={notes} onChange={(e)=>setNotes(e.target.value)} style={input}/>
          </div>
        </div>
      </div>

      {/* LABOR */}
      <div style={card}>
        <h3 style={{ margin: '6px 0 12px' }}>Labor Lines</h3>

        {/* header */}
        <div style={{ fontWeight: 700, display:'grid', gridTemplateColumns:'140px 1fr .9fr .6fr auto', gap:12, marginBottom:6 }}>
          <div>Emp Code</div>
          <div>Employee</div>
          <div>Pay Code</div>
          <div>Hours</div>
          <div></div>
        </div>

        {/* rows */}
        {labor.map((row, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'140px 1fr .9fr .6fr auto', gap:12, alignItems:'center', marginBottom:8 }}>
            {/* Employee Code (autofills Employee) */}
            <input
              placeholder="e.g., E123"
              value={row.employee_code || ''}
              onChange={(e)=>setLaborField(i,'employee_code',e.target.value)}
              onBlur={(e)=>applyEmployeeCode(i, e.target.value)}
              style={input}
            />

            {/* Employee */}
            <select value={row.employee_id} onChange={(e)=>setLaborField(i,'employee_id',e.target.value)} style={input}>
              <option value="">Select employee</option>
              {employees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_code ? `${emp.employee_code} — ` : ''}{emp.name}
                </option>
              ))}
            </select>

            {/* Pay Code */}
            <select value={row.pay_code_id} onChange={(e)=>setLaborField(i,'pay_code_id',e.target.value)} style={input}>
              <option value="">Pay code</option>
              {paycodes.map(pc => <option key={pc.pay_code_id} value={pc.pay_code_id}>{pc.code} — {pc.description}</option>)}
            </select>

            {/* Hours */}
            <input type="number" min="0" step="0.25" value={row.hours} onChange={(e)=>setLaborField(i,'hours',e.target.value)} style={input} />

            <button type="button" onClick={()=>removeLabor(i)} style={btnLight}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addLabor} style={btn}>+ Add labor</button>
      </div>

      {/* EQUIPMENT */}
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

      {/* SERVICES */}
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
            <input value={row.notes} onChange={(e)=>setSvcField(i,'notes', e.target.value)} style={input}/>
            <button type="button" onClick={()=>removeService(i)} style={btnLight}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addService} style={btn}>+ Add service</button>
      </div>

      {/* SAVE */}
      <div style={{ marginTop: 12 }}>
        <button onClick={handleSubmit} disabled={busy} style={submitBtn}>
          {busy ? 'Saving…' : (draftTicketId ? 'Save Lines to Ticket' : 'Create Ticket + Lines')}
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
    </div>
  );
}

/* styles */
const card = { background:'#fff', border:'1px solid #eee', borderRadius:12, padding:16, marginBottom:14, boxShadow:'0 2px 12px rgba(0,0,0,.04)' };
const grid2x = { display:'grid', gridTemplateColumns:'160px 1fr', gap:'10px 16px', alignItems:'center' };
const input = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid #ddd' };
const btn = { padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer', fontWeight:600 };
const btnLight = { padding:'6px 10px', borderRadius:8, border:'1px solid #ddd', background:'#fff', cursor:'pointer' };
const submitBtn = { width:'100%', maxWidth:420, padding:'12px 14px', fontWeight:800, borderRadius:10, border:'none', background:'#0f172a', color:'#fff', cursor:'pointer' };


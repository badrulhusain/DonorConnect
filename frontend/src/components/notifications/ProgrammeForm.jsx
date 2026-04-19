import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services/api';

const DEFAULT_FORM = { programmeName: '', date: '', time: '', venue: '' };

const parseCSV = (text) => {
  const lines = text.trim().split('\n').filter(Boolean);
  const results = { valid: [], invalid: [] };
  lines.forEach((line, idx) => {
    if (idx === 0 && line.toLowerCase().startsWith('name')) return;
    const [name, phone, language = 'en'] = line.split(',').map((s) => s.trim());
    if (!name || !phone) {
      results.invalid.push({ line: idx + 1, raw: line, reason: 'Missing name or phone' });
      return;
    }
    const e164 = /^\+[1-9]\d{6,14}$/.test(phone);
    if (!e164) {
      results.invalid.push({ line: idx + 1, raw: line, reason: `Invalid phone: ${phone}` });
      return;
    }
    results.valid.push({ name, phone, language: ['en', 'ml'].includes(language) ? language : 'en' });
  });
  return results;
};

export default function ProgrammeForm() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [recipients, setRecipients] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setRecipients(parsed.valid);
      setCsvErrors(parsed.invalid);
      setManualInput('');
    };
    reader.readAsText(file);
  };

  const handleManual = () => {
    const parsed = parseCSV(manualInput);
    setRecipients(parsed.valid);
    setCsvErrors(parsed.invalid);
    if (fileRef.current) fileRef.current.value = '';
  };

  const allFilled = form.programmeName && form.date && form.time && form.venue;

  const handleSend = async () => {
    if (!allFilled) return toast.error('Fill all programme details');
    if (recipients.length === 0) return toast.error('Add at least one recipient');
    setSending(true);
    setResult(null);
    try {
      const res = await notificationAPI.sendProgramme({ recipients, ...form });
      setResult(res.data.summary);
      toast.success(`Sent ${res.data.summary.sent} / ${res.data.summary.total}`);
    } catch (err) {
      toast.error(err.displayMessage || 'Send failed');
    } finally {
      setSending(false);
      setPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Programme Name</label>
          <input
            name="programmeName"
            value={form.programmeName}
            onChange={handleField}
            placeholder="Graduation Ceremony"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            name="date"
            value={form.date}
            onChange={handleField}
            placeholder="30th April 2025"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            name="time"
            value={form.time}
            onChange={handleField}
            placeholder="3:00 PM"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
          <input
            name="venue"
            value={form.venue}
            onChange={handleField}
            placeholder="Main Hall"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload CSV{' '}
          <span className="text-gray-400 font-normal">(name, phone, language)</span>
        </label>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleCSV} className="text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Or paste recipients{' '}
          <span className="text-gray-400 font-normal">(one per line: name,+91xxx,en)</span>
        </label>
        <textarea
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          rows={4}
          placeholder="John,+918593826375,en&#10;Fathima,+918593826377,ml"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
        />
        <button
          onClick={handleManual}
          className="mt-1 text-sm text-green-700 underline hover:text-green-900"
        >
          Parse
        </button>
      </div>

      {csvErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-1">
          <p className="font-medium">Skipped {csvErrors.length} invalid rows:</p>
          {csvErrors.map((e, i) => (
            <p key={i}>Line {e.line}: {e.reason}</p>
          ))}
        </div>
      )}

      {recipients.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          {recipients.length} valid recipient{recipients.length !== 1 ? 's' : ''} loaded.
          <button onClick={() => setPreview((v) => !v)} className="ml-2 underline">
            {preview ? 'Hide' : 'Preview'}
          </button>
        </div>
      )}

      {preview && recipients.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
          <div className="bg-gray-50 px-4 py-2 font-medium text-gray-600 border-b border-gray-200">
            Message Preview (English)
          </div>
          <div className="p-4 whitespace-pre-wrap text-gray-700 leading-relaxed">
            {`Dear ${recipients[0]?.name}, we are pleased to invite you to our *${form.programmeName || '[Programme Name]'}* programme.\n📅 Date: ${form.date || '[Date]'}\n⏰ Time: ${form.time || '[Time]'}\n📍 Venue: ${form.venue || '[Venue]'}\nYour presence will be an honour.\n— [Institution Name]`}
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Showing preview for first recipient ({recipients.length} total)
          </div>
        </div>
      )}

      {result && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-semibold text-blue-800 mb-2">Send Complete</p>
          <div className="flex gap-6">
            <span className="text-green-700">Sent: {result.sent}</span>
            <span className="text-red-600">Failed: {result.failed}</span>
            <span className="text-gray-600">Total: {result.total}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || recipients.length === 0 || !allFilled}
        className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {sending ? `Sending... (${recipients.length} recipients)` : `Send Programme Invitation`}
      </button>
    </div>
  );
}

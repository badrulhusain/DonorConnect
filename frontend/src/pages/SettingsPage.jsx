import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const Field = ({ label, value, ok }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500 font-mono">{label}</span>
    <span className={`text-sm font-medium ${ok ? 'text-green-600' : 'text-red-500'}`}>{value}</span>
  </div>
);

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const [testForm, setTestForm] = useState({
    phone: '',
    templateName: 'hello_world',
    templateLanguage: 'en_US',
    parameters: '',
  });
  const [testResult, setTestResult] = useState(null);
  const [sending, setSending] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    setStatus(null);
    try {
      const res = await api.get('/debug/whatsapp');
      setStatus(res.data);
      if (res.data.success) {
        toast.success('WhatsApp API credentials are valid!');
      } else {
        toast.error('Credential check failed — see details below');
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Request failed');
    } finally {
      setChecking(false);
    }
  };

  const sendTest = async (e) => {
    e.preventDefault();
    setSending(true);
    setTestResult(null);
    try {
      const params = testForm.parameters
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await api.post('/debug/send-test', {
        phone: testForm.phone,
        templateName: testForm.templateName,
        templateLanguage: testForm.templateLanguage,
        parameters: params,
      });
      setTestResult(res.data);
      if (res.data.success) {
        toast.success('Test message sent! Check your WhatsApp.');
      } else {
        toast.error('Message delivery failed — see details below');
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Request failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">WhatsApp API diagnostics &amp; connection test</p>
      </div>

      {/* ── Credential checker ─────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">WhatsApp API Status</h2>
          <button onClick={checkConnection} disabled={checking} className="btn-secondary py-1.5 px-3 text-xs">
            <ArrowPathIcon className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking…' : 'Check Connection'}
          </button>
        </div>

        {!status && !checking && (
          <p className="text-sm text-gray-400 text-center py-4">
            Click "Check Connection" to validate your WhatsApp credentials.
          </p>
        )}

        {status && (
          <>
            <div className={`flex items-start gap-3 p-3 rounded-lg ${status.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {status.success
                ? <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                : <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
              <div className="space-y-1">
                <p className={`text-sm font-medium ${status.success ? 'text-green-700' : 'text-red-700'}`}>
                  {status.message}
                </p>
                {status.axiosCode && (
                  <p className="text-xs font-mono text-red-500">Error code: {status.axiosCode}</p>
                )}
                {status.rawErrMessage && (
                  <p className="text-xs font-mono text-red-500 break-all">{status.rawErrMessage}</p>
                )}
                {status.hint && (
                  <p className="text-xs mt-1 text-red-600 font-medium">{status.hint}</p>
                )}
              </div>
            </div>

            {status.phoneNumber && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone Number Info</p>
                <Field label="Display Number" value={status.phoneNumber.display} ok />
                <Field label="Verified Name" value={status.phoneNumber.verifiedName} ok />
                <Field label="Quality Rating" value={status.phoneNumber.qualityRating} ok={status.phoneNumber.qualityRating !== 'RED'} />
                <Field label="Phone Number ID" value={status.phoneNumber.id} ok />
              </div>
            )}

            {status.config && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Environment Variables</p>
                {Object.entries(status.config).map(([k, v]) => (
                  <Field key={k} label={k} value={v} ok={v.startsWith('✓')} />
                ))}
              </div>
            )}

            {status.raw && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Raw Meta API error</summary>
                <pre className="mt-2 text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(status.raw, null, 2)}
                </pre>
              </details>
            )}
          </>
        )}
      </div>

      {/* ── Send test message ───────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Send Test Message</h2>

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <InformationCircleIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            The <strong>hello_world</strong> template has <strong>no parameters</strong> — leave Parameters empty.
            The recipient phone must be added as a test number in Meta Business Manager → WhatsApp → API Setup → Test numbers.
          </p>
        </div>

        <form onSubmit={sendTest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Phone (E.164)</label>
            <input
              className="input-field"
              placeholder="+60123456789"
              value={testForm.phone}
              onChange={(e) => setTestForm({ ...testForm, phone: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                className="input-field"
                value={testForm.templateName}
                onChange={(e) => setTestForm({ ...testForm, templateName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language Code</label>
              <select
                className="input-field"
                value={testForm.templateLanguage}
                onChange={(e) => setTestForm({ ...testForm, templateLanguage: e.target.value })}
              >
                <option value="en_US">en_US (English)</option>
                <option value="ml_IN">ml_IN (Malayalam)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parameters (comma-separated, leave empty for hello_world)
            </label>
            <input
              className="input-field"
              placeholder="e.g.  Ahmed, 500  — one value per {{N}} placeholder"
              value={testForm.parameters}
              onChange={(e) => setTestForm({ ...testForm, parameters: e.target.value })}
            />
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full justify-center">
            <PaperAirplaneIcon className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send Test Message'}
          </button>
        </form>

        {testResult && (
          <div className={`rounded-lg border p-4 space-y-3 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-2">
              {testResult.success
                ? <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                : <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />}
              <div>
                <p className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
                {testResult.messageId && (
                  <p className="text-xs text-green-600 mt-0.5">Message ID: {testResult.messageId}</p>
                )}
                {testResult.hint && (
                  <p className="text-xs text-red-600 mt-1">{testResult.hint}</p>
                )}
              </div>
            </div>

            <details>
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Payload sent to Meta API</summary>
              <pre className="mt-2 text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto">
                {JSON.stringify(testResult.sentPayload, null, 2)}
              </pre>
            </details>

            {testResult.raw && (
              <details>
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Raw Meta API error</summary>
                <pre className="mt-2 text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(testResult.raw, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ── Template cheat-sheet ────────────────────────────────── */}
      <div className="card p-6 space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Your Active Template</h2>
        <div className="bg-[#ECE5DD] rounded-xl p-4 max-w-xs">
          <div className="bg-white rounded-lg p-3 shadow-sm text-sm text-gray-800 leading-relaxed">
            Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp
            message notification from the Cloud API, hosted by Meta. Thank you for taking the time to
            test with us.
          </div>
          <p className="text-xs text-gray-500 text-right mt-1">4:27 PM ✓✓</p>
        </div>
        <div className="text-sm space-y-1">
          <p><span className="font-medium text-gray-700">Template name:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-green-700">hello_world</code></p>
          <p><span className="font-medium text-gray-700">Language:</span> <code className="bg-gray-100 px-1.5 py-0.5 rounded text-green-700">en_US</code></p>
          <p><span className="font-medium text-gray-700">Parameters:</span> <span className="text-gray-500">none (leave parameters array empty)</span></p>
          <p><span className="font-medium text-gray-700">Status:</span> <span className="badge-completed">Active</span></p>
        </div>
        <p className="text-xs text-gray-400">
          To create custom templates with parameters, go to Meta Business Manager → WhatsApp Manager → Message Templates → Create template.
          Templates must be approved before use (usually 24–48 h).
        </p>
      </div>
    </div>
  );
}

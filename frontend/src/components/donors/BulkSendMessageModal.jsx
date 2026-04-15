import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { messageAPI } from '../../services/api';

export default function BulkSendMessageModal({ donors, onClose }) {
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState('compose'); // 'compose' | 'sending' | 'done'
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState([]); // [{ donorId, status }]
  const esRef = useRef(null);

  // Clean up EventSource on unmount
  useEffect(() => () => esRef.current?.close(), []);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Message body cannot be empty');
      return;
    }

    try {
      const { data } = await messageAPI.sendBulk({
        donorIds: donors.map((d) => d._id),
        message: message.trim(),
      });

      const { jobId, total } = data.data;
      setProgress({ completed: 0, total });
      setResults([]);
      setPhase('sending');

      const es = new EventSource(messageAPI.progressUrl(jobId));
      esRef.current = es;

      es.addEventListener('progress', (e) => {
        const event = JSON.parse(e.data);
        setResults((prev) => [...prev, { donorId: event.donorId, status: event.status }]);
        setProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      });

      es.addEventListener('done', () => {
        es.close();
        setPhase('done');
      });

      es.onerror = () => {
        es.close();
        setPhase('done');
      };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start bulk send');
    }
  };

  const donorById = Object.fromEntries(donors.map((d) => [d._id, d]));
  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <Dialog open onClose={phase === 'sending' ? undefined : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Send Message ({donors.length} {donors.length === 1 ? 'donor' : 'donors'})
            </Dialog.Title>
            {phase !== 'sending' && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* ── Compose ── */}
          {phase === 'compose' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Sends a WhatsApp message via the{' '}
                <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                  general_announcement
                </span>{' '}
                template to every selected donor.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message body
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your announcement here…"
                  className="input-field resize-none w-full"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length} chars</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="btn-primary flex-1 justify-center"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  Send to {donors.length}
                </button>
              </div>
            </div>
          )}

          {/* ── Sending / Done ── */}
          {(phase === 'sending' || phase === 'done') && (
            <div className="space-y-4 flex flex-col flex-1 min-h-0">

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>
                    {phase === 'done' ? 'Complete' : 'Sending\u2026'}{' '}
                    <span className="font-medium">
                      {progress.completed}/{progress.total}
                    </span>
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      background: phase === 'done' ? '#16a34a' : '#2563eb',
                    }}
                  />
                </div>
              </div>

              {/* Per-donor status list */}
              <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">

                {/* Completed results */}
                {results.map(({ donorId, status }) => {
                  const donor = donorById[donorId];
                  return (
                    <div
                      key={donorId}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 text-sm"
                    >
                      {status === 'sent' ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircleIcon className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <span className="flex-1 truncate text-gray-800">
                        {donor?.name ?? donorId}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          status === 'sent' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {status === 'sent' ? 'Sent \u2713' : 'Failed \u2717'}
                      </span>
                    </div>
                  );
                })}

                {/* Pending placeholder rows while sending */}
                {phase === 'sending' &&
                  donors
                    .filter((d) => !results.some((r) => r.donorId === d._id))
                    .map((d) => (
                      <div
                        key={d._id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 text-sm opacity-40"
                      >
                        <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0 animate-pulse" />
                        <span className="flex-1 truncate text-gray-800">{d.name}</span>
                        <span className="text-xs text-gray-400">Pending</span>
                      </div>
                    ))}
              </div>

              {phase === 'done' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary w-full justify-center mt-2"
                >
                  Close
                </button>
              )}
            </div>
          )}

        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

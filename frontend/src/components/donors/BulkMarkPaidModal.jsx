import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';

export default function BulkMarkPaidModal({ donors, onConfirm, onClose }) {
  const [amounts, setAmounts] = useState(() =>
    donors.reduce((acc, d) => ({ ...acc, [d._id]: '' }), {})
  );
  const [sharedAmount, setSharedAmount] = useState('');
  const [useShared, setUseShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payments = donors.map((d) => {
      const amount = parseFloat(useShared ? sharedAmount : amounts[d._id]);
      return { donorId: d._id, amount, language: d.language || 'en' };
    });

    if (payments.some((p) => !p.amount || p.amount <= 0)) {
      setError('All donors must have a valid amount');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(payments);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Bulk Mark as Paid ({donors.length} donors)
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="useShared"
                checked={useShared}
                onChange={(e) => setUseShared(e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="useShared" className="text-sm font-medium text-blue-800">
                Apply same amount to all
              </label>
              {useShared && (
                <div className="relative ml-auto">
                  <CurrencyRupeeIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={sharedAmount}
                    onChange={(e) => setSharedAmount(e.target.value)}
                    placeholder="Amount"
                    className="input-field pl-8 w-32 py-1.5 text-sm"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {donors.map((d) => (
                <div key={d._id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.phone}</p>
                  </div>
                  {!useShared && (
                    <div className="relative">
                      <CurrencyRupeeIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={amounts[d._id]}
                        onChange={(e) =>
                          setAmounts({ ...amounts, [d._id]: e.target.value })
                        }
                        placeholder="0.00"
                        className="input-field pl-7 w-28 py-1.5 text-sm"
                      />
                    </div>
                  )}
                  {useShared && (
                    <span className="text-sm font-medium text-green-700 w-28 text-right">
                      {sharedAmount ? `₹${sharedAmount}` : '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : `Mark ${donors.length} as Paid`}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

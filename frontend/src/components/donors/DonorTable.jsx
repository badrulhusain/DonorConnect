import React from 'react';
import {
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/solid';

const StatusBadge = ({ status }) => {
  if (!status) return <span className="badge-pending"><ClockIcon className="w-3 h-3" />No msg</span>;
  if (status === 'sent') return <span className="badge-sent"><CheckCircleIcon className="w-3 h-3" />Sent</span>;
  if (status === 'failed') return <span className="badge-failed"><XCircleIcon className="w-3 h-3" />Failed</span>;
  return <span className="badge-pending"><ClockIcon className="w-3 h-3" />Pending</span>;
};

const formatCurrency = (n) =>
  n != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
    : '—';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function DonorTable({ donors, selected, onToggle, onToggleAll, onMarkPaid, onEdit, onDelete }) {
  const allSelected = donors.length > 0 && donors.every((d) => selected.includes(d._id));
  const someSelected = donors.some((d) => selected.includes(d._id)) && !allSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 pl-4 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => el && (el.indeterminate = someSelected)}
                onChange={onToggleAll}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
            </th>
            <th className="pb-3 text-left font-medium text-gray-500">Donor</th>
            <th className="pb-3 text-left font-medium text-gray-500 hidden sm:table-cell">Phone</th>
            <th className="pb-3 text-right font-medium text-gray-500">Total</th>
            <th className="pb-3 text-right font-medium text-gray-500 hidden md:table-cell">Last Payment</th>
            <th className="pb-3 text-center font-medium text-gray-500 hidden md:table-cell">Last Paid</th>
            <th className="pb-3 text-center font-medium text-gray-500">Status</th>
            <th className="pb-3 text-right font-medium text-gray-500 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {donors.map((donor) => (
            <tr
              key={donor._id}
              className={`hover:bg-gray-50 transition-colors ${
                selected.includes(donor._id) ? 'bg-green-50' : ''
              }`}
            >
              <td className="py-3.5 pl-4">
                <input
                  type="checkbox"
                  checked={selected.includes(donor._id)}
                  onChange={() => onToggle(donor._id)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </td>
              <td className="py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs">
                      {donor.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{donor.name}</p>
                    <p className="text-xs text-gray-400 sm:hidden">{donor.phone}</p>
                  </div>
                </div>
              </td>
              <td className="py-3.5 hidden sm:table-cell">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {donor.phone}
                </div>
              </td>
              <td className="py-3.5 text-right font-semibold text-gray-900">
                {formatCurrency(donor.totalAmount)}
              </td>
              <td className="py-3.5 text-right text-gray-500 hidden md:table-cell">
                {formatCurrency(donor.lastPayment)}
              </td>
              <td className="py-3.5 text-center text-gray-500 hidden md:table-cell">
                {formatDate(donor.lastPaidAt)}
              </td>
              <td className="py-3.5 text-center">
                <StatusBadge status={donor.messageStatus} />
              </td>
              <td className="py-3.5 pr-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onMarkPaid(donor)}
                    title="Mark as Paid"
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <CheckBadgeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(donor)}
                    title="Edit"
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(donor)}
                    title="Remove"
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {donors.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <UsersEmptyIcon />
          <p className="mt-3 text-sm">No donors found</p>
        </div>
      )}
    </div>
  );
}

const UsersEmptyIcon = () => (
  <svg className="w-12 h-12 mx-auto text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

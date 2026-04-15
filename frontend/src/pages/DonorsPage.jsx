import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { donorAPI, paymentAPI } from '../services/api';
import DonorTable from '../components/donors/DonorTable';
import AddDonorModal from '../components/donors/AddDonorModal';
import MarkPaidModal from '../components/donors/MarkPaidModal';
import BulkMarkPaidModal from '../components/donors/BulkMarkPaidModal';
import BulkSendMessageModal from '../components/donors/BulkSendMessageModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';

const ITEMS_PER_PAGE = 20;

export default function DonorsPage() {
  const [donors, setDonors] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'markPaid' | 'bulk' | 'sendMsg'
  const [activeDonor, setActiveDonor] = useState(null);

  const fetchDonors = useCallback(async (page = 1, q = search) => {
    setLoading(true);
    try {
      const { data } = await donorAPI.getAll({ page, limit: ITEMS_PER_PAGE, search: q });
      setDonors(data.data);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load donors');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchDonors(1, search); }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchDonors(1, search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const closeModal = () => { setModal(null); setActiveDonor(null); };

  const handleAddDonor = async (form) => {
    await donorAPI.add(form);
    toast.success('Donor added successfully');
    fetchDonors(1);
  };

  const handleEditDonor = async (form) => {
    await donorAPI.update(activeDonor._id, form);
    toast.success('Donor updated');
    fetchDonors(pagination.page);
  };

  const handleDelete = async (donor) => {
    if (!window.confirm(`Remove ${donor.name}?`)) return;
    await donorAPI.remove(donor._id);
    toast.success('Donor removed');
    setSelected((s) => s.filter((id) => id !== donor._id));
    fetchDonors(pagination.page);
  };

  const handleMarkPaid = async (donorId, amount, language) => {
    await paymentAPI.markPaid({ donorId, amount, language });
    toast.success('Payment recorded! WhatsApp notification queued.');
    fetchDonors(pagination.page);
  };

  const handleBulkMarkPaid = async (payments) => {
    const { data } = await paymentAPI.bulkMarkPaid({ payments });
    const { succeeded, failed } = data.data;
    if (succeeded.length) toast.success(`${succeeded.length} payment(s) recorded`);
    if (failed.length) toast.error(`${failed.length} payment(s) failed`);
    setSelected([]);
    fetchDonors(pagination.page);
  };

  const handleExportCSV = async () => {
    const loadingToast = toast.loading('Preparing CSV...');
    try {
      const { data } = await donorAPI.exportCSV();
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `donors-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported', { id: loadingToast });
    } catch {
      toast.error('Export failed', { id: loadingToast });
    }
  };

  const toggleSelect = (id) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const toggleSelectAll = () =>
    setSelected(selected.length === donors.length ? [] : donors.map((d) => d._id));

  const selectedDonors = donors.filter((d) => selected.includes(d._id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donors</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total donors</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.length > 0 && (
            <>
              <button
                onClick={() => setModal('sendMsg')}
                className="btn-secondary"
              >
                <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                Send Message
              </button>
              <button
                onClick={() => setModal('bulk')}
                className="btn-primary"
              >
                <CheckBadgeIcon className="w-4 h-4" />
                Mark {selected.length} as Paid
              </button>
            </>
          )}
          <button onClick={handleExportCSV} className="btn-secondary">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={() => setModal('add')} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            Add Donor
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search donors..."
              className="input-field pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3 items-center">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 h-4 bg-gray-200 rounded" />
                <div className="w-20 h-4 bg-gray-200 rounded" />
                <div className="w-16 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <DonorTable
            donors={donors}
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            onMarkPaid={(d) => { setActiveDonor(d); setModal('markPaid'); }}
            onEdit={(d) => { setActiveDonor(d); setModal('edit'); }}
            onDelete={handleDelete}
          />
        )}

        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchDonors(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => fetchDonors(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modal === 'add' && <AddDonorModal onSave={handleAddDonor} onClose={closeModal} />}
      {modal === 'edit' && activeDonor && <AddDonorModal donor={activeDonor} onSave={handleEditDonor} onClose={closeModal} />}
      {modal === 'markPaid' && activeDonor && (
        <MarkPaidModal donor={activeDonor} onConfirm={handleMarkPaid} onClose={closeModal} />
      )}
      {modal === 'bulk' && selectedDonors.length > 0 && (
        <BulkMarkPaidModal donors={selectedDonors} onConfirm={handleBulkMarkPaid} onClose={closeModal} />
      )}
      {modal === 'sendMsg' && selectedDonors.length > 0 && (
        <BulkSendMessageModal donors={selectedDonors} onClose={closeModal} />
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { contactAPI } from '../services/api';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

const tagColors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];
const tagColor = (tag) => tagColors[Math.abs(tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % tagColors.length];

function ContactModal({ contact, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: contact?.name || '',
    phone: contact?.phone || '',
    tags: contact?.tags?.join(', ') || '',
    language: contact?.language || 'en',
    notes: contact?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!PHONE_REGEX.test(form.phone.trim())) e.phone = 'Phone must be E.164 format (e.g. +60123456789)';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        tags: form.tags,
        language: form.language,
        notes: form.notes.trim(),
      };
      if (contact) {
        await contactAPI.update(contact._id, payload);
        toast.success('Contact updated');
      } else {
        await contactAPI.add(payload);
        toast.success('Contact added');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Ali" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (E.164)</label>
            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+60123456789" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input className="input-field" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="group1, vip, donor" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select className="input-field" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="en">English</option>
              <option value="ml">Malayalam</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Contact'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImported }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setError('');
    let parsed;
    try {
      parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Must be an array');
    } catch {
      setError('Invalid JSON. Must be an array of contact objects.');
      return;
    }
    setImporting(true);
    try {
      const res = await contactAPI.import({ contacts: parsed });
      setResult(res.data);
      toast.success(`Imported: ${res.data.imported}`);
      onImported();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Import Contacts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Paste a JSON array of contacts:</p>
        <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mb-3 overflow-x-auto">{`[{"name":"Ahmed","phone":"+60123456789","tags":["group1"],"language":"en"}]`}</pre>
        <textarea
          className="input-field font-mono text-xs"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='[{"name":"...", "phone":"+60..."}]'
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {result && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-700">
            Imported: <strong>{result.imported}</strong> · Skipped: <strong>{result.skipped}</strong>
            {result.errors?.length > 0 && (
              <div className="mt-2 text-red-600 text-xs">
                {result.errors.map((e, i) => <div key={i}>{e.phone}: {e.reason}</div>)}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <button onClick={handleImport} disabled={importing || !text.trim()} className="btn-primary flex-1">
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeContact, setActiveContact] = useState(null);
  const [page, setPage] = useState(1);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (selectedTag) params.tag = selectedTag;
      const res = await contactAPI.getAll(params);
      setContacts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedTag]);

  useEffect(() => {
    contactAPI.getTags().then((res) => setTags(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleDelete = async (contact) => {
    if (!window.confirm(`Delete ${contact.name}?`)) return;
    try {
      await contactAPI.remove(contact._id);
      toast.success('Contact deleted');
      fetchContacts();
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  const handleSaved = () => {
    setModal(null);
    setActiveContact(null);
    contactAPI.getTags().then((res) => setTags(res.data.data)).catch(console.error);
    fetchContacts();
  };

  return (
    <div className="space-y-5">
      {modal === 'add' || modal === 'edit' ? (
        <ContactModal
          contact={activeContact}
          onClose={() => { setModal(null); setActiveContact(null); }}
          onSaved={handleSaved}
        />
      ) : null}
      {modal === 'import' && (
        <ImportModal
          onClose={() => setModal(null)}
          onImported={() => { fetchContacts(); contactAPI.getTags().then((r) => setTags(r.data.data)).catch(() => {}); }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} contacts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('import')} className="btn-secondary">Import</button>
          <button onClick={() => { setActiveContact(null); setModal('add'); }} className="btn-primary">
            <PlusIcon className="w-4 h-4" />Add Contact
          </button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedTag(''); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!selectedTag ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => { setSelectedTag(tag === selectedTag ? '' : tag); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedTag === tag ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Language</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-200 rounded w-10" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400 sm:hidden">{c.phone}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{c.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((tag) => (
                          <span key={tag} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tagColor(tag)}`}>{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-medium text-gray-500 uppercase">{c.language}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setActiveContact(c); setModal('edit'); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(page + 1)}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { broadcastAPI, contactAPI } from '../services/api';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CreateBroadcastPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    templateName: '',
    templateLanguage: 'en_US',
    parameters: [],
    recipientMode: 'tags',
    selectedTags: [],
    selectedContactIds: [],
  });
  const [resolvedCount, setResolvedCount] = useState(0);
  const [tags, setTags] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactPage, setContactPage] = useState(1);
  const [contactPagination, setContactPagination] = useState({ pages: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(contactSearch, 350);

  useEffect(() => {
    contactAPI.getTags().then((r) => setTags(r.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.recipientMode !== 'contacts') return;
    const params = { page: contactPage, limit: 20 };
    if (debouncedSearch) params.search = debouncedSearch;
    contactAPI.getAll(params).then((r) => {
      setContacts((prev) => contactPage === 1 ? r.data.data : [...prev, ...r.data.data]);
      setContactPagination(r.data.pagination);
    }).catch(console.error);
  }, [debouncedSearch, contactPage, form.recipientMode]);

  useEffect(() => {
    if (form.recipientMode !== 'tags' || form.selectedTags.length === 0) {
      setResolvedCount(0);
      return;
    }
    contactAPI.getAll({ tags: form.selectedTags.join(','), limit: 1 })
      .then((r) => setResolvedCount(r.data.pagination?.total || 0))
      .catch(() => setResolvedCount(0));
  }, [form.selectedTags, form.recipientMode]);

  const toggleTag = (tag) => {
    setForm((f) => ({
      ...f,
      selectedTags: f.selectedTags.includes(tag)
        ? f.selectedTags.filter((t) => t !== tag)
        : [...f.selectedTags, tag],
    }));
  };

  const toggleContact = (id) => {
    setForm((f) => ({
      ...f,
      selectedContactIds: f.selectedContactIds.includes(id)
        ? f.selectedContactIds.filter((c) => c !== id)
        : [...f.selectedContactIds, id],
    }));
  };

  const addParam = () => setForm((f) => ({ ...f, parameters: [...f.parameters, ''] }));
  const removeParam = (i) => setForm((f) => ({ ...f, parameters: f.parameters.filter((_, idx) => idx !== i) }));
  const setParam = (i, val) => setForm((f) => {
    const p = [...f.parameters];
    p[i] = val;
    return { ...f, parameters: p };
  });

  const recipientCount = form.recipientMode === 'tags' ? resolvedCount : form.selectedContactIds.length;

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.templateName.trim()) { setError('Template name is required'); return; }
    if (recipientCount === 0) { setError('At least one recipient is required'); return; }

    const payload = {
      title: form.title.trim(),
      templateName: form.templateName.trim(),
      templateLanguage: form.templateLanguage,
      parameters: form.parameters.filter((p) => p.trim() !== ''),
    };

    if (form.recipientMode === 'tags') {
      payload.tags = form.selectedTags;
    } else {
      payload.recipientIds = form.selectedContactIds;
    }

    setSubmitting(true);
    try {
      await broadcastAPI.create(payload);
      toast.success('Broadcast created!');
      navigate('/broadcasts');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-32">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Broadcast</h1>
        <p className="text-gray-500 text-sm mt-0.5">Send a WhatsApp template message to your contacts</p>
      </div>

      {/* Section 1: Details */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Broadcast Details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input className="input-field" placeholder="e.g. Ramadan Announcement 2025" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Template Name</label>
          <input className="input-field" placeholder="e.g. ramadan_greetings" value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} />
          <p className="text-xs text-gray-400 mt-1">Must be a Meta-approved template name</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Template Language</label>
          <select className="input-field" value={form.templateLanguage} onChange={(e) => setForm({ ...form, templateLanguage: e.target.value })}>
            <option value="en_US">English (en_US)</option>
            <option value="ml_IN">Malayalam (ml_IN)</option>
          </select>
        </div>
      </div>

      {/* Section 2: Parameters */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Template Parameters</h2>
        <p className="text-sm text-gray-500">Add values for each {'{{N}}'} placeholder in your template</p>
        {form.parameters.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-mono w-8 flex-shrink-0">{`{{${i + 1}}}`}</span>
            <input
              className="input-field flex-1"
              placeholder={`Value for {{${i + 1}}}`}
              value={p}
              onChange={(e) => setParam(i, e.target.value)}
            />
            <button onClick={() => removeParam(i)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={addParam} className="btn-secondary">
          <PlusIcon className="w-4 h-4" />Add Parameter
        </button>
      </div>

      {/* Section 3: Recipients */}
      <div className="card p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Recipients</h2>
        <div className="flex gap-2">
          {['tags', 'contacts'].map((mode) => (
            <button
              key={mode}
              onClick={() => { setForm({ ...form, recipientMode: mode }); setContactPage(1); setContacts([]); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${form.recipientMode === mode ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
            >
              {mode === 'tags' ? 'By Tag' : 'Select Contacts'}
            </button>
          ))}
        </div>

        {form.recipientMode === 'tags' && (
          <div>
            {tags.length === 0 ? (
              <p className="text-gray-400 text-sm">No tags found. Add tags to contacts first.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tags.map((tag) => (
                  <label key={tag} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${form.selectedTags.includes(tag) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                    <input type="checkbox" checked={form.selectedTags.includes(tag)} onChange={() => toggleTag(tag)} className="accent-green-600" />
                    <span className="text-sm font-medium text-gray-700">{tag}</span>
                  </label>
                ))}
              </div>
            )}
            {form.selectedTags.length > 0 && (
              <p className="text-sm text-gray-600 mt-3">
                Estimated recipients: <strong>{resolvedCount}</strong>
              </p>
            )}
          </div>
        )}

        {form.recipientMode === 'contacts' && (
          <div className="space-y-3">
            <input
              className="input-field"
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); setContacts([]); }}
            />
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {contacts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No contacts found</p>
              ) : (
                contacts.map((c) => (
                  <label key={c._id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${form.selectedContactIds.includes(c._id) ? 'bg-green-50' : ''}`}>
                    <input type="checkbox" checked={form.selectedContactIds.includes(c._id)} onChange={() => toggleContact(c._id)} className="accent-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {contactPage < contactPagination.pages && (
              <button
                onClick={() => setContactPage((p) => p + 1)}
                className="btn-secondary w-full text-xs py-1.5"
              >
                Load more
              </button>
            )}
            <p className="text-sm text-gray-600">Selected: <strong>{form.selectedContactIds.length}</strong> contacts</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 px-6 py-4 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <span className="mr-4">Recipients: <strong>{recipientCount}</strong></span>
            <span>Parameters: <strong>{form.parameters.length}</strong></span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/broadcasts')} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
              {submitting ? 'Creating...' : 'Create Broadcast'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

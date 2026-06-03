import { useState, useEffect, useCallback } from 'react';
import { Plus, StickyNote, Pin, Tag, LayoutGrid, List, Sparkles, Share2, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import NoteCard from '../components/notes/NoteCard';
import NoteModal from '../components/notes/NoteModal';

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const NoteSkeletonCard = () => (
  <div className="rounded-2xl p-5 space-y-3" style={{ border: '1px solid var(--border-primary)' }}>
    <div className="shimmer h-4 rounded-lg w-3/4" />
    <div className="shimmer h-3 rounded-lg w-full" />
    <div className="shimmer h-3 rounded-lg w-2/3" />
    <div className="flex gap-1.5 mt-4">
      <div className="shimmer h-5 rounded-full w-14" />
      <div className="shimmer h-5 rounded-full w-16" />
    </div>
  </div>
);

const formatBytes = (b) => {
  if (!b) return '0 MB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [storage, setStorage] = useState({ used: 0, limit: 50 * 1024 * 1024 });
  const [showShared, setShowShared] = useState(false);

  const fetchNotes = useCallback(async (q = '', tag = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (tag) params.set('tag', tag);
      const { data } = await api.get(`/notes?${params}`);
      setNotes(data.notes);
      setSharedNotes(data.sharedNotes || []);
    } catch { toast.error('Failed to load notes.'); }
    finally { setLoading(false); }
  }, []);

  const fetchStorage = useCallback(async () => {
    try {
      const { data } = await api.get('/notes/storage');
      setStorage(data.storage);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchNotes(search, activeTag), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, activeTag, fetchNotes]);

  useEffect(() => { fetchStorage(); }, [fetchStorage]);

  const handleSave = async (formData) => {
    try {
      if (editNote) {
        const { data } = await api.put(`/notes/${editNote._id}`, formData);
        setNotes(ns => ns.map(n => n._id === editNote._id ? data.note : n));
        toast.success('Note updated ✦');
      } else {
        const { data } = await api.post('/notes', formData);
        setNotes(ns => [data.note, ...ns]);
        toast.success('Note created ✦');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save note.');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes(ns => ns.filter(n => n._id !== id));
      toast.success('Note deleted.');
      setDeleteConfirm(null);
      fetchStorage();
    } catch { toast.error('Failed to delete note.'); }
  };

  const handlePin = async (id) => {
    try {
      const { data } = await api.patch(`/notes/${id}/pin`);
      setNotes(ns => {
        const updated = ns.map(n => n._id === id ? data.note : n);
        return [...updated].sort((a, b) => b.isPinned - a.isPinned || new Date(b.updatedAt) - new Date(a.updatedAt));
      });
      toast.success(data.note.isPinned ? 'Note pinned ✦' : 'Note unpinned.');
    } catch { toast.error('Failed to update pin.'); }
  };

  const allTags = [...new Set(notes.flatMap(n => n.tags || []))].slice(0, 12);
  const pinnedNotes = notes.filter(n => n.isPinned);
  const unpinnedNotes = notes.filter(n => !n.isPinned);
  const gridClass = viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4' : 'flex flex-col gap-3';
  const openCreate = () => { setEditNote(null); setModalOpen(true); };
  const openEdit = (note) => { setEditNote(note); setModalOpen(true); };

  const storagePct = Math.round((storage.used / storage.limit) * 100);
  const storageClass = storagePct > 90 ? 'danger' : storagePct > 70 ? 'warning' : '';

  return (
    <div className="min-h-screen bg-mesh">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <div className="relative z-10">
        <Navbar search={search} onSearch={setSearch} />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8 animate-slide-up">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {GREETING()}, {user?.name?.split(' ')[0]} ✦
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {notes.length === 0 ? 'Start capturing your thoughts' : `${notes.length} note${notes.length !== 1 ? 's' : ''} in your workspace`}
              </p>
              {/* Storage bar */}
              <div className="flex items-center gap-2 mt-2 max-w-xs">
                <HardDrive size={12} style={{ color: 'var(--text-faint)' }} />
                <div className="storage-bar flex-1">
                  <div className={`storage-bar-fill ${storageClass}`} style={{ width: `${Math.min(storagePct, 100)}%` }} />
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-faint)' }}>
                  {formatBytes(storage.used)} / {formatBytes(storage.limit)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {sharedNotes.length > 0 && (
                <button onClick={() => setShowShared(s => !s)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: showShared ? 'var(--accent-subtle)' : 'var(--bg-secondary)', border: `1px solid ${showShared ? 'var(--accent-border)' : 'var(--border-primary)'}`, color: showShared ? 'var(--accent-tertiary)' : 'var(--text-muted)' }}>
                  <Share2 size={13} /> Shared ({sharedNotes.length})
                </button>
              )}
              <div className="flex glass rounded-xl p-1 gap-0.5">
                <button onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'text-violet-400' : ''}`}
                  style={{ background: viewMode === 'grid' ? 'var(--accent-subtle)' : undefined, color: viewMode === 'grid' ? undefined : 'var(--text-muted)' }}>
                  <LayoutGrid size={15} />
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'text-violet-400' : ''}`}
                  style={{ background: viewMode === 'list' ? 'var(--accent-subtle)' : undefined, color: viewMode === 'list' ? undefined : 'var(--text-muted)' }}>
                  <List size={15} />
                </button>
              </div>
              <button onClick={openCreate} className="btn-primary !w-auto flex items-center gap-2 px-4 sm:px-5">
                <Plus size={16} strokeWidth={2.5} />
                <span className="hidden sm:inline">New Note</span>
              </button>
            </div>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar animate-fade-in">
              <Tag size={13} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <button onClick={() => setActiveTag('')}
                className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-all duration-200 font-medium`}
                style={{ background: activeTag === '' ? 'var(--accent-subtle)' : 'transparent', borderColor: activeTag === '' ? 'var(--accent-border)' : 'var(--border-primary)', color: activeTag === '' ? 'var(--accent-tertiary)' : 'var(--text-muted)' }}>
                All
              </button>
              {allTags.map(tag => (
                <button key={tag} onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-all duration-200 font-medium"
                  style={{ background: activeTag === tag ? 'var(--accent-subtle)' : 'transparent', borderColor: activeTag === tag ? 'var(--accent-border)' : 'var(--border-primary)', color: activeTag === tag ? 'var(--accent-tertiary)' : 'var(--text-muted)' }}>
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {loading && (<div className={gridClass}>{[...Array(8)].map((_, i) => <NoteSkeletonCard key={i} />)}</div>)}

          {!loading && notes.length === 0 && !showShared && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
                {search ? <StickyNote size={32} style={{ color: 'var(--accent-tertiary)', opacity: 0.6 }} /> : <Sparkles size={32} style={{ color: 'var(--accent-tertiary)', opacity: 0.6 }} />}
              </div>
              <h3 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
                {search ? `No results for "${search}"` : 'Your canvas awaits'}
              </h3>
              <p className="text-sm mb-8 text-center max-w-xs" style={{ color: 'var(--text-muted)' }}>
                {search ? 'Try a different search term.' : 'Create your first note and start building your knowledge base.'}
              </p>
              {!search && (
                <button onClick={openCreate} className="btn-primary !w-auto flex items-center gap-2 px-6">
                  <Plus size={16} />Create first note
                </button>
              )}
            </div>
          )}

          {/* Shared Notes Section */}
          {!loading && showShared && sharedNotes.length > 0 && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Share2 size={13} style={{ color: 'var(--accent-tertiary)' }} />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Shared with you</h2>
              </div>
              <div className={gridClass}>
                {sharedNotes.map(note => (
                  <NoteCard key={note._id} note={note} onEdit={openEdit} onDelete={() => { }} onPin={() => { }} />
                ))}
              </div>
            </div>
          )}

          {/* Pinned notes */}
          {!loading && pinnedNotes.length > 0 && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Pin size={13} className="text-violet-400 fill-violet-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Pinned</h2>
              </div>
              <div className={gridClass}>
                {pinnedNotes.map(note => (<NoteCard key={note._id} note={note} onEdit={openEdit} onDelete={(id) => setDeleteConfirm(id)} onPin={handlePin} />))}
              </div>
            </div>
          )}

          {/* All notes */}
          {!loading && unpinnedNotes.length > 0 && (
            <div className="animate-fade-in">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote size={13} style={{ color: 'var(--text-muted)' }} />
                  <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Notes</h2>
                </div>
              )}
              <div className={gridClass}>
                {unpinnedNotes.map(note => (<NoteCard key={note._id} note={note} onEdit={openEdit} onDelete={(id) => setDeleteConfirm(id)} onPin={handlePin} />))}
              </div>
            </div>
          )}
        </main>
      </div>

      {modalOpen && (<NoteModal note={editNote} onClose={() => { setModalOpen(false); setEditNote(null); fetchStorage(); }} onSave={handleSave} />)}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-strong p-6 sm:p-7 w-full max-w-sm animate-slide-up text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>🗑️</div>
            <h3 className="font-display text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Delete note?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-glass flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 px-5 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 20px var(--danger-shadow)' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl sm:hidden transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', boxShadow: '0 8px 30px rgba(99,102,241,0.5)' }}>
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Tag, Pin, Palette, Check, Paperclip, Mic, MicOff, Image, FileText, Clock, Share2, Trash2, Play, Pause, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const COLORS = [
  { id: 'default', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500' },
  { id: 'violet', label: 'Violet', bg: 'bg-violet-500' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-500' },
];

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function NoteModal({ note, onClose, onSave, onRefresh }) {
  const [form, setForm] = useState({
    title: note?.title || '', content: note?.content || '',
    color: note?.color || 'default', tags: note?.tags || [],
    isPinned: note?.isPinned || false,
  });
  const [tagInput, setTagInput] = useState('');
  const [showColors, setShowColors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('write');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [attachments, setAttachments] = useState(note?.attachments || []);
  const [reminders, setReminders] = useState(note?.reminders || []);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMsg, setReminderMsg] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePerm, setSharePerm] = useState('view');
  const [sharedWith, setSharedWith] = useState(note?.sharedWith || []);
  const [playingAudio, setPlayingAudio] = useState(null);
  const titleRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await onSave({ ...form, reminders });
      onClose();
    } finally { setLoading(false); }
  };

  const handleTagKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      if (newTag && !form.tags.includes(newTag) && form.tags.length < 8) {
        setForm(f => ({ ...f, tags: [...f.tags, newTag] }));
      }
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      setForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  // File upload via drag & drop or click
  const onDrop = useCallback(async (acceptedFiles) => {
    if (!note?._id) { toast.error('Save the note first before uploading files.'); return; }
    for (const file of acceptedFiles) {
      setUploading(true);
      try {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        let type = 'image';
        if (file.type === 'application/pdf') type = 'pdf';
        else if (file.type.startsWith('video/')) type = 'video';
        const { data } = await api.post(`/notes/${note._id}/attachments`, { file: base64, type, name: file.name });
        setAttachments(prev => [...prev, data.attachment]);
        toast.success('File uploaded!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Upload failed.');
      } finally { setUploading(false); }
    }
  }, [note?._id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [], 'application/pdf': [], 'video/*': [] },
    maxSize: 10 * 1024 * 1024, noClick: false,
  });

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (!note?._id) { toast.error('Save the note first.'); return; }
        setUploading(true);
        try {
          const reader = new FileReader();
          const base64 = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(blob); });
          const { data } = await api.post(`/notes/${note._id}/attachments`, { file: base64, type: 'voice', name: `Voice Note ${new Date().toLocaleTimeString()}` });
          setAttachments(prev => [...prev, data.attachment]);
          toast.success('Voice note saved!');
        } catch (err) { toast.error('Voice upload failed.'); }
        finally { setUploading(false); }
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch { toast.error('Microphone access denied.'); }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setRecording(false); setMediaRecorder(null); }
  };

  const deleteAttachment = async (attId) => {
    if (!note?._id) return;
    try {
      await api.delete(`/notes/${note._id}/attachments/${attId}`);
      setAttachments(prev => prev.filter(a => a._id !== attId));
      toast.success('Attachment deleted.');
    } catch { toast.error('Failed to delete.'); }
  };

  const addReminder = () => {
    if (!reminderDate) return;
    setReminders(prev => [...prev, { date: reminderDate, message: reminderMsg, sent: false }]);
    setReminderDate(''); setReminderMsg('');
  };

  const removeReminder = (idx) => { setReminders(prev => prev.filter((_, i) => i !== idx)); };

  const handleShare = async () => {
    if (!note?._id || !shareEmail) return;
    try {
      const { data } = await api.post(`/notes/${note._id}/share`, { email: shareEmail, permission: sharePerm });
      setSharedWith(data.note.sharedWith || []);
      setShareEmail('');
      toast.success('Note shared!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to share.'); }
  };

  const removeShare = async (userId) => {
    if (!note?._id) return;
    try {
      await api.delete(`/notes/${note._id}/share/${userId}`);
      setSharedWith(prev => prev.filter(s => (s.user?._id || s.user) !== userId));
      toast.success('Access removed.');
    } catch { toast.error('Failed to remove access.'); }
  };

  const playAudio = (url, id) => {
    if (playingAudio === id) { audioRef.current?.pause(); setPlayingAudio(null); return; }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.play();
    audioRef.current = audio;
    setPlayingAudio(id);
  };

  const tabs = [
    { id: 'write', label: 'Write' },
    { id: 'attach', label: 'Files', icon: Paperclip },
    { id: 'remind', label: 'Remind', icon: Clock },
    ...(note?._id ? [{ id: 'share', label: 'Share', icon: Share2 }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-strong w-full max-w-lg animate-slide-up max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {note ? 'Edit note' : 'New note'}
          </h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setForm(f => ({ ...f, isPinned: !f.isPinned }))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${form.isPinned ? 'text-violet-400' : ''}`}
              style={{ background: form.isPinned ? 'var(--accent-subtle)' : undefined, color: form.isPinned ? undefined : 'var(--text-muted)' }} title="Pin note">
              <Pin size={15} fill={form.isPinned ? 'currentColor' : 'none'} />
            </button>
            <button onClick={() => setShowColors(s => !s)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{ background: showColors ? 'var(--accent-subtle)' : undefined, color: showColors ? 'var(--accent-tertiary)' : 'var(--text-muted)' }} title="Note color">
              <Palette size={15} />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{ color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>
        </div>

        {/* Color Picker */}
        {showColors && (
          <div className="px-4 sm:px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-primary)' }}>
            <div className="flex items-center gap-2">
              {COLORS.map(c => (
                <button key={c.id} onClick={() => { setForm(f => ({ ...f, color: c.id })); setShowColors(false); }}
                  className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center transition-transform hover:scale-110`} title={c.label}>
                  {form.color === c.id && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-3 flex gap-1 flex-shrink-0 overflow-x-auto hide-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
              style={{ background: activeTab === t.id ? 'var(--accent-subtle)' : 'transparent', color: activeTab === t.id ? 'var(--accent-tertiary)' : 'var(--text-muted)', border: activeTab === t.id ? '1px solid var(--accent-border)' : '1px solid transparent' }}>
              {t.icon && <t.icon size={12} />} {t.label}
              {t.id === 'attach' && attachments.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--accent-primary)', color: '#fff' }}>{attachments.length}</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {activeTab === 'write' && (
            <>
              <input ref={titleRef} type="text" placeholder="Note title…"
                className="w-full bg-transparent border-none outline-none font-display text-xl font-bold resize-none"
                style={{ color: 'var(--text-primary)' }} value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={150}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('note-content')?.focus(); } }} />
              <textarea id="note-content" placeholder="Start writing your thoughts…"
                className="w-full bg-transparent border-none outline-none text-sm leading-relaxed resize-none min-h-[160px]"
                style={{ color: 'var(--text-secondary)' }} value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))} maxLength={50000} />
            </>
          )}

          {activeTab === 'attach' && (
            <div className="space-y-4">
              <div {...getRootProps()} className={`drop-zone cursor-pointer ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {isDragActive ? 'Drop files here…' : 'Drag & drop files, or click to browse'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Images, PDFs, Videos (max 10MB each)</p>
              </div>

              {/* Voice Recording */}
              <div className="flex items-center gap-3">
                <button onClick={recording ? stopRecording : startRecording}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${recording ? 'animate-pulse' : ''}`}
                  style={{ background: recording ? 'var(--danger-bg)' : 'var(--bg-secondary)', border: `1px solid ${recording ? 'var(--danger-border)' : 'var(--border-primary)'}`, color: recording ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {recording ? <><MicOff size={14} /> Stop Recording</> : <><Mic size={14} /> Record Voice Note</>}
                </button>
                {uploading && <span className="text-xs animate-pulse" style={{ color: 'var(--accent-tertiary)' }}>Uploading…</span>}
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Attachments ({attachments.length})</p>
                  {attachments.map(att => (
                    <div key={att._id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                      {att.type === 'image' && <Image size={16} style={{ color: 'var(--accent-tertiary)' }} />}
                      {att.type === 'pdf' && <FileText size={16} style={{ color: '#f59e0b' }} />}
                      {att.type === 'voice' && (
                        <button onClick={() => playAudio(att.url, att._id)} className="flex-shrink-0">
                          {playingAudio === att._id ? <Pause size={16} style={{ color: 'var(--success)' }} /> : <Play size={16} style={{ color: 'var(--success)' }} />}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{att.name || att.type}</p>
                        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatBytes(att.bytes)} • {att.format || att.type}</p>
                      </div>
                      {att.type === 'image' && <a href={att.url} target="_blank" rel="noopener" className="text-xs" style={{ color: 'var(--accent-tertiary)' }}>View</a>}
                      {att.type === 'pdf' && <a href={att.url} target="_blank" rel="noopener" className="text-xs" style={{ color: '#f59e0b' }}>Open</a>}
                      <button onClick={() => deleteAttachment(att._id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'remind' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Add Reminder</label>
                <input type="datetime-local" className="input-glass" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
                <input type="text" className="input-glass" placeholder="Reminder message (optional)" value={reminderMsg} onChange={e => setReminderMsg(e.target.value)} />
                <button onClick={addReminder} className="btn-glass w-full text-center" disabled={!reminderDate}>
                  <Clock size={14} className="inline mr-2" />Add Reminder
                </button>
              </div>
              {reminders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Active Reminders</p>
                  {reminders.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                      <Clock size={14} style={{ color: r.sent ? 'var(--success)' : 'var(--warning)' }} />
                      <div className="flex-1">
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{new Date(r.date).toLocaleString()}</p>
                        {r.message && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.message}</p>}
                        {r.sent && <span className="text-xs" style={{ color: 'var(--success)' }}>✓ Sent</span>}
                      </div>
                      <button onClick={() => removeReminder(i)} style={{ color: 'var(--danger)' }}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Share with</label>
                <input type="email" className="input-glass" placeholder="Enter email address" value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
                <div className="flex gap-2">
                  <select className="input-glass flex-1" value={sharePerm} onChange={e => setSharePerm(e.target.value)}
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                    <option value="view">Can View</option>
                    <option value="edit">Can Edit</option>
                  </select>
                  <button onClick={handleShare} className="btn-primary !w-auto px-6">Share</button>
                </div>
              </div>
              {sharedWith.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Shared with</p>
                  {sharedWith.map(s => {
                    const u = s.user || {};
                    return (
                      <div key={u._id || s.user} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)' }}>
                          {(u.name || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{u.name || u.email || 'User'}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.permission}</p>
                        </div>
                        <button onClick={() => removeShare(u._id || s.user)} style={{ color: 'var(--danger)' }}><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags + Footer */}
        <div className="px-4 sm:px-6 py-4 flex-shrink-0 space-y-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <div className="flex items-start gap-2">
            <Tag size={14} className="mt-1 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {form.tags.map(tag => (
                <span key={tag} className="tag-badge flex items-center gap-1">#{tag}
                  <button onClick={() => removeTag(tag)} className="ml-0.5 transition-colors" style={{ color: 'var(--accent-tertiary)', opacity: 0.5 }}><X size={10} /></button>
                </span>
              ))}
              <input type="text" placeholder={form.tags.length < 8 ? "Add tag, press Enter…" : "Max tags"}
                className="bg-transparent outline-none text-xs min-w-[120px] flex-1"
                style={{ color: 'var(--text-secondary)' }} value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown} disabled={form.tags.length >= 8} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-glass flex-1 text-center">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1" disabled={loading || !form.title.trim()}>
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span>
                : note ? 'Save changes' : 'Create note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

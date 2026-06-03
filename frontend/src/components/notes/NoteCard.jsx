import { Pin, Trash2, PencilLine, MoreVertical, Paperclip, Clock, Share2, Mic, Image, FileText } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const COLOR_DOT = {
  default: 'bg-indigo-400', rose: 'bg-rose-400', amber: 'bg-amber-400',
  emerald: 'bg-emerald-400', sky: 'bg-sky-400', violet: 'bg-violet-400', pink: 'bg-pink-400',
};

export default function NoteCard({ note, onEdit, onDelete, onPin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const truncate = (str, n) => str?.length > n ? str.slice(0, n) + '…' : str;

  const hasAttachments = note.attachments?.length > 0;
  const hasReminders = note.reminders?.some(r => !r.sent);
  const isShared = note.sharedWith?.length > 0 || note.isShared;
  const voiceCount = note.attachments?.filter(a => a.type === 'voice').length || 0;
  const imageCount = note.attachments?.filter(a => a.type === 'image').length || 0;

  return (
    <div className={`note-${note.color || 'default'} relative group rounded-2xl border p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}
      style={{ backdropFilter: 'blur(12px)' }} onClick={() => onEdit(note)}>
      {note.isPinned && (
        <div className="absolute top-3 right-3">
          <Pin size={13} className="text-violet-400 fill-violet-400" />
        </div>
      )}
      {note.isShared && (
        <div className="absolute top-3 left-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)', border: '1px solid var(--accent-border)' }}>
            Shared · {note.myPermission}
          </span>
        </div>
      )}

      <div className={`flex items-start gap-2.5 mb-3 ${note.isShared ? 'mt-5' : ''} pr-6`}>
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${COLOR_DOT[note.color || 'default']}`} />
        <h3 className="font-display font-semibold text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
          {truncate(note.title, 60)}
        </h3>
      </div>

      {note.content && (
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-tertiary)', marginLeft: '18px' }}>
          {truncate(note.content, 120)}
        </p>
      )}

      {/* Attachment / Reminder / Share indicators */}
      {(hasAttachments || hasReminders || isShared) && (
        <div className="flex flex-wrap gap-1.5 mb-3" style={{ marginLeft: '18px' }}>
          {imageCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-tertiary)' }}>
              <Image size={10} />{imageCount}
            </span>
          )}
          {voiceCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
              <Mic size={10} />{voiceCount}
            </span>
          )}
          {note.attachments?.some(a => a.type === 'pdf') && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
              <FileText size={10} />PDF
            </span>
          )}
          {hasReminders && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
              <Clock size={10} />Reminder
            </span>
          )}
          {isShared && !note.isShared && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)' }}>
              <Share2 size={10} />{note.sharedWith.length}
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" style={{ marginLeft: '18px' }}>
          {note.tags.slice(0, 3).map(tag => (<span key={tag} className="tag-badge">#{tag}</span>))}
          {note.tags.length > 3 && (<span className="tag-badge">+{note.tags.length - 3}</span>)}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2" style={{ marginLeft: '18px' }} onClick={e => e.stopPropagation()}>
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{formatDate(note.updatedAt)}</span>
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-150" ref={menuRef}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(s => !s); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)' }}>
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-40 glass-strong py-1.5 animate-fade-in z-20" style={{ borderRadius: '14px' }}>
              <button onClick={(e) => { e.stopPropagation(); onEdit(note); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <PencilLine size={13} /> Edit note
              </button>
              {!note.isShared && (
                <button onClick={(e) => { e.stopPropagation(); onPin(note._id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>
                  <Pin size={13} /> {note.isPinned ? 'Unpin' : 'Pin note'}
                </button>
              )}
              {!note.isShared && (
                <>
                  <div className="my-1" style={{ borderTop: '1px solid var(--border-primary)' }} />
                  <button onClick={(e) => { e.stopPropagation(); onDelete(note._id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors" style={{ color: 'var(--danger)' }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

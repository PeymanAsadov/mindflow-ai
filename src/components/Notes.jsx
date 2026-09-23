import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { FileText, ChevronLeft, Loader2, Edit2, Check, Plus, X, Sparkles, Trash2 } from 'lucide-react';

export default function Notes() {
    const navigate = useNavigate();
    const { items, loading, error, updateItem, addItem } = useUser();

    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    // Modal state-ləri
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    // Local state
    const [localNotes, setLocalNotes] = useState(() => {
        const saved = localStorage.getItem('mindflow_local_notes');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const rawNotes = Array.isArray(items) ? items.filter(i => i.category === 'notes') : [];
        const formattedNotes = rawNotes.map(item => ({
            id: item.id,
            title: item.fields?.title || 'Note',
            content: item.fields?.description || '',
            date: item.fields?.date || new Date().toLocaleDateString()
        }));

        setLocalNotes(prev => {
            const localOnly = prev.filter(n => String(n.id).startsWith('local-'));
            const existingIds = new Set(formattedNotes.map(n => n.id));
            const uniqueLocalOnly = localOnly.filter(n => !existingIds.has(n.id));
            const combined = [...uniqueLocalOnly, ...formattedNotes];

            localStorage.setItem('mindflow_local_notes', JSON.stringify(combined));
            return combined;
        });
    }, [items]);

    // Modal açıq olanda arxa fonun scroll-unu dayandır
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = isAddModalOpen ? 'hidden' : prevOverflow;
        return () => { document.body.style.overflow = prevOverflow; };
    }, [isAddModalOpen]);

    const handleEdit = (note) => {
        setEditingId(note.id);
        setEditTitle(note.title);
        setEditContent(note.content);
    };

    const handleSave = async (id) => {
        setLocalNotes(prev => {
            const updated = prev.map(note =>
                note.id === id ? { ...note, title: editTitle, content: editContent } : note
            );
            localStorage.setItem('mindflow_local_notes', JSON.stringify(updated));
            return updated;
        });

        const rawNotes = Array.isArray(items) ? items.filter(i => i.category === 'notes') : [];
        const rawNote = rawNotes.find(i => i.id === id);
        if (updateItem && rawNote) {
            await updateItem(id, {
                ...rawNote,
                fields: {
                    ...rawNote.fields,
                    title: editTitle,
                    description: editContent
                }
            });
        }

        setEditingId(null);
    };

    const handleCreateNote = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        const newNoteItem = {
            id: 'local-' + Date.now(),
            title: newTitle,
            content: newContent,
            date: new Date().toLocaleDateString()
        };

        setLocalNotes(prev => {
            const updated = [newNoteItem, ...prev];
            localStorage.setItem('mindflow_local_notes', JSON.stringify(updated));
            return updated;
        });

        if (addItem) {
            await addItem({
                category: 'notes',
                fields: {
                    title: newTitle,
                    description: newContent,
                    date: new Date().toLocaleDateString()
                }
            });
        }

        setNewTitle('');
        setNewContent('');
        setIsAddModalOpen(false);
    };

    const handleDeleteNote = (id) => {
        setLocalNotes(prev => {
            const updated = prev.filter(n => n.id !== id);
            localStorage.setItem('mindflow_local_notes', JSON.stringify(updated));
            return updated;
        });
        if (editingId === id) setEditingId(null);
    };

    const formattedNotes = localNotes.map((item, idx) => ({
        id: item.id,
        title: item.title || 'Note',
        content: item.content || '',
        date: item.date || '',
        highlighted: idx === 0,
    }));

    const recentNotes = formattedNotes.slice(0, 6);
    const earlierNotes = formattedNotes.slice(6);

    const noteSections = [
        {
            title: 'Recent',
            count: `${recentNotes.length} notes`,
            notes: recentNotes,
        },
        ...(earlierNotes.length > 0 ? [{
            title: 'Earlier',
            count: `${earlierNotes.length} notes`,
            notes: earlierNotes,
        }] : [])
    ];

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-amber-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Notes loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-10 w-full max-w-5xl mx-auto relative">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-4 transition"
            >
                <ChevronLeft size={16} />
                Dashboard
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFFAEC] text-amber-500 flex items-center justify-center shadow-sm flex-shrink-0">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notes</h1>
                        <p className="text-xs text-gray-400 mt-0.5">{formattedNotes.length} notes · organized by MindFlow</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
                >
                    <Plus size={16} />
                    Add note
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">{error}</div>
            )}

            <div className="space-y-8 sm:space-y-10">
                {noteSections.map((section, sIndex) => (
                    <div key={sIndex}>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">{section.title}</h2>
                            <span className="text-xs font-medium text-gray-400">{section.count}</span>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            {section.notes.length === 0 ? (
                                <p className="p-4 text-xs text-gray-400">Heç bir qeyd tapılmadı.</p>
                            ) : (
                                section.notes.map((note, nIndex) => (
                                    <NoteItem
                                        key={note.id}
                                        note={note}
                                        nIndex={nIndex}
                                        isLast={nIndex === section.notes.length - 1}
                                        editingId={editingId}
                                        editTitle={editTitle}
                                        editContent={editContent}
                                        setEditTitle={setEditTitle}
                                        setEditContent={setEditContent}
                                        onEdit={handleEdit}
                                        onSave={handleSave}
                                        onDelete={handleDeleteNote}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Note Modal */}
            {isAddModalOpen && createPortal(
                <div
                    onClick={() => setIsAddModalOpen(false)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden mf-modal-enter"
                    >
                        <style>{`
                            @keyframes mfOverlayIn { from { opacity: 0 } to { opacity: 1 } }
                            @keyframes mfModalIn {
                                from { opacity: 0; transform: translateY(8px) scale(.96) }
                                to { opacity: 1; transform: translateY(0) scale(1) }
                            }
                            .mf-overlay-enter { animation: mfOverlayIn .16s ease-out }
                            .mf-modal-enter { animation: mfModalIn .2s cubic-bezier(.16,1,.3,1) }
                        `}</style>

                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Add note</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Save something you want MindFlow to remember</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNote} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Startup positioning ideas"
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="Write your note..."
                                    rows={5}
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-amber-500 focus:bg-white transition resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/50">
                                <Sparkles size={16} className="flex-shrink-0" />
                                <span>MindFlow will save and organize this note in your memory.</span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-sm transition"
                                >
                                    Add note
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function NoteItem({ note, nIndex, isLast, editingId, editTitle, editContent, setEditTitle, setEditContent, onEdit, onSave, onDelete }) {
    const isEditing = editingId === note.id;

    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [startX, setStartX] = useState(0);

    const handleTouchStart = (e) => {
        setStartX(e.touches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        if (diff < 0) {
            setOffsetX(Math.max(diff, -80)); // Sola maksimum 80px sürüşmə
        } else {
            setOffsetX(0);
        }
    };

    const handleTouchEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);
        if (offsetX < -40) {
            setOffsetX(-80);
        } else {
            setOffsetX(0);
        }
    };

    return (
        <div className={`relative overflow-hidden ${!isLast ? 'border-b border-gray-100' : ''}`}>
            {/* Arxa fondakı qırmızı səbət qutusu düyməsi (Yalnız mobil cihazlarda sürüşdürərkən görünür) */}
            <div
                className="absolute inset-y-0 right-0 w-20 bg-red-500 md:hidden flex items-center justify-center text-white cursor-pointer z-0"
                onClick={() => onDelete(note.id)}
            >
                <Trash2 size={18} />
            </div>

            {/* Əsas qeyd elementi */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${offsetX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(.16,1,.3,1)'
                }}
                className={`p-4 sm:p-5 bg-white select-none relative z-10 ${note.highlighted && nIndex === 0 ? 'bg-[#FFFAEC]/40 hover:bg-[#FFFAEC]/60' : 'hover:bg-gray-50/50'}`}
            >
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1">
                            <div className="w-full pr-16 sm:pr-24">
                                {isEditing ? (
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="font-bold text-sm sm:text-base w-full border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-amber-500"
                                    />
                                ) : (
                                    <h3 className={`font-bold text-sm sm:text-base transition-colors ${note.highlighted && nIndex === 0 ? 'text-amber-800' : 'text-gray-900'}`}>
                                        {note.title}
                                    </h3>
                                )}
                            </div>

                            <div className="absolute top-4 right-4 flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs font-medium text-gray-400">
                                    {note.date}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isEditing) {
                                            onSave(note.id);
                                        } else {
                                            onEdit(note);
                                        }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition rounded-lg"
                                    title={isEditing ? "Save Note" : "Edit Note"}
                                >
                                    {isEditing ? <Check size={15} /> : <Edit2 size={15} />}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(note.id);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition rounded-lg"
                                    title="Delete note"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>

                        {isEditing ? (
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="text-xs text-gray-700 w-full border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-amber-500 h-20 resize-none mt-1"
                            />
                        ) : (
                            note.content ? (
                                <p className="text-xs sm:text-sm leading-relaxed text-gray-500">
                                    {note.content}
                                </p>
                            ) : null
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
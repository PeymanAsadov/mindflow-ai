import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { HeartPulse, ChevronLeft, Plus, FileText, Image as ImageIcon, Loader2, X, Sparkles, Upload, Trash2, Edit3 } from 'lucide-react';

export default function HealthCare() {
    const navigate = useNavigate();
    const { items, loading, error, addItem, updateItem } = useUser();

    // Modal state-ləri
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState(null);

    const [doctorName, setDoctorName] = useState('');
    const [reasonForVisit, setReasonForVisit] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    // Swipe üçün state-lər
    const [swipedId, setSwipedId] = useState(null);

    // Lokal state
    const [localRecords, setLocalRecords] = useState(() => {
        const saved = localStorage.getItem('mindflow_local_health');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const rawRecords = Array.isArray(items)
            ? items.filter(i => i.category === 'health' || i.category === 'health & care')
            : [];

        const formatted = rawRecords.map(item => {
            const doc = item.fields?.doctor || item.fields?.title || 'Dr. Unknown';
            const initials = doc.replace('Dr. ', '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            let parsedFiles = item.fields?.files;
            if (typeof parsedFiles === 'string') {
                try { parsedFiles = JSON.parse(parsedFiles); } catch (e) { parsedFiles = [{ name: parsedFiles, type: 'pdf' }]; }
            }
            if (!Array.isArray(parsedFiles)) {
                parsedFiles = parsedFiles ? [parsedFiles] : [];
            }

            return {
                id: item.id,
                doctor: doc,
                initials: initials || 'DR',
                category: item.fields?.category || 'General consultation',
                description: item.fields?.description || item.fields?.notes || '',
                files: parsedFiles
            };
        });

        setLocalRecords(prev => {
            const localOnly = prev.filter(r => String(r.id).startsWith('local-'));
            const existingIds = new Set(formatted.map(r => r.id));
            const uniqueLocalOnly = localOnly.filter(r => !existingIds.has(r.id));
            const combined = [...uniqueLocalOnly, ...formatted];

            localStorage.setItem('mindflow_local_health', JSON.stringify(combined));
            return combined;
        });
    }, [items]);

    // Modal açıq olanda arxa fonun scroll-unu dayandır
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = isAddModalOpen ? 'hidden' : prevOverflow;
        return () => { document.body.style.overflow = prevOverflow; };
    }, [isAddModalOpen]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileType = file.type.includes('image') ? 'image' : 'pdf';
            setSelectedFile({ name: file.name, type: fileType });
        }
    };

    const handleOpenAddModal = () => {
        setEditingRecordId(null);
        setDoctorName('');
        setReasonForVisit('');
        setNotes('');
        setSelectedFile(null);
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (record) => {
        setEditingRecordId(record.id);
        setDoctorName(record.doctor);
        setReasonForVisit(record.category);
        setNotes(record.description);
        setSelectedFile(record.files?.[0] || null);
        setIsAddModalOpen(true);
    };

    const handleSaveRecord = async (e) => {
        e.preventDefault();
        if (!doctorName.trim()) return;

        const formattedDoctor = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;
        const initials = formattedDoctor
            .replace('Dr. ', '')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        const filesArray = selectedFile ? [selectedFile] : [];

        if (editingRecordId) {
            // Edit etmək
            setLocalRecords(prev => {
                const updated = prev.map(r => r.id === editingRecordId ? {
                    ...r,
                    doctor: formattedDoctor,
                    initials: initials || 'DR',
                    category: reasonForVisit || 'General consultation',
                    description: notes,
                    files: filesArray
                } : r);
                localStorage.setItem('mindflow_local_health', JSON.stringify(updated));
                return updated;
            });

            const rawRecords = Array.isArray(items) ? items.filter(i => i.category === 'health' || i.category === 'health & care') : [];
            const rawRecord = rawRecords.find(i => i.id === editingRecordId);
            if (updateItem && rawRecord) {
                await updateItem(editingRecordId, {
                    ...rawRecord,
                    fields: {
                        ...rawRecord.fields,
                        doctor: formattedDoctor,
                        category: reasonForVisit || 'General consultation',
                        description: notes,
                        files: filesArray
                    }
                });
            }
        } else {
            // Yeni yaratmaq
            const newRecord = {
                id: 'local-' + Date.now(),
                doctor: formattedDoctor,
                initials: initials || 'DR',
                category: reasonForVisit || 'General consultation',
                description: notes,
                files: filesArray
            };

            setLocalRecords(prev => {
                const updated = [newRecord, ...prev];
                localStorage.setItem('mindflow_local_health', JSON.stringify(updated));
                return updated;
            });

            if (addItem) {
                await addItem({
                    category: 'health',
                    fields: {
                        doctor: newRecord.doctor,
                        category: newRecord.category,
                        description: newRecord.description,
                        files: newRecord.files
                    }
                });
            }
        }

        setIsAddModalOpen(false);
    };

    // Silmə funksiyası
    const handleDeleteRecord = (id) => {
        setLocalRecords(prev => {
            const updated = prev.filter(r => r.id !== id);
            localStorage.setItem('mindflow_local_health', JSON.stringify(updated));
            return updated;
        });
        if (swipedId === id) setSwipedId(null);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-rose-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Loading health records...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-10 w-full max-w-5xl mx-auto relative overflow-hidden">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-4 transition"
            >
                <ChevronLeft size={16} />
                Dashboard
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm flex-shrink-0">
                        <HeartPulse size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Health & Care</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Your health records — organized by MindFlow</p>
                    </div>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                    <Plus size={16} />
                    Add record
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">{error}</div>
            )}

            <div className="mb-4 flex justify-between items-center px-1">
                <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">Existing records</h2>
                <span className="text-xs font-medium text-gray-400">{localRecords.length} records</span>
            </div>

            <div className="space-y-2.5">
                {localRecords.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-xs">
                        Hələ ki heç bir tibbi qeyd əlavə olunmayıb. Yuxarıdakı "Add record" düyməsi vasitəsilə və ya Telegram botu ilə əlavə edə bilərsiniz.
                    </div>
                ) : (
                    localRecords.map((record) => (
                        <HealthCard
                            key={record.id}
                            record={record}
                            swipedId={swipedId}
                            setSwipedId={setSwipedId}
                            onDelete={handleDeleteRecord}
                            onEdit={handleOpenEditModal}
                        />
                    ))
                )}
            </div>

            {/* Add / Edit Health Record Modal */}
            {isAddModalOpen && createPortal(
                <div
                    onClick={() => setIsAddModalOpen(false)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-lg max-h-[85vh] overflow-hidden mf-modal-enter flex flex-col"
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

                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {editingRecordId ? 'Edit health record' : 'Add health record'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">Keep your health information organized in one place.</p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition flex-shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRecord} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Doctor name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={doctorName}
                                    onChange={(e) => setDoctorName(e.target.value)}
                                    placeholder="e.g. Dr. Sarah Wilson"
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-rose-500 focus:bg-white transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Reason for visit
                                </label>
                                <input
                                    type="text"
                                    value={reasonForVisit}
                                    onChange={(e) => setReasonForVisit(e.target.value)}
                                    placeholder="e.g. Annual check-up"
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-rose-500 focus:bg-white transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes about the appointment, examination or recommendations..."
                                    rows={4}
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-rose-500 focus:bg-white transition resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Document / Image
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                                        <Upload size={20} className="text-gray-400 mb-1" />
                                        <p className="text-xs font-medium text-gray-600">
                                            {selectedFile ? selectedFile.name : 'Upload a document or image'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">PDF, image or other supported file</p>
                                    </div>
                                    <input type="file" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50/60 p-3 rounded-xl border border-rose-100/50">
                                <Sparkles size={16} className="flex-shrink-0" />
                                <span>MindFlow will save and organize this health record.</span>
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
                                    {editingRecordId ? 'Save changes' : 'Add record'}
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

function HealthCard({ record, swipedId, setSwipedId, onDelete, onEdit }) {
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchCurrentX, setTouchCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const isOpen = swipedId === record.id;

    const handleTouchStart = (e) => {
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchCurrentX(e.targetTouches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        const currentX = e.targetTouches[0].clientX;
        const diff = currentX - touchStartX;

        if (isOpen) {
            if (diff > -80 && diff < 50) {
                setTouchCurrentX(currentX);
            }
        } else {
            if (diff < 0) {
                setTouchCurrentX(currentX);
            }
        }
    };

    const handleTouchEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);
        const diff = touchCurrentX - touchStartX;

        if (!isOpen && diff < -50) {
            setSwipedId(record.id);
        } else if (isOpen && diff > 30) {
            setSwipedId(null);
        }
        setTouchCurrentX(touchStartX);
    };

    const translateX = isSwiping
        ? Math.max(-80, Math.min(0, isOpen ? -80 + (touchCurrentX - touchStartX) : touchCurrentX - touchStartX))
        : (isOpen ? -80 : 0);

    const recordFiles = Array.isArray(record.files) ? record.files : [];

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Arxa fondakı silmə düyməsi */}
            <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-4 text-white">
                <button
                    onClick={() => onDelete(record.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center justify-center shadow-sm"
                    title="Delete record"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Əsas kart elementimiz */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (isOpen) setSwipedId(null);
                }}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
                }}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition relative select-none cursor-pointer"
            >
                <div className="flex items-start justify-between gap-4 mb-2 pr-20 sm:pr-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {record.initials || 'DR'}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">{record.doctor}</h3>
                            <p className="text-xs font-medium text-gray-400 mt-0.5">{record.category}</p>
                        </div>
                    </div>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4 pl-11">
                    {record.description}
                </p>

                {recordFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-11">
                        {recordFiles.map((file, fIdx) => (
                            <div
                                key={fIdx}
                                className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                            >
                                {file?.type === 'pdf' ? (
                                    <FileText size={14} className="text-rose-500" />
                                ) : (
                                    <ImageIcon size={14} className="text-emerald-500" />
                                )}
                                <span>{file?.name || 'Document'}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Desktop/Tablet üçün Edit və Delete düymələri */}
                <div className="absolute top-5 right-5 hidden sm:flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(record);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Edit record"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(record.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Delete record"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Mobil üçün sağ üstdə Edit düyməsi (swipe açılmadan əvvəl görünən) */}
                <div className="absolute top-5 right-5 sm:hidden flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(record);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg"
                        title="Edit record"
                    >
                        <Edit3 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
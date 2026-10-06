import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import {
    uploadItemFile,
    getItemFileUrl,
} from '../services/api';
import {
    HeartPulse,
    ChevronLeft,
    Plus,
    FileText,
    Image as ImageIcon,
    Loader2,
    X,
    Sparkles,
    Upload,
    Trash2,
    Edit3,
    Download,
    FileWarning,
} from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function getFileKind(file) {
    const type = (file?.type || file?.mime || file?.mime_type || '').toLowerCase();
    const name = (file?.name || file?.file_name || '').toLowerCase();
    const ext = name.split('.').pop();

    if (
        type.startsWith('image/') ||
        ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
    ) {
        return 'image';
    }

    if (type === 'application/pdf' || ext === 'pdf') {
        return 'pdf';
    }

    if (['doc', 'docx'].includes(ext) || type.includes('word')) {
        return 'doc';
    }

    if (
        ['xls', 'xlsx', 'csv'].includes(ext) ||
        type.includes('sheet') ||
        type.includes('excel')
    ) {
        return 'sheet';
    }

    if (
        ['ppt', 'pptx'].includes(ext) ||
        type.includes('presentation')
    ) {
        return 'slide';
    }

    return 'other';
}

function normalizeHealthFile(file) {
    if (typeof file === 'string') {
        return {
            name: file,
            type: getFileKind({ name: file }),
            url: null,
        };
    }

    if (!file || typeof file !== 'object') return null;

    return {
        ...file,
        name: file.name || file.file_name || 'Document',
        type: getFileKind(file),
        url: file.url || file.signedUrl || file.signed_url || null,
    };
}

function stripFilesForLocalStorage(records) {
    if (!Array.isArray(records)) return records;

    return records.map(record => ({
        ...record,
        files: Array.isArray(record.files)
            ? record.files.map(file => ({
                name: file?.name,
                type: file?.type,
                mime: file?.mime,
            }))
            : record.files,
    }));
}

function safeSetLocalHealth(data) {
    try {
        localStorage.setItem(
            'mindflow_local_health',
            JSON.stringify(stripFilesForLocalStorage(data))
        );
    } catch (error) {
        console.warn('Could not save local health records:', error);
    }
}

// Converts any date-like value to a local YYYY-MM-DD string ('' if invalid).
function toLocalISODate(value) {
    if (!value) return '';
    const str = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const d = new Date(str);
    if (isNaN(d.getTime())) return '';

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function todayISO() {
    return toLocalISODate(new Date());
}

function formatDisplayDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}

function parseFiles(value) {
    if (!value) return [];

    let parsed = value;

    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            parsed = [{ name: parsed }];
        }
    }

    if (!Array.isArray(parsed)) {
        parsed = [parsed];
    }

    return parsed.map(normalizeHealthFile).filter(Boolean);
}

export default function HealthCare() {
    const navigate = useNavigate();

    const {
        user,
        items,
        loading,
        error,
        addItem,
        updateItem,
        deleteItem,
        refetch: fetchAll,
    } = useUser();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRecordId, setEditingRecordId] = useState(null);

    const [doctorName, setDoctorName] = useState('');
    const [reasonForVisit, setReasonForVisit] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fileSizeWarning, setFileSizeWarning] = useState('');

    const [recordDate, setRecordDate] = useState(todayISO());
    const [filterDate, setFilterDate] = useState(''); // empty = all dates

    const [previewFile, setPreviewFile] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isFrameLoading, setIsFrameLoading] = useState(false);

    const [swipedId, setSwipedId] = useState(null);

    const [localRecords, setLocalRecords] = useState(() => {
        try {
            const saved = localStorage.getItem('mindflow_local_health');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Could not read local health records:', error);
            return [];
        }
    });

    const [deletedRecordIds, setDeletedRecordIds] = useState(() => {
        try {
            const saved = localStorage.getItem('mindflow_deleted_health_ids');
            return new Set(saved ? JSON.parse(saved).map(String) : []);
        } catch (error) {
            console.warn('Could not read deleted record IDs:', error);
            return new Set();
        }
    });

    // Backend is the source of truth.
    // Do not merge old temporary local records with server records,
    // because that can create duplicate health records.
    useEffect(() => {
        const rawRecords = Array.isArray(items)
            ? items.filter(item =>
                ['health', 'health & care'].includes(
                    String(item.category || '').toLowerCase()
                )
            )
            : [];

        const formatted = rawRecords
            .filter(item => !deletedRecordIds.has(String(item.id)))
            .map(item => {
                const doc =
                    item.fields?.doctor ||
                    item.fields?.title ||
                    'Dr. Unknown';

                const initials = doc
                    .replace(/^Dr\.\s*/i, '')
                    .split(/\s+/)
                    .filter(Boolean)
                    .map(name => name[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                return {
                    id: item.id,
                    doctor: doc,
                    initials: initials || 'DR',
                    category:
                        item.fields?.category ||
                        'General consultation',
                    description:
                        item.fields?.description ||
                        item.fields?.notes ||
                        '',
                    // Prefer the explicit visit date; fall back to the
                    // creation date (e.g. records added via the Telegram bot).
                    date: toLocalISODate(
                        item.fields?.visit_date ||
                        item.fields?.date ||
                        item.created_at ||
                        item.createdAt
                    ),
                    files: parseFiles(item.fields?.files),
                };
            });

        setLocalRecords(formatted);
        safeSetLocalHealth(formatted);
    }, [items, deletedRecordIds]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow =
            isAddModalOpen || previewFile ? 'hidden' : previousOverflow;

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isAddModalOpen, previewFile]);

    // Reset the iframe's own loading flag every time a new file is opened
    // for preview, so the white flash while the browser fetches/renders
    // the PDF is covered by our spinner instead of showing through.
    useEffect(() => {
        if (previewFile?.type === 'pdf' && previewFile.url) {
            setIsFrameLoading(true);
        } else {
            setIsFrameLoading(false);
        }
    }, [previewFile]);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const maxMb = (
                MAX_FILE_SIZE_BYTES / (1024 * 1024)
            ).toFixed(1);

            const fileMb = (file.size / (1024 * 1024)).toFixed(1);

            setFileSizeWarning(
                `This file is too large (${fileMb}MB). Maximum size is ${maxMb}MB.`
            );

            e.target.value = '';
            setSelectedFile(null);
            return;
        }

        setFileSizeWarning('');

        const fileKind = getFileKind(file);
        setIsReadingFile(true);

        const reader = new FileReader();

        reader.onload = () => {
            setSelectedFile({
                name: file.name,
                type: fileKind,
                mime: file.type,
                url: reader.result,
            });

            setIsReadingFile(false);
        };

        reader.onerror = () => {
            console.error('Could not read selected file.');
            setFileSizeWarning('Could not read this file.');
            setSelectedFile(null);
            setIsReadingFile(false);
        };

        reader.readAsDataURL(file);
    };

    const handleOpenAddModal = () => {
        setEditingRecordId(null);
        setDoctorName('');
        setReasonForVisit('');
        setNotes('');
        setSelectedFile(null);
        setFileSizeWarning('');
        setRecordDate(filterDate || todayISO());
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (record) => {
        setEditingRecordId(record.id);
        setDoctorName(record.doctor || '');
        setReasonForVisit(record.category || '');
        setNotes(record.description || '');
        setSelectedFile(record.files?.[0] || null);
        setFileSizeWarning('');
        setRecordDate(record.date || todayISO());
        setIsAddModalOpen(true);
    };

    const handleSaveRecord = async (e) => {
        e.preventDefault();

        if (!doctorName.trim() || isReadingFile || isSaving) return;

        const email = localStorage.getItem('mindflow_user_email') || '';

        if (!email) {
            alert('User email is missing. Please sign in again.');
            return;
        }

        const formattedDoctor = doctorName.trim().startsWith('Dr.')
            ? doctorName.trim()
            : `Dr. ${doctorName.trim()}`;

        const isNewLocalFile = Boolean(
            selectedFile?.url?.startsWith('data:')
        );

        const backendFilesArray = selectedFile
            ? [{
                name: selectedFile.name,
                type: selectedFile.type,
                mime: selectedFile.mime || '',
            }]
            : [];

        const fields = {
            doctor: formattedDoctor,
            category: reasonForVisit.trim() || 'General consultation',
            description: notes.trim(),
            // Stored as `visit_date` (not `date`) to avoid clashing with a
            // backend field of the same name.
            visit_date: recordDate || todayISO(),
            files: JSON.stringify(backendFilesArray),
        };

        setIsSaving(true);

        try {
            if (editingRecordId) {
                const rawRecord = items.find(
                    item => String(item.id) === String(editingRecordId)
                );

                if (!rawRecord) {
                    throw new Error('Record not found on the server.');
                }

                const result = await updateItem(editingRecordId, {
                    ...rawRecord,
                    fields: {
                        ...rawRecord.fields,
                        ...fields,
                    },
                });

                if (result?.ok === false) {
                    throw new Error(
                        result.error || 'Could not update record.'
                    );
                }

                // Upload a newly selected file for an existing record.
                if (isNewLocalFile) {
                    const dataBase64 = selectedFile.url.split(',')[1];

                    await uploadItemFile(editingRecordId, {
                        telegramId:
                            user?.telegramId ?? user?.telegram_id ?? 0,
                        gmail: email,
                        fileName: selectedFile.name,
                        mimeType:
                            selectedFile.mime ||
                            'application/octet-stream',
                        dataBase64,
                    });
                }
            } else {
                const result = await addItem({
                    telegramId:
                        user?.telegramId ?? user?.telegram_id ?? 0,
                    gmail: email,
                    category: 'health',
                    fields,
                });

                if (!result?.ok) {
                    throw new Error(
                        result?.error || 'Could not create health record.'
                    );
                }

                const createdItem = result.item;
                const targetItemId = createdItem?.id;

                if (!targetItemId) {
                    throw new Error(
                        'The server did not return the new record ID.'
                    );
                }

                if (isNewLocalFile) {
                    const dataBase64 = selectedFile.url.split(',')[1];

                    await uploadItemFile(targetItemId, {
                        telegramId:
                            user?.telegramId ?? user?.telegram_id ?? 0,
                        gmail: email,
                        fileName: selectedFile.name,
                        mimeType:
                            selectedFile.mime ||
                            'application/octet-stream',
                        dataBase64,
                    });
                }
            }

            setIsAddModalOpen(false);
            setEditingRecordId(null);
            setDoctorName('');
            setReasonForVisit('');
            setNotes('');
            setSelectedFile(null);
            setFileSizeWarning('');
            setRecordDate(todayISO());

            await fetchAll(true);
        } catch (err) {
            console.error(
                'Health record save failed:',
                err.response?.data || err.message
            );

            alert(
                err.response?.data?.error ||
                err.message ||
                'Could not save the health record.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    // Delete is optimistic and silent: the record disappears from the UI
    // immediately, and we never alert or log to console even if the
    // backend rejects the request. UserContext.handleDeleteItem already
    // swallows backend errors and always resolves with ok: true, so this
    // just mirrors that removal locally.
    const handleDeleteRecord = async (id) => {
        if (!deleteItem) return;

        const deletedId = String(id);

        setDeletedRecordIds(prev => {
            const updated = new Set(prev);
            updated.add(deletedId);

            try {
                localStorage.setItem(
                    'mindflow_deleted_health_ids',
                    JSON.stringify([...updated])
                );
            } catch {
                // Non-critical — silently ignore.
            }

            return updated;
        });

        setLocalRecords(prev => {
            const updated = prev.filter(
                record => String(record.id) !== deletedId
            );

            safeSetLocalHealth(updated);
            return updated;
        });

        setSwipedId(null);

        // Fire the backend delete in the background; any failure is
        // intentionally ignored (no alert, no console output).
        deleteItem(id).catch(() => { });
    };

    // Fetch the actual file URL from the backend when needed.
    const handlePreviewFile = async (record, file, index) => {
        if (!file || isLoadingPreview) return;

        const normalizedFile = normalizeHealthFile(file);
        if (!normalizedFile) return;

        // Newly selected local files can be previewed directly.
        if (
            normalizedFile.url?.startsWith('data:') ||
            normalizedFile.url?.startsWith('blob:')
        ) {
            setPreviewFile(normalizedFile);
            return;
        }

        const existingUrl =
            normalizedFile.url ||
            normalizedFile.signedUrl ||
            normalizedFile.signed_url;

        if (existingUrl) {
            setPreviewFile({
                ...normalizedFile,
                url: existingUrl,
            });
            return;
        }

        const email = localStorage.getItem('mindflow_user_email') || '';

        if (!email || String(record.id).startsWith('local-')) {
            alert('This file does not have an available URL.');
            return;
        }

        setIsLoadingPreview(true);

        try {
            const response = await getItemFileUrl(
                record.id,
                index,
                email
            );

            const url =
                typeof response === 'string'
                    ? response
                    : response?.url ||
                    response?.signedUrl ||
                    response?.signed_url;

            if (!url) {
                throw new Error('The server did not return a file URL.');
            }

            setPreviewFile({
                ...normalizedFile,
                url,
            });
        } catch (err) {
            console.error(
                'File preview failed:',
                err.response?.data || err.message
            );

            alert(
                err.response?.data?.error ||
                err.message ||
                'Could not open this file.'
            );
        } finally {
            setIsLoadingPreview(false);
        }
    };

    // Records shown in the list: filtered by the selected date (if any).
    const visibleRecords = filterDate
        ? localRecords.filter(r => r.date === filterDate)
        : localRecords;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-rose-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">
                        Loading health records...
                    </span>
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
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                            Health & Care
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Your health records — organized by MindFlow
                        </p>
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
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">
                    {error}
                </div>
            )}

            <div className="mb-4 flex flex-wrap justify-between items-center gap-3 px-1">
                <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">
                    Existing records
                </h2>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-rose-500 transition"
                    />
                    {filterDate && (
                        <button
                            type="button"
                            onClick={() => setFilterDate('')}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
                        >
                            Hamısı
                        </button>
                    )}
                    <span className="text-xs font-medium text-gray-400">
                        {visibleRecords.length} records
                    </span>
                </div>
            </div>

            <div className="space-y-2.5">
                {visibleRecords.length === 0 ? (
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-xs">
                        {filterDate
                            ? 'Bu tarixdə heç bir tibbi qeyd yoxdur.'
                            : 'Hələ ki heç bir tibbi qeyd əlavə olunmayıb. Yuxarıdakı "Add record" düyməsi vasitəsilə və ya Telegram botu ilə əlavə edə bilərsiniz.'}
                    </div>
                ) : (
                    visibleRecords.map(record => (
                        <HealthCard
                            key={record.id}
                            record={record}
                            swipedId={swipedId}
                            setSwipedId={setSwipedId}
                            onDelete={handleDeleteRecord}
                            onEdit={handleOpenEditModal}
                            onPreviewFile={handlePreviewFile}
                        />
                    ))
                )}
            </div>

            {isLoadingPreview && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-150">
                    <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-4 shadow-lg">
                        <Loader2
                            className="animate-spin text-rose-500"
                            size={20}
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Opening file...
                        </span>
                    </div>
                </div>,
                document.body
            )}

            {/* Add / Edit modal */}
            {isAddModalOpen && createPortal(
                <div
                    onClick={() => !isSaving && setIsAddModalOpen(false)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-lg max-h-[85vh] overflow-hidden mf-modal-enter flex flex-col"
                    >
                        <style>{`
                            @keyframes mfOverlayIn {
                                from { opacity: 0 }
                                to { opacity: 1 }
                            }
                            @keyframes mfModalIn {
                                from {
                                    opacity: 0;
                                    transform: translateY(8px) scale(.96)
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0) scale(1)
                                }
                            }
                            .mf-overlay-enter {
                                animation: mfOverlayIn .16s ease-out
                            }
                            .mf-modal-enter {
                                animation: mfModalIn .2s cubic-bezier(.16,1,.3,1)
                            }
                        `}</style>

                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {editingRecordId
                                        ? 'Edit health record'
                                        : 'Add health record'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Keep your health information organized in one place.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => !isSaving && setIsAddModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition flex-shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSaveRecord}
                            className="p-6 space-y-4 overflow-y-auto"
                        >
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Doctor name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={doctorName}
                                    onChange={e => setDoctorName(e.target.value)}
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
                                    onChange={e => setReasonForVisit(e.target.value)}
                                    placeholder="e.g. Annual check-up"
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-rose-500 focus:bg-white transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={recordDate}
                                    onChange={e => setRecordDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-rose-500 focus:bg-white transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
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
                                        {isReadingFile ? (
                                            <Loader2
                                                size={20}
                                                className="text-gray-400 mb-1 animate-spin"
                                            />
                                        ) : (
                                            <Upload
                                                size={20}
                                                className="text-gray-400 mb-1"
                                            />
                                        )}

                                        <p className="text-xs font-medium text-gray-600">
                                            {selectedFile
                                                ? selectedFile.name
                                                : 'Upload a document or image'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            PDF, image or other supported file
                                        </p>
                                    </div>

                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={isSaving}
                                    />
                                </label>

                                {fileSizeWarning && (
                                    <p className="text-[10px] text-red-600 mt-1.5 flex items-center gap-1">
                                        <FileWarning size={12} className="flex-shrink-0" />
                                        {fileSizeWarning}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50/60 p-3 rounded-xl border border-rose-100/50">
                                <Sparkles size={16} className="flex-shrink-0" />
                                <span>
                                    MindFlow will save and organize this health record.
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => !isSaving && setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={isReadingFile || isSaving}
                                    className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-sm transition disabled:opacity-50"
                                >
                                    {isSaving && (
                                        <Loader2 size={14} className="animate-spin" />
                                    )}
                                    {isSaving
                                        ? 'Saving...'
                                        : editingRecordId
                                            ? 'Save changes'
                                            : 'Add record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* File preview modal */}
            {previewFile && createPortal(
                <div
                    onClick={() => setPreviewFile(null)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-2xl max-h-[85vh] overflow-hidden mf-modal-enter flex flex-col"
                    >
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-2 min-w-0 pr-4">
                                {previewFile.type === 'image' ? (
                                    <ImageIcon
                                        size={16}
                                        className="text-emerald-500 flex-shrink-0"
                                    />
                                ) : (
                                    <FileText
                                        size={16}
                                        className="text-rose-500 flex-shrink-0"
                                    />
                                )}

                                <h3 className="text-sm font-bold text-gray-900 truncate">
                                    {previewFile.name || 'Document'}
                                </h3>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                {previewFile.url && (
                                    <a
                                        href={previewFile.url}
                                        download={previewFile.name || 'document'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                                        title="Download"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <Download size={18} />
                                    </a>
                                )}

                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
                            {previewFile.type === 'image' && previewFile.url ? (
                                <img
                                    src={previewFile.url}
                                    alt={previewFile.name}
                                    className="max-w-full max-h-[70vh] rounded-xl object-contain"
                                    onError={() => {
                                        console.error('Image failed to load.');
                                    }}
                                />
                            ) : previewFile.type === 'pdf' && previewFile.url ? (
                                <div className="relative w-full h-[70vh] rounded-xl overflow-hidden border border-gray-100">
                                    {isFrameLoading && (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
                                            <div className="flex items-center gap-2 text-rose-500">
                                                <Loader2
                                                    className="animate-spin"
                                                    size={18}
                                                />
                                                <span className="text-xs font-medium text-gray-500">
                                                    Loading preview...
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <iframe
                                        src={previewFile.url}
                                        title={previewFile.name}
                                        onLoad={() => setIsFrameLoading(false)}
                                        className={`w-full h-full bg-white transition-opacity duration-200 ${isFrameLoading ? 'opacity-0' : 'opacity-100'
                                            }`}
                                    />
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 text-sm py-12 px-6 flex flex-col items-center gap-3">
                                    <FileText size={32} className="text-gray-300" />

                                    {previewFile.url ? (
                                        <>
                                            <p>
                                                {previewFile.type === 'doc' &&
                                                    'Word documents cannot be previewed directly in the browser.'}
                                                {previewFile.type === 'sheet' &&
                                                    'Excel files cannot be previewed directly in the browser.'}
                                                {previewFile.type === 'slide' &&
                                                    'PowerPoint files cannot be previewed directly in the browser.'}
                                                {previewFile.type === 'other' &&
                                                    'This file type cannot be previewed directly in the browser.'}
                                            </p>

                                            <a
                                                href={previewFile.url}
                                                download={previewFile.name || 'document'}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-xl transition"
                                            >
                                                <Download size={14} />
                                                Download and open
                                            </a>
                                        </>
                                    ) : (
                                        <p>
                                            No preview URL is available for this file.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function HealthCard({
    record,
    swipedId,
    setSwipedId,
    onDelete,
    onEdit,
    onPreviewFile,
}) {
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchCurrentX, setTouchCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const isOpen = swipedId === record.id;

    const handleTouchStart = e => {
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchCurrentX(e.targetTouches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = e => {
        if (!isSwiping) return;

        const currentX = e.targetTouches[0].clientX;
        const diff = currentX - touchStartX;

        if (isOpen) {
            if (diff > -80 && diff < 50) {
                setTouchCurrentX(currentX);
            }
        } else if (diff < 0) {
            setTouchCurrentX(currentX);
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
        ? Math.max(
            -80,
            Math.min(
                0,
                isOpen
                    ? -80 + (touchCurrentX - touchStartX)
                    : touchCurrentX - touchStartX
            )
        )
        : isOpen
            ? -80
            : 0;

    const recordFiles = Array.isArray(record.files)
        ? record.files
        : [];

    return (
        <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-4 text-white">
                <button
                    onClick={() => onDelete(record.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center justify-center shadow-sm"
                    title="Delete record"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (isOpen) setSwipedId(null);
                }}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping
                        ? 'none'
                        : 'transform 0.2s ease-out',
                }}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition relative select-none cursor-pointer"
            >
                <div className="flex items-start justify-between gap-4 mb-2 pr-20 sm:pr-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {record.initials || 'DR'}
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                {record.doctor}
                            </h3>
                            <p className="text-xs font-medium text-gray-400 mt-0.5">
                                {record.category}
                                {record.date && ` • ${formatDisplayDate(record.date)}`}
                            </p>
                        </div>
                    </div>
                </div>

                {record.description && (
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4 pl-11">
                        {record.description}
                    </p>
                )}

                {recordFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-11">
                        {recordFiles.map((file, index) => (
                            <button
                                key={`${record.id}-${index}`}
                                type="button"
                                onClick={e => {
                                    e.stopPropagation();
                                    onPreviewFile?.(record, file, index);
                                }}
                                className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-200 transition cursor-pointer"
                                title="View file"
                            >
                                {file?.type === 'image' ? (
                                    <ImageIcon
                                        size={14}
                                        className="text-emerald-500"
                                    />
                                ) : (
                                    <FileText
                                        size={14}
                                        className="text-rose-500"
                                    />
                                )}
                                <span>{file?.name || 'Document'}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="absolute top-5 right-5 hidden sm:flex items-center gap-1">
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            onEdit(record);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Edit record"
                    >
                        <Edit3 size={16} />
                    </button>

                    <button
                        onClick={e => {
                            e.stopPropagation();
                            onDelete(record.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Delete record"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="absolute top-5 right-5 sm:hidden flex items-center gap-1">
                    <button
                        onClick={e => {
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
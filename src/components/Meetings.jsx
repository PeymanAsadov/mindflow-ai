import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { Users, Clock, MapPin, Sparkles, ChevronLeft, Loader2, Plus, X, ArrowRight, User, Link as LinkIcon, Trash2, Edit3, Calendar as CalendarIcon } from 'lucide-react';

export default function Meetings() {
    const navigate = useNavigate();
    const { items, loading, error, addItem, updateItem } = useUser();

    const [selectedTab, setSelectedTab] = useState('Upcoming'); // Upcoming, Past, All
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMeetingId, setEditingMeetingId] = useState(null);

    // Detal baxış üçün state
    const [viewingMeeting, setViewingMeeting] = useState(null);

    // Swipe üçün state (eyni vaxtda yalnız bir görüş kartı açıq ola bilər)
    const [swipedId, setSwipedId] = useState(null);

    // Modal form state-ləri
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [participants, setParticipants] = useState('');
    const [location, setLocation] = useState('');

    const [localMeetings, setLocalMeetings] = useState(() => {
        const saved = localStorage.getItem('mindflow_local_meetings');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const rawMeetings = Array.isArray(items) ? items.filter(i => i.category === 'meetings') : [];
        const formattedMeetings = rawMeetings.map(item => ({
            id: item.id,
            title: item.fields?.title || 'Meeting',
            category: item.fields?.category || 'Work',
            date: item.fields?.date || '',
            time: item.fields?.time || '',
            endTime: item.fields?.endTime || '',
            description: item.fields?.description || '',
            location: item.fields?.location || '—',
            participants: item.fields?.participants || item.fields?.relatedPeople || 'Personal'
        }));

        setLocalMeetings(prev => {
            const localOnly = prev.filter(p => String(p.id).startsWith('local-'));
            const existingIds = new Set(formattedMeetings.map(p => p.id));
            const uniqueLocalOnly = localOnly.filter(p => !existingIds.has(p.id));
            const combined = [...uniqueLocalOnly, ...formattedMeetings];

            localStorage.setItem('mindflow_local_meetings', JSON.stringify(combined));
            return combined;
        });
    }, [items]);

    // Modal açıq olanda arxa fonun scroll-unu dayandır
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = (isAddModalOpen || viewingMeeting) ? 'hidden' : prevOverflow;
        return () => { document.body.style.overflow = prevOverflow; };
    }, [isAddModalOpen, viewingMeeting]);

    const handleOpenAddModal = () => {
        setEditingMeetingId(null);
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setEndTime('');
        setParticipants('');
        setLocation('');
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (meeting) => {
        setEditingMeetingId(meeting.id);
        setTitle(meeting.title);
        setDescription(meeting.description || '');
        setDate(meeting.date || '');
        setTime(meeting.time || '');
        setEndTime(meeting.endTime || '');
        setParticipants(meeting.participants || '');
        setLocation(meeting.location || '');
        setViewingMeeting(null);
        setIsAddModalOpen(true);
    };

    const handleSaveMeeting = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const meetingData = {
            title,
            category: 'Work',
            date,
            time,
            endTime,
            description,
            location: location || '—',
            participants: participants || 'Personal'
        };

        if (editingMeetingId) {
            // Edit etmək (Lokal)
            setLocalMeetings(prev => {
                const updated = prev.map(m => m.id === editingMeetingId ? { ...m, ...meetingData } : m);
                localStorage.setItem('mindflow_local_meetings', JSON.stringify(updated));
                return updated;
            });

            // Backend sync
            try {
                const rawMeetings = Array.isArray(items) ? items.filter(i => i.category === 'meetings') : [];
                const rawRecord = rawMeetings.find(i => i.id === editingMeetingId);
                if (updateItem && rawRecord) {
                    await updateItem(editingMeetingId, {
                        ...rawRecord,
                        fields: { ...rawRecord.fields, ...meetingData }
                    });
                }
            } catch (err) {
                console.warn('Backend update failed, saved locally:', err);
            }
        } else {
            // Yeni yaratmaq (Lokal)
            const newMeeting = {
                id: 'local-' + Date.now(),
                ...meetingData
            };

            setLocalMeetings(prev => {
                const updated = [newMeeting, ...prev];
                localStorage.setItem('mindflow_local_meetings', JSON.stringify(updated));
                return updated;
            });

            // Backend sync
            try {
                if (addItem) {
                    await addItem({
                        category: 'meetings',
                        fields: meetingData
                    });
                }
            } catch (err) {
                console.warn('Backend add failed, saved locally:', err);
            }
        }

        setIsAddModalOpen(false);
        setEditingMeetingId(null);
    };

    // Silmə funksiyası
    const handleDeleteMeeting = (id) => {
        setLocalMeetings(prev => {
            const updated = prev.filter(m => m.id !== id);
            localStorage.setItem('mindflow_local_meetings', JSON.stringify(updated));
            return updated;
        });
        if (swipedId === id) setSwipedId(null);
        if (viewingMeeting?.id === id) setViewingMeeting(null);
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

    const todayMeetings = localMeetings.filter(m => m.date === todayStr);
    const tomorrowMeetings = localMeetings.filter(m => m.date === tomorrowStr);
    const laterMeetings = localMeetings.filter(m => m.date && m.date !== todayStr && m.date !== tomorrowStr);

    const aiSuggestion = localMeetings.length > 0
        ? `Your next meeting is ${todayMeetings[0]?.title || 'scheduled'} at ${todayMeetings[0]?.time || 'soon'}. You have ${localMeetings.length} total meetings synchronized.`
        : 'No meetings found yet. Add meetings via Add meeting or Telegram bot.';

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-purple-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Meetings loading...</span>
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

            {/* Main Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F3EFFE] text-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meetings</h1>
                        <p className="text-xs text-gray-400 mt-0.5">{localMeetings.length} upcoming meetings · synchronized with Telegram bot</p>
                    </div>
                </div>

                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
                >
                    <Plus size={16} />
                    Add meeting
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">{error}</div>
            )}

            {/* AI Suggestion Box */}
            <div className="bg-[#EBFBF0] border border-[#d2f5df] rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-8 shadow-sm">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-2">
                    <Sparkles size={14} />
                    <span>AI suggestion</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{aiSuggestion}</p>
            </div>

            {/* Tabs & View Calendar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
                    {['Upcoming', 'Past', 'All'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setSelectedTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${selectedTab === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/calendar')}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
                >
                    View Calendar <ArrowRight size={14} />
                </button>
            </div>

            {/* Sections */}
            <div className="space-y-8">
                {todayMeetings.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">Today</h2>
                            <span className="text-xs font-medium text-gray-400">{todayMeetings.length} meetings</span>
                        </div>
                        <div className="space-y-2.5">
                            {todayMeetings.map(meeting => (
                                <MeetingCard
                                    key={meeting.id}
                                    meeting={meeting}
                                    swipedId={swipedId}
                                    setSwipedId={setSwipedId}
                                    badgeText="Today"
                                    badgeColor="bg-[#F3EFFE] text-purple-600"
                                    onDelete={handleDeleteMeeting}
                                    onEdit={handleOpenEditModal}
                                    onView={setViewingMeeting}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {tomorrowMeetings.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">Tomorrow</h2>
                            <span className="text-xs font-medium text-gray-400">{tomorrowMeetings.length} meetings</span>
                        </div>
                        <div className="space-y-2.5">
                            {tomorrowMeetings.map(meeting => (
                                <MeetingCard
                                    key={meeting.id}
                                    meeting={meeting}
                                    swipedId={swipedId}
                                    setSwipedId={setSwipedId}
                                    badgeText="Tomorrow"
                                    badgeColor="bg-blue-50 text-blue-600"
                                    onDelete={handleDeleteMeeting}
                                    onEdit={handleOpenEditModal}
                                    onView={setViewingMeeting}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {laterMeetings.length > 0 && (
                    <div>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">Later</h2>
                            <span className="text-xs font-medium text-gray-400">{laterMeetings.length} meetings</span>
                        </div>
                        <div className="space-y-2.5">
                            {laterMeetings.map(meeting => (
                                <MeetingCard
                                    key={meeting.id}
                                    meeting={meeting}
                                    swipedId={swipedId}
                                    setSwipedId={setSwipedId}
                                    badgeText={meeting.date}
                                    badgeColor="bg-gray-100 text-gray-600"
                                    onDelete={handleDeleteMeeting}
                                    onEdit={handleOpenEditModal}
                                    onView={setViewingMeeting}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {localMeetings.length === 0 && (
                    <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-400">Heç bir görüş tapılmadı. Yeni görüş əlavə edin və ya Telegram bot-dan sinxronlaşdırın.</p>
                    </div>
                )}
            </div>

            {/* Detal Baxış Modalı */}
            {viewingMeeting && createPortal(
                <div
                    onClick={() => setViewingMeeting(null)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md p-6 relative mf-modal-enter"
                    >
                        <button
                            onClick={() => setViewingMeeting(null)}
                            className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-[#F3EFFE] text-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                <CalendarIcon size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 pr-8 truncate">{viewingMeeting.title}</h3>
                        </div>

                        <div className="space-y-3.5 text-xs sm:text-sm text-gray-700 mb-6">
                            <div className="flex items-center gap-3">
                                <CalendarIcon size={16} className="text-gray-400 flex-shrink-0" />
                                <span>{viewingMeeting.date || '—'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-gray-400 flex-shrink-0" />
                                <span>{viewingMeeting.time || '—'} {viewingMeeting.endTime ? `- ${viewingMeeting.endTime}` : ''}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <User size={16} className="text-gray-400 flex-shrink-0" />
                                <span>{viewingMeeting.participants || '—'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                                <span className="truncate">{viewingMeeting.location || '—'}</span>
                            </div>
                            {viewingMeeting.description && (
                                <div className="pt-2 border-t border-gray-100 text-gray-500 text-xs leading-relaxed">
                                    {viewingMeeting.description}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setViewingMeeting(null)}
                                className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleOpenEditModal(viewingMeeting)}
                                className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-sm transition"
                            >
                                <Edit3 size={15} />
                                Edit
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add / Edit Meeting Modal */}
            {isAddModalOpen && createPortal(
                <div
                    onClick={() => setIsAddModalOpen(false)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden mf-modal-enter"
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

                        <div className="flex justify-between items-center px-6 pt-6 pb-2">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {editingMeetingId ? 'Edit meeting' : 'Add meeting'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {editingMeetingId ? 'Update your meeting details.' : 'Add a meeting to your schedule.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMeeting} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Meeting name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Product planning meeting"
                                    className="w-full px-3.5 py-3 text-xs sm:text-sm bg-gray-50/60 border border-gray-200/80 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add details, agenda or context for this meeting..."
                                    rows={3}
                                    className="w-full px-3.5 py-3 text-xs sm:text-sm bg-gray-50/60 border border-gray-200/80 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3.5 py-3 text-xs sm:text-sm bg-gray-50/60 border border-gray-200/80 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition text-gray-700"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Start time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full px-3.5 py-3 text-xs sm:text-sm bg-gray-50/60 border border-gray-200/80 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition text-gray-700"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">End time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-3.5 py-3 text-xs sm:text-sm bg-gray-50/60 border border-gray-200/80 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition text-gray-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Participants</label>
                                <div className="relative flex items-center">
                                    <User size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={participants}
                                        onChange={(e) => setParticipants(e.target.value)}
                                        placeholder="Add people"
                                        className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-gray-50/60 border border-gray-200/80 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Location or meeting link <span className="text-red-500">*</span>
                                </label>
                                <div className="relative flex items-center">
                                    <LinkIcon size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Enter a location or paste a meeting link"
                                        className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-gray-50/60 border border-gray-200/80 rounded-2xl outline-none focus:border-purple-500 focus:bg-white transition"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-[11px] text-gray-500 flex items-center gap-2">
                                <Sparkles size={14} className="text-purple-600 flex-shrink-0" />
                                <span>Meeting category (Work, Health, Personal) is configured and synchronized via Telegram bot.</span>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-2xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-2xl shadow-sm transition"
                                >
                                    {editingMeetingId ? 'Save changes' : 'Add meeting'}
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

function MeetingCard({ meeting, swipedId, setSwipedId, badgeText, badgeColor, onDelete, onEdit, onView }) {
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchCurrentX, setTouchCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const isOpen = swipedId === meeting.id;

    const getCategoryStyle = (cat) => {
        switch ((cat || '').toLowerCase()) {
            case 'health':
                return 'bg-emerald-50 text-emerald-700';
            case 'personal':
                return 'bg-amber-50 text-amber-700';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const handleTouchStart = (e) => {
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchCurrentX(e.targetTouches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!isSwiping) return;
        setTouchCurrentX(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!isSwiping) return;
        setIsSwiping(false);
        const diff = touchCurrentX - touchStartX;

        if (!isOpen && diff < -40) {
            setSwipedId(meeting.id);
        } else if (isOpen && diff > 30) {
            setSwipedId(null);
        }
    };

    const diff = isSwiping ? touchCurrentX - touchStartX : 0;
    let translateX = isOpen ? -80 : 0;
    if (isSwiping) {
        translateX = Math.max(-80, Math.min(0, isOpen ? -80 + diff : diff));
    }

    return (
        <div className="relative overflow-hidden rounded-2xl mb-2.5">
            {/* Arxa fondakı zibil qabı düyməsi */}
            <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-4 text-white">
                <button
                    onClick={() => onDelete(meeting.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center justify-center shadow-sm"
                    title="Delete meeting"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Əsas görüş kartı */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (isOpen) {
                        setSwipedId(null);
                    } else {
                        onView(meeting);
                    }
                }}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex items-center justify-between gap-4 relative select-none cursor-pointer"
            >
                <div className="flex flex-col gap-1.5 min-w-0 pr-20 sm:pr-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{meeting.title}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${getCategoryStyle(meeting.category)}`}>
                            {meeting.category || 'Work'}
                        </span>
                    </div>

                    <p className="text-xs text-gray-400 font-medium">
                        {meeting.date || 'Today'} {meeting.time ? `· ${meeting.time}` : ''} {meeting.endTime ? `- ${meeting.endTime}` : ''}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-0.5">
                        <div className="flex items-center gap-1">
                            <Users size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{meeting.participants || 'Personal'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{meeting.location || '—'}</span>
                        </div>
                    </div>
                </div>

                <div className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-xl ${badgeColor}`}>
                        {badgeText}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(meeting);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Edit meeting"
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(meeting.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition hidden sm:inline-flex"
                        title="Delete meeting"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
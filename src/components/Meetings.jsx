import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { Users, Clock, MapPin, Sparkles, ChevronLeft, Loader2 } from 'lucide-react';

function groupByDate(meetings) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const todayMeetings    = meetings.filter(m => m.date === todayStr);
    const tomorrowMeetings = meetings.filter(m => m.date === tomorrowStr);
    const upcomingMeetings = meetings.filter(m => m.date !== todayStr && m.date !== tomorrowStr);

    const sections = [];
    if (todayMeetings.length > 0 || meetings.length === 0) {
        sections.push({ title: 'Today',    count: `${todayMeetings.length} meetings`,    meetings: todayMeetings });
    }
    if (tomorrowMeetings.length > 0) {
        sections.push({ title: 'Tomorrow', count: `${tomorrowMeetings.length} meetings`, meetings: tomorrowMeetings });
    }
    if (upcomingMeetings.length > 0) {
        sections.push({ title: 'Upcoming', count: `${upcomingMeetings.length} meetings`, meetings: upcomingMeetings });
    }
    if (sections.length === 0) {
        sections.push({ title: 'Today', count: '0 meetings', meetings: [] });
    }
    return sections;
}

export default function Meetings() {
    const navigate = useNavigate();
    const { items, loading, error } = useUser();

    const rawMeetings = Array.isArray(items) ? items.filter(i => i.category === 'meetings') : [];

    const mapped = rawMeetings.map(item => ({
        id:          item.id,
        title:       item.fields?.title       || 'Meeting',
        date:        item.fields?.date        || '',
        time:        item.fields?.time        || '',
        description: item.fields?.description || '',
        location:    item.fields?.location    || '—',
    }));

    const meetingSections = groupByDate(mapped);

    const aiSuggestion = mapped.length > 0
        ? `Telegram botundan ${mapped.length} görüş sinxronlaşdırıldı.`
        : 'Hələ heç bir görüş yoxdur. Telegram bot vasitəsilə görüş əlavə edin.';

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-purple-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Görüşlər yüklənir...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-10 w-full max-w-5xl mx-auto">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-4 transition"
            >
                <ChevronLeft size={16} />
                Dashboard
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F3EFFE] text-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Meetings</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Dinamik olaraq yenilənir - MindFlow</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">{error}</div>
            )}

            <div className="bg-[#EBFBF0] border border-[#d2f5df] rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-8 sm:mb-10 shadow-sm">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-2">
                    <Sparkles size={14} />
                    <span>AI suggestion</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{aiSuggestion}</p>
            </div>

            <div className="space-y-8 sm:space-y-10">
                {meetingSections.map((section, sIndex) => (
                    <div key={sIndex}>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">{section.title}</h2>
                            <span className="text-xs font-medium text-gray-400">{section.count}</span>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            {section.meetings.length === 0 ? (
                                <p className="p-4 text-xs text-gray-400">Heç bir görüş tapılmadı.</p>
                            ) : (
                                section.meetings.map((meeting, mIndex) => (
                                    <div
                                        key={meeting.id}
                                        className={`p-4 sm:p-6 transition hover:bg-gray-50/50 ${mIndex !== section.meetings.length - 1 ? 'border-b border-gray-100' : ''}`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2">
                                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">{meeting.title}</h3>
                                            <span className="text-xs font-medium text-gray-400 flex items-center gap-1 flex-shrink-0">
                                                <Clock size={13} />
                                                {meeting.date}{meeting.time ? ' · ' + meeting.time : ''}
                                            </span>
                                        </div>

                                        {meeting.description && (
                                            <p className="text-xs text-gray-500 leading-relaxed mb-4">{meeting.description}</p>
                                        )}

                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                            <MapPin size={13} className="text-emerald-500 flex-shrink-0" />
                                            <span className="truncate">{meeting.location}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
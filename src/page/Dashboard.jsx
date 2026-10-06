import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import natureImage from "../images/nature.png";
import {
    TASK_CATEGORIES,
    HEALTH_CATEGORIES,
    categoryIn,
    countMerged,
    getDeletedIds,
} from '../utils/memoryStore';
import {
    CheckSquare,
    Briefcase,
    Users,
    FileText,
    HeartPulse,
    Sparkles,
    Loader2,
    Paperclip,
    ArrowUp,
    Edit2,
    Check
} from 'lucide-react';

function formatToday() {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

function buildSummary(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return {
            title: 'Good morning!',
            description: 'No items yet. To get started, send a task to MindFlow via Telegram.',
            badge: null,
            badgeText: null,
        };
    }

    const todos = items.filter(i => categoryIn(i, TASK_CATEGORIES));
    const latestTodo = todos[0];
    const totalCount = items.length;

    let description = `You have ${totalCount} items synchronized from Telegram.`;
    if (latestTodo) {
        const d = latestTodo.fields?.date || '';
        const t = latestTodo.fields?.time || '';
        const title = latestTodo.fields?.title || latestTodo.fields?.description || 'Task';
        description += `\nLatest Task: ${title}${d ? ` (Due: ${d}${t ? ', ' + t : ''})` : ''}.`;
    }

    return {
        title: 'Good morning!',
        description,
        badge: latestTodo ? (latestTodo.fields?.title || latestTodo.fields?.description || 'Task').toUpperCase() : null,
        badgeText: latestTodo
            ? `Scheduled for ${latestTodo.fields?.date || ''} ${latestTodo.fields?.time ? 'at ' + latestTodo.fields.time : ''} (Added via Telegram Bot).`
            : null,
    };
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, items, loading, error, updateUser } = useUser();
    const [currentDate, setCurrentDate] = useState(formatToday());

    // Profile Editing
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editFirstName, setEditFirstName] = useState('');

    const handleEditProfile = () => {
        setEditFirstName(user?.firstName || '');
        setIsEditingProfile(true);
    };

    const handleSaveProfile = async () => {
        if (updateUser) {
            await updateUser({ firstName: editFirstName, lastName: user?.lastName || '' });
        }
        setIsEditingProfile(false);
    };

    // Ask Mind states
    const [question, setQuestion] = useState('');
    const [askLoading, setAskLoading] = useState(false);
    const [askAnswer, setAskAnswer] = useState(null);
    const [askError, setAskError] = useState(null);

    // Bumped whenever localStorage data changes, so counts are recomputed.
    const [dataVersion, setDataVersion] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setCurrentDate(formatToday()), 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const bump = () => setDataVersion(v => v + 1);

        window.addEventListener('storage', bump);
        window.addEventListener('focus', bump);
        window.addEventListener('mindflow:data-changed', bump);

        return () => {
            window.removeEventListener('storage', bump);
            window.removeEventListener('focus', bump);
            window.removeEventListener('mindflow:data-changed', bump);
        };
    }, []);

    // Everything below is derived from `items` + localStorage, minus deleted ids.
    const { visibleItems, todos, memoryCounts } = useMemo(() => {
        const deleted = getDeletedIds();
        const safeItems = (Array.isArray(items) ? items : []).filter(
            i => !deleted.has(String(i.id))
        );

        const todoItems = safeItems.filter(i => categoryIn(i, TASK_CATEGORIES));
        const projectItems = safeItems.filter(i => categoryIn(i, ['projects']));
        const meetingItems = safeItems.filter(i => categoryIn(i, ['meetings']));
        const noteItems = safeItems.filter(i => categoryIn(i, ['notes']));
        const healthItems = safeItems.filter(i => categoryIn(i, HEALTH_CATEGORIES));

        return {
            visibleItems: safeItems,
            todos: todoItems,
            memoryCounts: {
                // only open (not completed) tasks
                tasks: countMerged(
                    todoItems,
                    'mindflow_local_tasks',
                    i => !i.fields?.completed,
                    i => !i.completed
                ),
                // only active projects
                projects: countMerged(
                    projectItems,
                    'mindflow_local_projects',
                    i => (i.fields?.status || 'Active') === 'Active',
                    i => (i.status || 'Active') === 'Active'
                ),
                meetings: countMerged(meetingItems, 'mindflow_local_meetings'),
                notes: countMerged(noteItems, 'mindflow_local_notes'),
                health: countMerged(healthItems, 'mindflow_local_health'),
            },
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, dataVersion]);

    const firstName = user?.firstName || user?.username || '';
    const summary = buildSummary(visibleItems);

    const todayStr = new Date().toISOString().split('T')[0];
    const urgentTodosCount = todos.filter(
        i => !i.fields?.completed && (i.fields?.date === todayStr || i.fields?.isUrgent)
    ).length;

    const handleAskSubmit = async (queryText) => {
        const textToAsk = queryText || question;
        if (!textToAsk.trim()) return;

        setAskLoading(true);
        setAskError(null);
        setAskAnswer(null);

        try {
            const gmail =
                user?.gmail ||
                localStorage.getItem('mindflow_user_email') ||
                '';

            const telegramId = Number(user?.telegramId || 0);

            const response = await fetch(
                'https://backend-production-4d2a.up.railway.app/api/assistant/ask',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        telegramId,
                        gmail,
                        question: textToAsk,
                    }),
                }
            );

            const data = await response.json();
            if (response.ok && data.ok) {
                setAskAnswer(data.answer);
                setQuestion('');
            } else {
                setAskError(data.error || 'An error occurred while answering the question.');
            }
        } catch (err) {
            setAskError('Unable to connect to the server.');
        } finally {
            setAskLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2" style={{ color: '#1E7A5E' }}>
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-10 w-full bg-gray-50/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        {isEditingProfile ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xl md:text-2xl font-bold text-gray-900">👋 Good morning,</span>
                                <input
                                    value={editFirstName}
                                    onChange={(e) => setEditFirstName(e.target.value)}
                                    className="text-xl md:text-2xl font-bold text-gray-900 w-32 border border-gray-200 rounded px-1.5 outline-none focus:border-emerald-500"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900">👋 Good morning{firstName ? `, ${firstName}` : '!'}</h1>
                        )}
                        <button
                            onClick={isEditingProfile ? handleSaveProfile : handleEditProfile}
                            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isEditingProfile ? 'bg-[#1E7A5E]/10' : 'text-gray-400 hover:bg-gray-50'}`}
                            style={isEditingProfile ? { color: '#1E7A5E' } : {}}
                            title={isEditingProfile ? "Save name" : "Edit name"}
                        >
                            {isEditingProfile ? <Check size={18} /> : <Edit2 size={18} />}
                        </button>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Here are the key highlights for today.</p>
                </div>
                <div className="text-xs md:text-sm font-medium text-gray-400">
                    {currentDate}
                </div>
            </div>

            {/* Error state is handled gracefully — no banner shown to user */}

            {/* AI Daily Summary */}
            <div className="rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm relative mb-6 md:mb-8" style={{ backgroundColor: '#F4F2F8' }}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm" style={{ color: '#1E7A5E' }}>
                        <Sparkles size={16} />
                        <span>AI Gündəlik Xülasəsi</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold" style={{ backgroundColor: '#1E7A5E18', color: '#1E7A5E' }}>
                        <Sparkles size={12} />
                        <span>MindFlow AI tərəfindən yaradılıb</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 md:gap-8">
                    <div className="flex-1 w-full">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{summary.title}</h3>
                        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line mb-6">
                            {summary.description}
                        </p>

                        {summary.badge && (
                            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white text-gray-500 flex items-center justify-center shadow-sm flex-shrink-0 border border-gray-100">
                                    <Sparkles size={16} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">{summary.badge}</span>
                                    <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{summary.badgeText}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full lg:w-80 flex-shrink-0">
                        <img
                            src={natureImage}
                            alt="Nature Illustration"
                            className="w-full h-36 sm:h-44 lg:h-48 object-cover rounded-2xl shadow-sm border border-gray-100"
                        />
                    </div>
                </div>
            </div>

            {/* Memory Categories  */}
            <div className="mb-10">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Your Memory</h3>
                <p className="text-[11px] sm:text-xs text-gray-400 mb-4 sm:mb-6">Everything MindFlow has organized for you.</p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* To Do List  */}
                    <div
                        onClick={() => navigate('/todo')}
                        className="group md:col-span-5 bg-[#EBFBF0] rounded-3xl p-6 md:p-8 hover:shadow-md transition cursor-pointer flex flex-col justify-between h-44 md:h-52 border-2 border-transparent hover:border-[#1E7A5E]/30"
                    >
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm" style={{ color: '#1E7A5E' }}>
                            <CheckSquare size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-[#1E7A5E] transition-colors text-base md:text-lg mb-1">To Do List</h4>
                            <p className="text-xs text-gray-500">{memoryCounts.tasks} active tasks</p>
                            {urgentTodosCount > 0 && (
                                <p className="text-[11px] text-rose-500 mt-0.5">{urgentTodosCount} due today</p>
                            )}
                        </div>
                    </div>

                    {/* Projects (Orta - 4 sütun) */}
                    <div
                        onClick={() => navigate('/projects')}
                        className="group md:col-span-4 bg-[#EDF4FF] rounded-3xl p-6 md:p-8 hover:shadow-md transition cursor-pointer flex flex-col justify-between h-44 md:h-52 border-2 border-transparent hover:border-blue-300/60"
                    >
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-sm">
                            <Briefcase size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors text-base md:text-lg mb-1">Projects</h4>
                            <p className="text-xs text-gray-500">{memoryCounts.projects} active projects</p>
                        </div>
                    </div>

                    {/* Health & Care (Dar - 3 sütun) */}
                    <div
                        onClick={() => navigate('/healthcare')}
                        className="group md:col-span-3 bg-[#FFF1F2] rounded-3xl p-6 md:p-8 hover:shadow-md transition cursor-pointer flex flex-col justify-between h-44 md:h-52 border-2 border-transparent hover:border-rose-300/60"
                    >
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-white text-rose-500 flex items-center justify-center shadow-sm">
                            <HeartPulse size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors text-base md:text-lg mb-1">Health & Care</h4>
                            <p className="text-xs text-gray-500">{memoryCounts.health} health records</p>
                        </div>
                    </div>

                    {/* Meetings (Geniş - 6 sütun, aşağı sətir) */}
                    <div
                        onClick={() => navigate('/meetings')}
                        className="group md:col-span-6 bg-[#F3EFFE] rounded-3xl p-6 md:p-8 hover:shadow-md transition cursor-pointer flex flex-col justify-between h-44 md:h-52 border-2 border-transparent hover:border-purple-300/60"
                    >
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-white text-purple-600 flex items-center justify-center shadow-sm">
                            <Users size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-purple-700 transition-colors text-base md:text-lg mb-1">Meetings</h4>
                            <p className="text-xs text-gray-500">{memoryCounts.meetings} upcoming</p>
                        </div>
                    </div>

                    {/* Notes (Geniş - 6 sütun, aşağı sətir) */}
                    <div
                        onClick={() => navigate('/notes')}
                        className="group md:col-span-6 bg-[#FFFAEC] rounded-3xl p-6 md:p-8 hover:shadow-md transition cursor-pointer flex flex-col justify-between h-44 md:h-52 border-2 border-transparent hover:border-amber-300/60"
                    >
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-white text-amber-500 flex items-center justify-center shadow-sm">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors text-base md:text-lg mb-1">Notes</h4>
                            <p className="text-xs text-gray-500">{memoryCounts.notes} notes</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ask Mind Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-10">
                <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Ask Mind</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Search and chat with your personal memory.</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-3 sm:p-4 border border-gray-100 mb-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAskSubmit()}
                            placeholder="Ask about your tasks, meetings, projects, or notes..."
                            className="w-full bg-transparent text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
                        />
                        <button className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                            <Paperclip size={18} />
                        </button>
                        <button
                            onClick={() => handleAskSubmit()}
                            disabled={askLoading}
                            className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition flex-shrink-0 disabled:opacity-50"
                        >
                            {askLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
                        </button>
                    </div>
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {[
                        'When is my next doctor appointment?',
                        'What did I write about the startup idea?',
                        'Which tasks did I postpone this week?',
                        'When was my last meeting with Kamran?'
                    ].map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setQuestion(suggestion);
                                handleAskSubmit(suggestion);
                            }}
                            className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 transition"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>

                {/* Error Message */}
                {askError && (
                    <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4">
                        {askError}
                    </div>
                )}

                {/* AI Answer Block */}
                {askAnswer && (
                    <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-3 animate-fadeIn">
                        <div className="flex items-center gap-2 font-semibold text-xs" style={{ color: '#1E7A5E' }}>
                            <Sparkles size={16} />
                            <span>MindFlow</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                            {askAnswer}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
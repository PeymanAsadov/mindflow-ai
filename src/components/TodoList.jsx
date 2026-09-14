    import React, { useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { useUser } from '../UserContext';
    import {
        CheckSquare,
        Sparkles,
        ArrowLeft,
        Circle,
        CheckCircle2,
        Loader2
    } from 'lucide-react';

    export default function TodoList() {
        const navigate = useNavigate();
        const { items, loading, error } = useUser();
        const [checked, setChecked] = useState({});

        const rawTodos = Array.isArray(items) ? items.filter(i => i.category === 'todo') : [];

        const tasks = rawTodos.map(item => ({
            id: item.id,
            title: item.fields?.title || item.fields?.description || 'Tapşırıq',
            dueDate: item.fields?.date
                ? `${item.fields.date}${item.fields.time ? ' ' + item.fields.time : ''}`
                : 'No date',
        }));

        const toggleTask = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

        const openTasksCount = tasks.filter(t => !checked[t.id]).length;

        if (loading) {
            return (
                <div className="flex-1 flex items-center justify-center bg-[#F8F9FC] h-full">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="text-sm font-medium">Tapşırıqlar yüklənir...</span>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-[#F8F9FC] w-full">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
                >
                    <ArrowLeft size={16} />
                    <span>Dashboard</span>
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <CheckSquare size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">To Do List</h1>
                        <p className="text-xs text-gray-400">{openTasksCount} open tasks · organized by MindFlow</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">
                        {error}
                    </div>
                )}

                <div className="bg-[#EBFBF0] border border-emerald-100 rounded-2xl p-4 mb-6 sm:mb-8 flex items-start gap-3">
                    <Sparkles size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">AI suggestion</h4>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                            Telegram botundan gələn məlumatlar dinamik olaraq yenilənir.
                        </p>
                    </div>
                </div>

                <div className="mb-6 sm:mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900">All Tasks</h3>
                        <span className="text-xs text-gray-400">{tasks.length} tasks</span>
                    </div>
                    <div className="space-y-3">
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => toggleTask(task.id)}
                                className={`bg-white border border-gray-100 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:shadow-sm transition gap-3 ${checked[task.id] ? 'opacity-60 bg-gray-50/50' : ''}`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <button className="text-gray-400 hover:text-emerald-600 transition flex-shrink-0">
                                        {checked[task.id] ? (
                                            <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-50" />
                                        ) : (
                                            <Circle size={20} />
                                        )}
                                    </button>
                                    <span className={`text-xs sm:text-sm font-medium truncate ${checked[task.id] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {task.title}
                                    </span>
                                </div>
                                <span className={`text-[11px] sm:text-xs flex-shrink-0 ${checked[task.id] ? 'text-gray-300' : 'text-gray-400'}`}>
                                    {task.dueDate}
                                </span>
                            </div>
                        ))}
                        {tasks.length === 0 && (
                            <p className="text-xs text-gray-400 py-2">Heç bir tapşırıq tapılmadı.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }
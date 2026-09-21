import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { ChevronLeft, CheckSquare, Sparkles, Plus, X, Trash2, Edit3, Calendar, Clock } from 'lucide-react';

export default function ToDoList() {
    const navigate = useNavigate();
    const { items, loading, error, addItem, updateItem } = useUser();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);

    // Detal baxış üçün state
    const [viewingTask, setViewingTask] = useState(null);

    // Swipe üçün ümumi state (eyni vaxtda yalnız bir tapşırıq kartı açıq ola bilər)
    const [swipedId, setSwipedId] = useState(null);

    // Form state-ləri
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Work'); // Work / Personal
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [deadline, setDeadline] = useState('');
    const [priority, setPriority] = useState('Medium'); // Low, Medium, High

    const [localTasks, setLocalTasks] = useState(() => {
        const saved = localStorage.getItem('mindflow_local_tasks');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const rawTasks = Array.isArray(items) ? items.filter(i => i.category === 'tasks') : [];
        const formattedTasks = rawTasks.map(item => ({
            id: item.id,
            title: item.fields?.title || 'Task',
            description: item.fields?.description || '',
            tag: item.fields?.tag || 'Work',
            date: item.fields?.date || '',
            time: item.fields?.time || '',
            deadline: item.fields?.deadline || '',
            priority: item.fields?.priority || 'Medium',
            completed: item.fields?.completed || false,
            section: item.fields?.section || determineSection(item.fields?.date)
        }));

        setLocalTasks(prev => {
            const localOnly = prev.filter(t => String(t.id).startsWith('local-'));
            const existingIds = new Set(formattedTasks.map(t => t.id));
            const uniqueLocalOnly = localOnly.filter(t => !existingIds.has(t.id));
            const combined = [...uniqueLocalOnly, ...formattedTasks];

            localStorage.setItem('mindflow_local_tasks', JSON.stringify(combined));
            return combined;
        });
    }, [items]);

    // Modal açıq olanda arxa fonun scroll-unu dayandır
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = (isAddModalOpen || viewingTask) ? 'hidden' : prevOverflow;
        return () => { document.body.style.overflow = prevOverflow; };
    }, [isAddModalOpen, viewingTask]);

    const determineSection = (taskDateStr) => {
        if (!taskDateStr) return 'Later';
        const today = new Date().toISOString().split('T')[0];
        if (taskDateStr === today) return 'Today';

        const tDate = new Date(taskDateStr);
        const now = new Date();
        const diffDays = Math.ceil((tDate - now) / (1000 * 60 * 60 * 24));

        if (diffDays <= 3 && diffDays >= 0) return 'Upcoming';
        return 'Later';
    };

    const handleOpenAddModal = () => {
        setEditingTaskId(null);
        setTitle('');
        setDescription('');
        setCategory('Work');
        setDate('');
        setTime('');
        setDeadline('');
        setPriority('Medium');
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (task) => {
        setEditingTaskId(task.id);
        setTitle(task.title);
        setDescription(task.description || '');
        setCategory(task.tag || 'Work');
        setDate(task.date || '');
        setTime(task.time || '');
        setDeadline(task.deadline || '');
        setPriority(task.priority || 'Medium');
        setViewingTask(null); // Detal modalını bağla
        setIsAddModalOpen(true);
    };

    const handleSaveTask = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const calculatedSection = determineSection(date || deadline);

        const taskData = {
            title,
            description,
            tag: category,
            date,
            time,
            deadline,
            priority,
            completed: false,
            section: calculatedSection
        };

        if (editingTaskId) {
            // Edit etmək (Lokal)
            setLocalTasks(prev => {
                const updated = prev.map(t => t.id === editingTaskId ? { ...t, ...taskData } : t);
                localStorage.setItem('mindflow_local_tasks', JSON.stringify(updated));
                return updated;
            });

            // Backend sync
            try {
                const rawTasks = Array.isArray(items) ? items.filter(i => i.category === 'tasks') : [];
                const rawTask = rawTasks.find(i => i.id === editingTaskId);
                if (updateItem && rawTask) {
                    await updateItem(editingTaskId, {
                        ...rawTask,
                        fields: { ...rawTask.fields, ...taskData }
                    });
                }
            } catch (err) {
                console.warn('Backend update failed, saved locally:', err);
            }
        } else {
            // Yeni yaratmaq (Lokal)
            const newTask = {
                id: 'local-' + Date.now(),
                ...taskData
            };

            setLocalTasks(prev => {
                const updated = [newTask, ...prev];
                localStorage.setItem('mindflow_local_tasks', JSON.stringify(updated));
                return updated;
            });

            // Backend sync
            try {
                if (addItem) {
                    await addItem({
                        category: 'tasks',
                        fields: taskData
                    });
                }
            } catch (err) {
                console.warn('Backend add failed, saved locally:', err);
            }
        }

        setIsAddModalOpen(false);
        setEditingTaskId(null);
    };

    const toggleComplete = async (id) => {
        setLocalTasks(prev => {
            const updated = prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
            localStorage.setItem('mindflow_local_tasks', JSON.stringify(updated));
            return updated;
        });

        try {
            const rawTasks = Array.isArray(items) ? items.filter(i => i.category === 'tasks') : [];
            const rawTask = rawTasks.find(i => i.id === id);
            if (updateItem && rawTask) {
                await updateItem(id, {
                    ...rawTask,
                    fields: { ...rawTask.fields, completed: !rawTask.fields.completed }
                });
            }
        } catch (err) {
            console.warn('Backend toggle failed:', err);
        }
    };

    const deleteTask = (id) => {
        setLocalTasks(prev => {
            const updated = prev.filter(t => t.id !== id);
            localStorage.setItem('mindflow_local_tasks', JSON.stringify(updated));
            return updated;
        });
        if (swipedId === id) setSwipedId(null);
        if (viewingTask?.id === id) setViewingTask(null);
    };

    const openTasksCount = localTasks.filter(t => !t.completed).length;

    const todayTasks = localTasks.filter(t => t.section === 'Today');
    const upcomingTasks = localTasks.filter(t => t.section === 'Upcoming');
    const laterTasks = localTasks.filter(t => t.section === 'Later');

    const getPriorityBadgeClass = (p) => {
        switch (p?.toLowerCase()) {
            case 'high': return 'bg-red-50 text-red-500 border border-red-100';
            case 'medium': return 'bg-gray-100 text-gray-500';
            case 'low': return 'bg-gray-50 text-gray-400';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-10 w-full max-w-5xl mx-auto relative overflow-hidden">
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-4 transition"
            >
                <ChevronLeft size={16} />
                Dashboard
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <CheckSquare size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">To Do List</h1>
                        <p className="text-xs text-gray-400 mt-0.5">{openTasksCount} open tasks · organized by MindFlow</p>
                    </div>
                </div>

                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
                >
                    <Plus size={16} />
                    Add task
                </button>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-2xl p-4 mb-8 flex gap-3 items-start">
                <Sparkles size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-bold text-emerald-900">AI suggestion</p>
                    <p className="text-xs text-emerald-700/80 mt-0.5">
                        Start with the high-priority items due today to keep your schedule on track.
                    </p>
                </div>
            </div>

            {todayTasks.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Today</h2>
                        <span className="text-xs font-medium text-gray-400">{todayTasks.length} tasks</span>
                    </div>
                    <div className="space-y-2.5">
                        {todayTasks.map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                swipedId={swipedId}
                                setSwipedId={setSwipedId}
                                onToggle={toggleComplete}
                                onDelete={deleteTask}
                                onEdit={handleOpenEditModal}
                                onView={setViewingTask}
                                badgeClass={getPriorityBadgeClass}
                            />
                        ))}
                    </div>
                </div>
            )}

            {upcomingTasks.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Upcoming</h2>
                        <span className="text-xs font-medium text-gray-400">{upcomingTasks.length} tasks</span>
                    </div>
                    <div className="space-y-2.5">
                        {upcomingTasks.map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                swipedId={swipedId}
                                setSwipedId={setSwipedId}
                                onToggle={toggleComplete}
                                onDelete={deleteTask}
                                onEdit={handleOpenEditModal}
                                onView={setViewingTask}
                                badgeClass={getPriorityBadgeClass}
                            />
                        ))}
                    </div>
                </div>
            )}

            {laterTasks.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Later</h2>
                        <span className="text-xs font-medium text-gray-400">{laterTasks.length} tasks</span>
                    </div>
                    <div className="space-y-2.5">
                        {laterTasks.map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                swipedId={swipedId}
                                setSwipedId={setSwipedId}
                                onToggle={toggleComplete}
                                onDelete={deleteTask}
                                onEdit={handleOpenEditModal}
                                onView={setViewingTask}
                                badgeClass={getPriorityBadgeClass}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Detal Baxış Modalı */}
            {viewingTask && createPortal(
                <div
                    onClick={() => setViewingTask(null)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md p-6 relative mf-modal-enter"
                    >
                        <button
                            onClick={() => setViewingTask(null)}
                            className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                <CheckSquare size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 pr-6 truncate">{viewingTask.title}</h3>
                                <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                    {viewingTask.tag || 'Work'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3.5 text-xs sm:text-sm text-gray-700 mb-6">
                            {viewingTask.description && (
                                <div className="text-gray-600 text-xs leading-relaxed bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                                    {viewingTask.description}
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                                <span>{viewingTask.date ? `Date: ${viewingTask.date}` : (viewingTask.deadline ? `Deadline: ${viewingTask.deadline}` : 'No date')}</span>
                            </div>
                            {viewingTask.time && (
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-gray-400 flex-shrink-0" />
                                    <span>Time: {viewingTask.time}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setViewingTask(null)}
                                className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleOpenEditModal(viewingTask)}
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

            {/* Add / Edit Task Modal */}
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

                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {editingTaskId ? 'Edit task' : 'Add task'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {editingTaskId ? 'Update your task details' : 'Add something to your to-do list.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTask} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Task name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Finalize landing page copy"
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add more details about this task..."
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                                <div className="flex items-center gap-2">
                                    {['Personal', 'Work'].map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategory(cat)}
                                            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${category === cat
                                                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Time</label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Deadline</label>
                                <input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">MindFlow will remind you before the deadline.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Priority</label>
                                <div className="flex items-center gap-2">
                                    {['Low', 'Medium', 'High'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPriority(p)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${priority === p
                                                ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/50">
                                <Sparkles size={16} className="flex-shrink-0" />
                                <span>MindFlow will organize this task and sync it with your calendar.</span>
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
                                    {editingTaskId ? 'Save changes' : 'Add task'}
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

function TaskItem({ task, swipedId, setSwipedId, onToggle, onDelete, onEdit, onView, badgeClass }) {
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchCurrentX, setTouchCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const isOpen = swipedId === task.id;

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
            setSwipedId(task.id);
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
                    onClick={() => onDelete(task.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center justify-center shadow-sm"
                    title="Delete task"
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
                    if (isOpen) {
                        setSwipedId(null);
                    } else {
                        onView(task);
                    }
                }}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative select-none cursor-pointer"
            >
                <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(task.id);
                        }}
                        className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition ${task.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}
                    >
                        {task.completed && <CheckSquare size={12} />}
                    </button>
                    <div className="min-w-0 pr-8 sm:pr-0">
                        <h3 className={`text-xs sm:text-sm font-semibold truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {task.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {task.tag} · {task.date ? `Due ${task.date}` : (task.deadline ? `Deadline ${task.deadline}` : 'No date')}
                        </p>
                    </div>
                </div>

                {/* Sağ tərəfdə prioritet, edit və delete düymələri */}
                <div className="absolute top-4 right-4 sm:relative sm:top-auto sm:right-auto flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeClass(task.priority)}`}>
                        {task.priority}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(task);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="Edit task"
                    >
                        <Edit3 size={15} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition hidden sm:inline-flex"
                        title="Delete task"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
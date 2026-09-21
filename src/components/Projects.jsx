import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { ChevronLeft, FolderKanban, Sparkles, Plus, X, Users, Calendar, Trash2, Edit3 } from 'lucide-react';

export default function Projects() {
    const navigate = useNavigate();
    const { items, loading, error, addItem, updateItem } = useUser();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [selectedTab, setSelectedTab] = useState('All'); // All, Work, Personal

    // Detal baxış üçün state
    const [viewingProject, setViewingProject] = useState(null);

    // Swipe üçün state (eyni vaxtda yalnız bir kart açıq ola bilər)
    const [swipedId, setSwipedId] = useState(null);

    // Form state-ləri
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [deadline, setDeadline] = useState('');
    const [relatedPeople, setRelatedPeople] = useState('');

    const [localProjects, setLocalProjects] = useState(() => {
        const saved = localStorage.getItem('mindflow_local_projects');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const rawProjects = Array.isArray(items) ? items.filter(i => i.category === 'projects') : [];
        const formattedProjects = rawProjects.map(item => ({
            id: item.id,
            title: item.fields?.title || 'Project',
            description: item.fields?.description || '',
            category: item.fields?.category || 'Work',
            date: item.fields?.date || '',
            time: item.fields?.time || '',
            deadline: item.fields?.deadline || '',
            relatedPeople: item.fields?.relatedPeople || '',
            status: item.fields?.status || 'Active',
            alertText: item.fields?.alertText || '',
            alertType: item.fields?.alertType || ''
        }));

        setLocalProjects(prev => {
            const localOnly = prev.filter(p => String(p.id).startsWith('local-'));
            const existingIds = new Set(formattedProjects.map(p => p.id));
            const uniqueLocalOnly = localOnly.filter(p => !existingIds.has(p.id));
            const combined = [...uniqueLocalOnly, ...formattedProjects];

            localStorage.setItem('mindflow_local_projects', JSON.stringify(combined));
            return combined;
        });
    }, [items]);

    // Modal açıq olanda arxa fonun scroll-unu dayandır
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = (isAddModalOpen || viewingProject) ? 'hidden' : prevOverflow;
        return () => { document.body.style.overflow = prevOverflow; };
    }, [isAddModalOpen, viewingProject]);

    const handleOpenAddModal = () => {
        setEditingProjectId(null);
        setTitle('');
        setDescription('');
        setDate('');
        setTime('');
        setDeadline('');
        setRelatedPeople('');
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (project) => {
        setEditingProjectId(project.id);
        setTitle(project.title);
        setDescription(project.description || '');
        setDate(project.date || '');
        setTime(project.time || '');
        setDeadline(project.deadline || '');
        setRelatedPeople(project.relatedPeople || '');
        setViewingProject(null); // Detal modalını bağla
        setIsAddModalOpen(true);
    };

    const handleSaveProject = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        const projectData = {
            title,
            description,
            category: 'Work',
            date,
            time,
            deadline,
            relatedPeople,
            status: 'Active',
            alertText: '',
            alertType: ''
        };

        if (editingProjectId) {
            // Edit etmək (Lokal)
            setLocalProjects(prev => {
                const updated = prev.map(p => p.id === editingProjectId ? { ...p, ...projectData } : p);
                localStorage.setItem('mindflow_local_projects', JSON.stringify(updated));
                return updated;
            });

            // Backend sync (try-catch ilə)
            try {
                const rawProjects = Array.isArray(items) ? items.filter(i => i.category === 'projects') : [];
                const rawRecord = rawProjects.find(i => i.id === editingProjectId);
                if (updateItem && rawRecord) {
                    await updateItem(editingProjectId, {
                        ...rawRecord,
                        fields: { ...rawRecord.fields, ...projectData }
                    });
                }
            } catch (err) {
                console.warn('Backend update failed, saved locally:', err);
            }
        } else {
            // Yeni yaratmaq (Lokal)
            const newProject = {
                id: 'local-' + Date.now(),
                ...projectData
            };

            setLocalProjects(prev => {
                const updated = [newProject, ...prev];
                localStorage.setItem('mindflow_local_projects', JSON.stringify(updated));
                return updated;
            });

            // Backend sync
            try {
                if (addItem) {
                    await addItem({
                        category: 'projects',
                        fields: projectData
                    });
                }
            } catch (err) {
                console.warn('Backend add failed, saved locally:', err);
            }
        }

        setIsAddModalOpen(false);
        setEditingProjectId(null);
    };

    // Silmə funksiyası
    const deleteProject = (id) => {
        setLocalProjects(prev => {
            const updated = prev.filter(p => p.id !== id);
            localStorage.setItem('mindflow_local_projects', JSON.stringify(updated));
            return updated;
        });
        if (swipedId === id) setSwipedId(null);
        if (viewingProject?.id === id) setViewingProject(null);
    };

    const filteredProjects = localProjects.filter(p => {
        if (selectedTab === 'Work') return p.category?.toLowerCase() === 'work';
        if (selectedTab === 'Personal') return p.category?.toLowerCase() === 'personal';
        return true;
    });

    const activeProjects = filteredProjects.filter(p => p.status === 'Active');

    return (
        <div className="p-4 sm:p-6 lg:p-10 w-full max-w-6xl mx-auto relative">
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
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <FolderKanban size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Projects</h1>
                        <p className="text-xs text-gray-400 mt-0.5">{activeProjects.length} active projects · synchronized with Telegram bot</p>
                    </div>
                </div>

                <button
                    onClick={handleOpenAddModal}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
                >
                    <Plus size={16} />
                    Add Project
                </button>
            </div>

            {/* AI Suggestion Box */}
            <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-2xl p-4 mb-6 flex gap-3 items-start shadow-sm">
                <Sparkles size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs font-bold text-emerald-900">AI suggestion</p>
                    <p className="text-xs text-emerald-700/80 mt-0.5">
                        Your Startup project hasn't had activity for 8 days. The landing page is still the next key milestone. Consider reviewing it today.
                    </p>
                </div>
            </div>

            {/* Filter Tabs & Active Count Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
                    {['All', 'Work', 'Personal'].map((tab) => (
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

                <span className="text-xs font-medium text-gray-400">Active · {activeProjects.length}</span>
            </div>

            {/* Section Title */}
            <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Active</h2>
                <span className="text-xs font-medium text-gray-400">{activeProjects.length} projects</span>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {activeProjects.length > 0 ? (
                    activeProjects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            swipedId={swipedId}
                            setSwipedId={setSwipedId}
                            onDelete={deleteProject}
                            onEdit={handleOpenEditModal}
                            onView={setViewingProject}
                        />
                    ))
                ) : (
                    <p className="text-xs text-gray-400 col-span-2 px-1">No active projects found in this category.</p>
                )}
            </div>

            {/* Detal Baxış Modalı */}
            {viewingProject && createPortal(
                <div
                    onClick={() => setViewingProject(null)}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 mf-overlay-enter"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md p-6 relative mf-modal-enter"
                    >
                        <button
                            onClick={() => setViewingProject(null)}
                            className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                <FolderKanban size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 pr-8 truncate">{viewingProject.title}</h3>
                        </div>

                        <div className="space-y-3.5 text-xs sm:text-sm text-gray-700 mb-6">
                            {viewingProject.description && (
                                <div className="text-gray-600 text-xs leading-relaxed bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                                    {viewingProject.description}
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                                <span>{viewingProject.date ? `Date: ${viewingProject.date}` : (viewingProject.deadline ? `Deadline: ${viewingProject.deadline}` : 'No deadline')}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users size={16} className="text-gray-400 flex-shrink-0" />
                                <span>{viewingProject.relatedPeople || 'Personal project'}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setViewingProject(null)}
                                className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleOpenEditModal(viewingProject)}
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

            {/* Add / Edit Project Modal */}
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
                                    {editingProjectId ? 'Edit project' : 'Add project'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {editingProjectId ? 'Update your project details' : 'Add a new project manually'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProject} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Project name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Landing Page Redesign"
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add more details about this project..."
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition resize-none"
                                />
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
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Related people</label>
                                <div className="relative">
                                    <Users size={16} className="absolute left-3.5 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        value={relatedPeople}
                                        onChange={(e) => setRelatedPeople(e.target.value)}
                                        placeholder="e.g. Alex + 2 others"
                                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-gray-50/50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/50">
                                <Sparkles size={16} className="flex-shrink-0" />
                                <span>Project category (Work, Personal) is configured and synchronized via Telegram bot.</span>
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
                                    {editingProjectId ? 'Save changes' : 'Add project'}
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

function ProjectCard({ project, swipedId, setSwipedId, onDelete, onEdit, onView }) {
    const [touchStartX, setTouchStartX] = useState(0);
    const [touchCurrentX, setTouchCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const isOpen = swipedId === project.id;

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

        // Əgər sola kifayət qədər çəkilibsə (-40px) açılsın, sağa çəkilibsə bağlansın
        if (!isOpen && diff < -40) {
            setSwipedId(project.id);
        } else if (isOpen && diff > 30) {
            setSwipedId(null);
        }
    };

    const diff = isSwiping ? touchCurrentX - touchStartX : 0;
    let translateX = isOpen ? -80 : 0;
    if (isSwiping) {
        translateX = Math.max(-80, Math.min(0, isOpen ? -80 + diff : diff));
    }

    const getCategoryStyle = (cat) => {
        switch ((cat || '').toLowerCase()) {
            case 'personal':
                return 'bg-amber-50 text-amber-700';
            default:
                return 'bg-blue-50 text-blue-600';
        }
    };

    return (
        <div className="relative overflow-hidden rounded-3xl">
            {/* Arxa fondakı zibil qabı düyməsi */}
            <div className="absolute inset-0 bg-red-500 rounded-3xl flex items-center justify-end pr-4">
                <button
                    onClick={() => onDelete(project.id)}
                    className="p-2.5 bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center justify-center shadow-sm text-white"
                    title="Delete project"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Əsas kart elementi */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                    if (isOpen) {
                        setSwipedId(null);
                    } else {
                        onView(project);
                    }
                }}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="bg-white rounded-3xl p-5 border border-gray-100/80 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4 relative select-none cursor-pointer"
            >
                <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50/80 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <FolderKanban size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{project.title}</h3>
                                <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-md ${getCategoryStyle(project.category)}`}>
                                    {project.category || 'Work'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                                {project.status || 'Active'}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(project);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                title="Edit project"
                            >
                                <Edit3 size={15} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(project.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition hidden sm:inline-flex"
                                title="Delete project"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed mt-3 line-clamp-2">
                        {project.description || 'No description provided.'}
                    </p>
                </div>

                <div>
                    {project.alertText && (
                        <div className="mb-3 bg-amber-50/60 border border-amber-100/60 rounded-xl px-3 py-2 flex items-center gap-2 text-[11px] font-medium text-amber-800">
                            <Sparkles size={14} className="text-amber-600 flex-shrink-0" />
                            <span>{project.alertText}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            <span>{project.date || (project.deadline ? `Deadline ${project.deadline}` : 'No deadline')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Users size={13} />
                            <span>{project.relatedPeople || 'Personal project'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
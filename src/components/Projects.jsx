import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { ArrowLeft, Briefcase, Sparkles, Calendar, Loader2 } from 'lucide-react';

export default function Projects() {
    const navigate = useNavigate();
    const { items, loading, error } = useUser();

    const rawProjects = Array.isArray(items) ? items.filter(i => i.category === 'projects') : [];

    const projects = rawProjects.map(item => ({
        id: item.id,
        title: item.fields?.title || 'Project',
        tag: 'Work',
        description: item.fields?.description || '',
        dueDate: item.fields?.deadline || item.fields?.date || '—',
    }));

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F4F2F7] h-full">
                <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Layihələr yüklənir...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F2F7] p-4 sm:p-6 lg:p-10 w-full">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition mb-6"
            >
                <ArrowLeft size={16} />
                Dashboard
            </button>

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E9E4FB] text-[#6D5AE6] flex items-center justify-center flex-shrink-0">
                    <Briefcase size={20} />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Projects</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        {projects.length} active project{projects.length !== 1 ? 's' : ''} · Bot ilə sinxronlaşdırılıb
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">{error}</div>
            )}

            <div className="bg-[#EAFBF1] border border-[#D6F5E3] rounded-2xl p-4 mb-6 sm:mb-8 flex gap-3">
                <Sparkles size={18} className="text-[#16A34A] flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#16A34A]">AI suggestion</p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                        Telegram botundan gələn məlumatlar əsasında yeniləndi.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 hover:shadow-md transition"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-[#E9E4FB] text-[#6D5AE6] flex items-center justify-center flex-shrink-0">
                                <Briefcase size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900">{project.title}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{project.tag}</p>
                            </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-5">
                            {project.description}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <Calendar size={13} />
                            {project.dueDate}
                        </div>
                    </div>
                ))}
                {projects.length === 0 && (
                    <p className="text-xs text-gray-400 col-span-2 py-2">Heç bir layihə tapılmadı.</p>
                )}
            </div>
        </div>
    );
}
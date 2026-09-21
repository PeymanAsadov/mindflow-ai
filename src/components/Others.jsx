import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { ChevronLeft, Inbox, Send, Sparkles, FolderKanban, Loader2, X, CheckSquare, Calendar, HeartPulse, FileText } from 'lucide-react';

export default function Others() {
    const navigate = useNavigate();
    const { items, loading, error, updateItemCategory } = useUser();

    // Modal state-ləri
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeItem, setActiveItem] = useState(null);

    // Kateqoriyası təyin olunmamış və ya 'others' olan elementləri götürürük
    const unreviewedItems = Array.isArray(items) && items.length > 0
        ? items.filter(i => !i.category || i.category === 'others' || i.category === 'unreviewed')
        : [
            {
                id: '1',
                source: 'From Telegram',
                time: 'Today · 11:42',
                content: 'Startup üçün yeni landing page hazırlamalıyam. Dizayn və copy üzərində işləyəcəm.',
                suggestion: 'Projects',
                question: 'Does this belong to Projects?'
            },
            {
                id: '2',
                source: 'From Telegram',
                time: 'Yesterday · 18:20',
                content: 'Kamranın göndərdiyi yeni market araşdırmasına sonra baxım.',
                suggestion: null,
                question: "MindFlow isn't sure where this belongs."
            }
        ];

    const categoriesList = [
        { id: 'todo', name: 'To Do List', description: 'Task or action that needs to be completed', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-50' },
        { id: 'projects', name: 'Projects', description: 'Ongoing work with a broader goal', icon: FolderKanban, color: 'text-blue-600 bg-blue-50' },
        { id: 'meetings', name: 'Meetings', description: 'Meeting, appointment or scheduled conversation', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
        { id: 'health', name: 'Health & Care', description: 'Doctor or health-related information', icon: HeartPulse, color: 'text-rose-600 bg-rose-50' },
        { id: 'notes', name: 'Notes', description: 'Information you want MindFlow to remember', icon: FileText, color: 'text-amber-600 bg-amber-50' },
    ];

    const handleOpenModal = (item) => {
        setActiveItem(item);
        setIsModalOpen(true);
    };

    const handleSelectCategory = async (categoryKey) => {
        if (!activeItem) return;
        if (updateItemCategory) {
            await updateItemCategory(activeItem.id, categoryKey);
        }
        setIsModalOpen(false);
        setActiveItem(null);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-emerald-600">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Loading items...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-10 w-full max-w-5xl mx-auto relative">
            {/* Geri qayıt düyməsi */}
            <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 mb-4 transition"
            >
                <ChevronLeft size={16} />
                Dashboard
            </button>

            {/* Başlıq hissəsi */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Inbox size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Others</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Items MindFlow couldn't confidently organize</p>
                    </div>
                </div>
                <div className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <span>{unreviewedItems.length} items need review</span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">{error}</div>
            )}

            {/* Banner */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-5 mb-8 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={16} />
                </div>
                <div>
                    <h2 className="text-xs sm:text-sm font-bold text-gray-900">Needs your review</h2>
                    <p className="text-xs text-gray-600 mt-0.5">MindFlow couldn't confidently categorize these items. Review them and choose where they belong.</p>
                </div>
            </div>

            {/* Siyahı başlığı */}
            <div className="mb-4 flex justify-between items-center px-1">
                <h3 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">Needs review</h3>
                <span className="text-xs font-medium text-gray-400">{unreviewedItems.length} items</span>
            </div>

            {/* Elementlər */}
            <div className="space-y-4">
                {unreviewedItems.map((item) => (
                    <div
                        key={item.id}
                        className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:border-gray-200 transition"
                    >
                        {/* Mənbə və vaxt */}
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg text-gray-600 font-medium">
                                <Send size={12} className="text-blue-500" />
                                <span>{item.source || 'From Telegram'}</span>
                            </div>
                            <span>{item.time || 'Today'}</span>
                        </div>

                        {/* Məzmun qutusu */}
                        <div className="bg-gray-50/60 border border-gray-100/80 rounded-2xl p-4 text-xs sm:text-sm text-gray-800 mb-4 leading-relaxed">
                            {item.content}
                        </div>

                        {/* AI Təklif hissəsi */}
                        <div className="border-t border-gray-100 pt-4 mt-2">
                            <p className="text-xs text-gray-400 mb-2">MindFlow {item.suggestion ? 'suggests' : "isn't sure where this belongs."}</p>

                            {item.suggestion ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                                            <FolderKanban size={14} />
                                            <span>{item.suggestion}</span>
                                        </div>
                                        <span className="text-xs text-gray-600">Does this belong to Projects?</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => handleSelectCategory(item.suggestion.toLowerCase())}
                                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
                                        >
                                            Yes, move to {item.suggestion}
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(item)}
                                            className="flex-1 sm:flex-none bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2 rounded-xl transition"
                                        >
                                            Choose another category
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <button
                                        onClick={() => handleOpenModal(item)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm"
                                    >
                                        Choose category
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Choose Category Modal */}
            {isModalOpen && activeItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Choose category</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Where should this item be organized?</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Original message</span>
                                <p className="text-xs text-gray-700 leading-relaxed">{activeItem.content}</p>
                            </div>

                            <div className="space-y-2">
                                {categoriesList.map((cat) => {
                                    const IconComponent = cat.icon;
                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => handleSelectCategory(cat.id)}
                                            className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50/80 cursor-pointer transition group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                                                    <IconComponent size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition">{cat.name}</h4>
                                                    <p className="text-[11px] text-gray-400">{cat.description}</p>
                                                </div>
                                            </div>
                                            <ChevronLeft size={16} className="text-gray-300 rotate-180 group-hover:text-gray-600 transition" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
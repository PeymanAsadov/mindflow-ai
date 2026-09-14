import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';
import { FileText, ChevronLeft, Loader2 } from 'lucide-react';

export default function Notes() {
    const navigate = useNavigate();
    const { items, loading, error } = useUser();

    const rawNotes = Array.isArray(items) ? items.filter(i => i.category === 'notes') : [];

    const notes = rawNotes.map((item, idx) => ({
        id:          item.id,
        title:       item.fields?.title       || 'Note',
        content:     item.fields?.description || '',
        date:        item.fields?.date        || '',
        highlighted: idx === 0,
    }));

    const noteSections = [{
        title: 'Recent',
        count: `${notes.length} notes`,
        notes,
    }];

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-amber-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Qeydlər yüklənir...</span>
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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFFAEC] text-amber-500 flex items-center justify-center shadow-sm flex-shrink-0">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notes</h1>
                        <p className="text-xs text-gray-400 mt-0.5">{notes.length} notes - Bot vasitəsilə yenilənir</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-xs text-red-600">{error}</div>
            )}

            <div className="space-y-8 sm:space-y-10">
                {noteSections.map((section, sIndex) => (
                    <div key={sIndex}>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <h2 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-wider">{section.title}</h2>
                            <span className="text-xs font-medium text-gray-400">{section.count}</span>
                        </div>

                        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            {notes.length === 0 ? (
                                <p className="p-4 text-xs text-gray-400">Heç bir qeyd tapılmadı.</p>
                            ) : (
                                section.notes.map((note, nIndex) => (
                                    <div
                                        key={note.id}
                                        className={`p-4 sm:p-6 transition hover:bg-gray-50/50 ${note.highlighted ? 'bg-[#FFFAEC]/30' : ''} ${nIndex !== section.notes.length - 1 ? 'border-b border-gray-100' : ''}`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-2 mb-2">
                                            <h3 className={`font-bold text-sm sm:text-base ${note.highlighted ? 'text-amber-700' : 'text-gray-900'}`}>
                                                {note.title}
                                            </h3>
                                            <span className="text-xs font-medium text-gray-400 flex-shrink-0">
                                                {note.date}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{note.content}</p>
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
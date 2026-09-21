import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ArrowLeft, Edit2, Check } from 'lucide-react';
import { useUser } from '../UserContext';

// ---------- Date helpers ----------

function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function addMonths(date, n) {
    return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function startOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 = Sun ... 6 = Sat
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

// ---------- Responsive helper ----------

function useIsMobile(breakpoint = 640) {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.innerWidth < breakpoint
    );
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [breakpoint]);
    return isMobile;
}

const REFERENCE_TODAY = new Date();
const TODAY_KEY = toKey(REFERENCE_TODAY);

const START_HOUR = 8;
const END_HOUR = 19;
const HOUR_HEIGHT_DESKTOP = 64;
const HOUR_HEIGHT_MOBILE = 44;
const MOBILE_MAX_HEIGHT = 420;

const EVENT_STYLES = {
    purple: { bg: '#F3E8FF', text: '#7C3AED' },
    green: { bg: '#DCFCE7', text: '#16A34A' },
    blue: { bg: '#DBEAFE', text: '#1D4ED8' },
    amber: { bg: '#FEF3C7', text: '#B45309' },
};

const CATEGORY_COLOR = {
    todo: 'green',
    tasks: 'green',
    projects: 'blue',
    meetings: 'purple',
    notes: 'amber',
};

// Parse "HH:MM" or "HH" string into a fractional hour number
function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isNaN(h)) return null;
    return h + m / 60;
}

function itemsToEvents(items) {
    if (!Array.isArray(items)) return [];
    return items
        .filter(item => item.fields?.date)
        .map(item => {
            const start = parseTime(item.fields?.time);
            const safeStart = start !== null ? start : 9; // default to 09:00 if no time
            return {
                id: item.id,
                date: item.fields.date,
                start: safeStart,
                end: safeStart + 1,
                title: item.fields?.title || item.fields?.description || 'Event',
                color: CATEGORY_COLOR[item.category] || 'purple',
                time: item.fields?.time || '09:00',
                participants: item.fields?.participants || 'Peyman Asadov',
                location: item.fields?.location || 'Google Meet',
                link: item.fields?.link || '#',
                source: 'backend'
            };
        });
}

// ---------- Local (not-yet-synced) items → Calendar events ----------
// Notes/Projects/Meetings/ToDoList səhifələri lokal əlavələri öz localStorage
// açarlarında saxlayır. Backend-ə sinxronlaşana qədər bu qeydlər `items` içində
// olmur, ona görə Calendar onları görmürdü. Aşağıdakı funksiyalar hər açardan
// yalnız backend-ə HƏLƏ sinxronlaşmamış (id-si "local-" ilə başlayan və
// "items"-də olmayan) qeydləri götürüb, tarixi olanları calendar hadisəsinə çevirir.

function readLocalList(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function getLocalOnly(storageKey, backendItems) {
    const saved = readLocalList(storageKey);
    const localOnly = saved.filter(i => String(i?.id).startsWith('local-'));
    const existingIds = new Set((backendItems || []).map(i => i.id));
    return localOnly.filter(i => !existingIds.has(i.id));
}

function localTasksToEvents(backendItems) {
    const localOnly = getLocalOnly('mindflow_local_tasks', backendItems);
    return localOnly
        .filter(t => t?.date)
        .map(t => {
            const start = parseTime(t.time);
            const safeStart = start !== null ? start : 9;
            return {
                id: t.id,
                date: t.date,
                start: safeStart,
                end: safeStart + 1,
                title: t.title || t.description || 'Task',
                color: CATEGORY_COLOR.todo || 'green',
                time: t.time || '09:00',
                participants: 'Peyman Asadov',
                location: 'Google Meet',
                link: '#',
                source: 'local-tasks'
            };
        });
}

function localProjectsToEvents(backendItems) {
    const localOnly = getLocalOnly('mindflow_local_projects', backendItems);
    return localOnly
        .filter(p => p?.date)
        .map(p => {
            const start = parseTime(p.time);
            const safeStart = start !== null ? start : 9;
            return {
                id: p.id,
                date: p.date,
                start: safeStart,
                end: safeStart + 1,
                title: p.title || p.description || 'Project',
                color: CATEGORY_COLOR.projects || 'blue',
                time: p.time || '09:00',
                participants: p.relatedPeople || 'Peyman Asadov',
                location: 'Google Meet',
                link: '#',
                source: 'local-projects'
            };
        });
}

function localMeetingsToEvents(backendItems) {
    const localOnly = getLocalOnly('mindflow_local_meetings', backendItems);
    return localOnly
        .filter(m => m?.date)
        .map(m => {
            const start = parseTime(m.time);
            const safeStart = start !== null ? start : 9;
            const endParsed = parseTime(m.endTime);
            return {
                id: m.id,
                date: m.date,
                start: safeStart,
                end: endParsed !== null ? endParsed : safeStart + 1,
                title: m.title || m.description || 'Meeting',
                color: CATEGORY_COLOR.meetings || 'purple',
                time: m.time || '09:00',
                participants: m.participants || 'Peyman Asadov',
                location: m.location || 'Google Meet',
                link: '#',
                source: 'local-meetings'
            };
        });
}

// Backend items + üç səhifədən lokal-only qeydləri birləşdirib vahid hadisə siyahısı qurur
function buildAllEvents(items) {
    const safeItems = Array.isArray(items) ? items : [];
    return [
        ...itemsToEvents(safeItems),
        ...localTasksToEvents(safeItems),
        ...localProjectsToEvents(safeItems),
        ...localMeetingsToEvents(safeItems),
    ];
}

// Lokal-only qeydin hansı localStorage açarında olduğunu tapıb daxilində update edir
// (backend-ə hələ sinxronlaşmamış hadisələr Calendar-dan redaktə olunanda istifadə olunur)
function updateLocalItemById(id, patch) {
    const storageKeys = ['mindflow_local_tasks', 'mindflow_local_projects', 'mindflow_local_meetings'];
    for (const key of storageKeys) {
        const list = readLocalList(key);
        const idx = list.findIndex(i => i?.id === id);
        if (idx !== -1) {
            const updated = [...list];
            updated[idx] = { ...updated[idx], ...patch };
            try {
                localStorage.setItem(key, JSON.stringify(updated));
            } catch (e) { /* ignore */ }
            return true;
        }
    }
    return false;
}

function formatHour(h) {
    const hour = Math.floor(h);
    return `${hour.toString().padStart(2, '0')}:00`;
}

function formatRange(start, end) {
    const fmt = (v) => {
        const h = Math.floor(v);
        const m = Math.round((v - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    return `${fmt(start)} - ${fmt(end)}`;
}

function nowFraction() {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
}


// ---------- Ağıllı Kəsişmə və Qruplaşdırma Alqoritmi (Variant A) ----------

function getEventLayout(dayEvents) {
    if (!dayEvents || dayEvents.length === 0) return [];

    // Tədbirləri başlanğıc vaxtına görə sıralayırıq
    const sorted = [...dayEvents].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return (b.end - b.start) - (a.end - a.start);
    });

    // Hadisələri klasterlərə (qruplara) bölürük ki, kəsişməyənlər bir-birinə təsir etməsin
    const clusters = [];
    let currentCluster = [];
    let clusterMaxEnd = 0;

    sorted.forEach((event) => {
        if (currentCluster.length === 0) {
            currentCluster.push(event);
            clusterMaxEnd = event.end;
        } else {
            // Əgər bu tədbir cari qrupun hər hansı bir yeri ilə kəsişirsə
            if (event.start < clusterMaxEnd) {
                currentCluster.push(event);
                clusterMaxEnd = Math.max(clusterMaxEnd, event.end);
            } else {
                clusters.push(currentCluster);
                currentCluster = [event];
                clusterMaxEnd = event.end;
            }
        }
    });
    if (currentCluster.length > 0) {
        clusters.push(currentCluster);
    }

    const processedEvents = [];

    clusters.forEach((cluster) => {
        // Hər qrup daxilində sütunlara bölmə
        const columns = [];

        cluster.forEach((event) => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                const lastEvent = col[col.length - 1];
                // Əgər bu sütundakı sonuncu tədbir artıq bitibsə, bu sütuna əlavə edə bilərik
                if (lastEvent.end <= event.start) {
                    col.push(event);
                    event._col = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                event._col = columns.length;
                columns.push([event]);
            }
        });

        // Hər qrupun öz daxilindəki maksimum sütun sayı
        const totalCols = Math.max(columns.length, 1);
        cluster.forEach((event) => {
            event._totalCols = totalCols;
            processedEvents.push(event);
        });
    });

    return processedEvents;
}

// ---------- Week grid ----------

function WeekGrid({ weekStart, events, onSelectEvent }) {
    const isMobile = useIsMobile();
    const hourHeight = isMobile ? HOUR_HEIGHT_MOBILE : HOUR_HEIGHT_DESKTOP;
    const scrollRef = useRef(null);

    const safeEvents = Array.isArray(events) ? events : [];

    const hours = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

    const gridHeight = (END_HOUR - START_HOUR) * hourHeight;

    const days = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i);
            return {
                key: toKey(d),
                label: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                date: d.getDate(),
            };
        });
    }, [weekStart]);

    const nowH = nowFraction();
    const showNowLine = nowH >= START_HOUR && nowH <= END_HOUR;
    const nowTop = (nowH - START_HOUR) * hourHeight;

    useEffect(() => {
        if (!isMobile || !scrollRef.current) return;
        const target = showNowLine ? Math.max(nowTop - hourHeight, 0) : 0;
        scrollRef.current.scrollTop = target;
    }, [isMobile, weekStart, showNowLine, nowTop, hourHeight]);

    return (
        <div className="w-full flex flex-col">
            <div className="flex border-b border-gray-100">
                <div className="w-[32px] sm:w-[60px] flex-shrink-0" />
                {days.map((d) => {
                    const isToday = d.key === TODAY_KEY;
                    return (
                        <div key={d.key} className="flex-1 min-w-0 flex flex-col items-center py-2 md:py-3 border-l border-gray-100">
                            <span className={`text-[9px] sm:text-[10px] md:text-[11px] font-semibold tracking-wide ${isToday ? 'text-[#00C875]' : 'text-gray-400'}`}>
                                {d.label}
                            </span>
                            <span
                                className={`mt-1 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-xs md:text-sm font-bold ${isToday ? 'bg-[#00C875] text-white' : 'text-gray-700'}`}
                            >
                                {d.date}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div
                ref={scrollRef}
                className="overflow-y-auto sm:overflow-visible overscroll-contain"
                style={{ maxHeight: isMobile ? MOBILE_MAX_HEIGHT : 'none' }}
            >
                <div className="flex relative" style={{ height: gridHeight }}>
                    <div className="w-[32px] sm:w-[60px] flex-shrink-0 relative">
                        {hours.map((h, i) => (
                            <div
                                key={h}
                                className="absolute right-1 sm:right-2 md:right-3 -translate-y-1/2 text-[8px] sm:text-[10px] md:text-[11px] text-gray-400 font-medium whitespace-nowrap"
                                style={{ top: i * hourHeight }}
                            >
                                {i === 0 ? '' : formatHour(h)}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 flex relative min-w-0">
                        <div className="absolute inset-0 pointer-events-none">
                            {hours.map((h, i) => (
                                <div
                                    key={h}
                                    className="absolute w-full border-t border-gray-100"
                                    style={{ top: i * hourHeight }}
                                />
                            ))}
                        </div>

                        {days.map((d) => {
                            const dayRawEvents = safeEvents.filter((e) => e.date === d.key);
                            const dayEvents = getEventLayout(dayRawEvents);

                            return (
                                <div key={d.key} className="flex-1 min-w-0 relative border-l border-gray-100">
                                    {dayEvents.map((e, idx) => {
                                        const style = EVENT_STYLES[e.color] || EVENT_STYLES.purple;
                                        const top = (e.start - START_HOUR) * hourHeight;
                                        const height = Math.max((e.end - e.start) * hourHeight, isMobile ? 18 : 24);

                                        const totalCols = e._totalCols || 1;
                                        const colIndex = e._col || 0;
                                        // Bir-birinə keçid üçün kiçik offset veririk ki, sərhədlər yapışmasın
                                        const widthPercent = 100 / totalCols;
                                        const leftPercent = colIndex * widthPercent;

                                        return (
                                            <div
                                                key={e.id ?? idx}
                                                onClick={() => onSelectEvent(e)}
                                                className="absolute rounded-md sm:rounded-lg px-1 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1.5 overflow-hidden shadow-sm transition-all hover:z-30 hover:shadow-md cursor-pointer"
                                                style={{
                                                    top,
                                                    height,
                                                    backgroundColor: style.bg,
                                                    color: style.text,
                                                    left: `calc(${leftPercent}% + 1px)`,
                                                    width: `calc(${widthPercent}% - 2px)`,
                                                }}
                                            >
                                                <p className="text-[8px] sm:text-[10px] md:text-[11px] font-semibold leading-tight truncate">{e.title}</p>
                                                {height > 30 && (
                                                    <p className="text-[7px] sm:text-[9px] md:text-[10px] opacity-80 leading-tight mt-0.5 truncate">
                                                        {formatRange(e.start, e.end)}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {d.key === TODAY_KEY && showNowLine && (
                                        <div className="absolute left-0 right-0 flex items-center pointer-events-none z-10" style={{ top: nowTop }}>
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 -ml-[3px] sm:-ml-[4px]" />
                                            <div className="flex-1 h-0.5 bg-red-500" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------- Month view ----------

function MonthGrid({ monthDate, events, onSelectEvent }) {
    const safeEvents = Array.isArray(events) ? events : [];

    const cells = useMemo(() => {
        const firstOfMonth = startOfMonth(monthDate);
        const gridStart = startOfWeek(firstOfMonth);
        return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    }, [monthDate]);

    const MAX_VISIBLE = 3;

    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} className="py-2.5 md:py-3 text-[10px] md:text-[11px] font-semibold text-gray-400 text-center">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7">
                {cells.map((d, i) => {
                    const inMonth = d.getMonth() === monthDate.getMonth();
                    const key = toKey(d);
                    const isToday = key === TODAY_KEY;
                    const dayEvents = safeEvents
                        .filter((e) => e.date === key)
                        .sort((a, b) => a.start - b.start);
                    const visible = dayEvents.slice(0, MAX_VISIBLE);
                    const overflow = dayEvents.length - visible.length;
                    const isRightEdge = (i + 1) % 7 === 0;
                    const isBottomEdge = i >= 35;

                    return (
                        <div
                            key={i}
                            className={`p-1.5 md:p-2.5 min-h-[75px] md:min-h-[92px] border-gray-100 ${isRightEdge ? '' : 'border-r'} ${isBottomEdge ? '' : 'border-b'
                                } ${isToday ? 'bg-[#F3FBF7]' : 'bg-white'}`}
                        >
                            <div className="flex justify-start mb-1">
                                {isToday ? (
                                    <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-[#00C875] text-white text-[11px] md:text-xs font-bold">
                                        {d.getDate()}
                                    </span>
                                ) : (
                                    <span className={`text-[11px] md:text-xs font-semibold ${inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {d.getDate()}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-0.5 md:space-y-1">
                                {visible.map((e, idx) => (
                                    <div
                                        key={e.id ?? idx}
                                        onClick={() => onSelectEvent(e)}
                                        className="flex items-center gap-1 text-[10px] md:text-[11px] text-gray-600 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition"
                                    >
                                        <span
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: EVENT_STYLES[e.color]?.text || '#7C3AED' }}
                                        />
                                        <span className="truncate">
                                            <span className="text-gray-400 mr-1 hidden sm:inline">{formatHour(e.start)}</span>
                                            {e.title}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {overflow > 0 && (
                                <div className="text-[9px] md:text-[10px] font-semibold text-gray-400 mt-0.5">
                                    +{overflow} more
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ---------- Event modal (portal) ----------

function EventModal({ event, onClose, onLocalSave }) {
    const navigate = useNavigate();
    const { updateItem, items } = useUser();
    const [isEditing, setIsEditing] = useState(false);

    const [editTitle, setEditTitle] = useState(event?.title || '');
    const [editDate, setEditDate] = useState(event?.date || '');
    const [editTime, setEditTime] = useState(event?.time || '');
    const [editParticipants, setEditParticipants] = useState(event?.participants || '');
    const [editLocation, setEditLocation] = useState(event?.location || '');

    const handleSave = async () => {
        if (!event?.id) return;

        const rawItem = (items || []).find(i => i.id === event.id);
        if (rawItem && updateItem) {
            // Backend-ə sinxronlaşmış hadisə — normal update
            await updateItem(event.id, {
                ...rawItem,
                fields: {
                    ...rawItem.fields,
                    title: editTitle,
                    date: editDate,
                    time: editTime,
                    participants: editParticipants,
                    location: editLocation
                }
            });
        } else {
            // Hələ backend-ə sinxronlaşmamış (lokal) hadisə — müvafiq localStorage
            // siyahısında (tasks/projects/meetings) tapıb birbaşa yeniləyirik
            updateLocalItemById(event.id, {
                title: editTitle,
                date: editDate,
                time: editTime,
                participants: editParticipants,
                location: editLocation
            });
            if (onLocalSave) onLocalSave();
        }
        setIsEditing(false);
    };

    const handleOpenMeeting = () => {
        onClose();
        navigate('/meetings');
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    if (!event) return null;

    return createPortal(
        <div
            onClick={onClose}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] mf-overlay-enter"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-2xl relative mf-modal-enter"
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

                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
                >
                    ✕
                </button>

                {/* Header & Title */}
                <div className="flex items-center gap-3 mb-4 pr-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                        📅
                    </div>
                    {isEditing ? (
                        <input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="text-xl font-bold text-gray-800 leading-snug w-full border border-gray-200 rounded px-1.5 focus:outline-none focus:border-purple-600 cursor-text"
                        />
                    ) : (
                        <h3 className="text-xl font-bold text-gray-800 leading-snug">{editTitle}</h3>
                    )}
                </div>

                {/* Details List */}
                <div className="space-y-3 text-sm text-gray-600 border-b border-gray-100 pb-5 mb-5">
                    <div className="flex items-center gap-3">
                        <span>📅</span>
                        {isEditing ? (
                            <input value={editDate} onChange={e => setEditDate(e.target.value)} className="border border-gray-200 rounded px-1 flex-1 focus:outline-none focus:border-purple-600" placeholder="YYYY-MM-DD" />
                        ) : (
                            <span>{editDate}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span>🕒</span>
                        {isEditing ? (
                            <input value={editTime} onChange={e => setEditTime(e.target.value)} className="border border-gray-200 rounded px-1 flex-1 focus:outline-none focus:border-purple-600" placeholder="HH:MM" />
                        ) : (
                            <span>{editTime || formatRange(event.start, event.end)}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span>👥</span>
                        {isEditing ? (
                            <input value={editParticipants} onChange={e => setEditParticipants(e.target.value)} className="border border-gray-200 rounded px-1 flex-1 focus:outline-none focus:border-purple-600" />
                        ) : (
                            <span>{editParticipants}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span>📍</span>
                        {isEditing ? (
                            <input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="border border-gray-200 rounded px-1 flex-1 focus:outline-none focus:border-purple-600" />
                        ) : (
                            <span>{editLocation}</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={isEditing ? handleSave : () => setIsEditing(true)}
                        className={`px-4 py-2 text-sm rounded-xl font-medium transition-colors inline-flex items-center justify-center gap-2 ${isEditing ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        {isEditing ? <Check size={16} /> : <Edit2 size={16} />}
                        {isEditing ? "Save Event" : "Edit Event"}
                    </button>
                    <button
                        onClick={handleOpenMeeting}
                        className="px-5 py-2.5 text-sm bg-[#00C875] hover:bg-[#00b067] text-white rounded-xl font-medium shadow-md transition-colors inline-flex items-center justify-center"
                    >
                        Open meeting
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ---------- Main page ----------

export default function CalendarApp() {
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState('timeGridWeek');
    const [cursorDate, setCursorDate] = useState(REFERENCE_TODAY);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const { items } = useUser();

    // localStorage-dəki lokal (hələ sinxronlaşmamış) qeydlərin dəyişdiyini izləmək
    // üçün "versiya" sayğacı — hər dəfə artdıqda events yenidən hesablanır.
    const [localVersion, setLocalVersion] = useState(0);
    const bumpLocalVersion = useCallback(() => setLocalVersion(v => v + 1), []);

    useEffect(() => {
        // Başqa tab-da və ya bu tab-da (Notes/Projects/Meetings/ToDoList səhifəsində
        // yeni qeyd əlavə olunanda) localStorage dəyişərsə calendar-ı yeniləyək
        window.addEventListener('storage', bumpLocalVersion);
        window.addEventListener('focus', bumpLocalVersion);
        return () => {
            window.removeEventListener('storage', bumpLocalVersion);
            window.removeEventListener('focus', bumpLocalVersion);
        };
    }, [bumpLocalVersion]);

    const events = useMemo(
        () => buildAllEvents(items),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items, localVersion]
    );

    const weekStart = useMemo(() => startOfWeek(cursorDate), [cursorDate]);

    const title = useMemo(() => {
        if (currentView === 'dayGridMonth') {
            return cursorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        const weekEnd = addDays(weekStart, 6);
        const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
        const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
        const year = weekEnd.getFullYear();
        return startMonth === endMonth
            ? `${startMonth} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${year}`
            : `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}, ${year}`;
    }, [cursorDate, currentView, weekStart]);

    const handleToday = () => setCursorDate(REFERENCE_TODAY);

    const handlePrev = () => {
        setCursorDate((d) =>
            currentView === 'dayGridMonth' ? addMonths(d, -1) : addDays(d, -7)
        );
    };

    const handleNext = () => {
        setCursorDate((d) =>
            currentView === 'dayGridMonth' ? addMonths(d, 1) : addDays(d, 7)
        );
    };

    return (
        <div className="flex min-h-screen bg-[#FAFAFB] font-sans justify-center relative">
            <div className="flex-1 max-w-7xl p-4 md:p-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition mb-4"
                >
                    <ArrowLeft size={16} />
                    Dashboard
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-2 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#EBFBF0] text-[#00C875] flex items-center justify-center flex-shrink-0 shadow-sm">
                            <CalendarIcon size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Calendar</h1>
                            <p className="text-xs md:text-sm text-gray-500 mt-0.5">Synchronized with the Telegram bot and backend.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2 pb-6">
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-xl transition shadow-sm"
                        >
                            Today
                        </button>
                        <button
                            onClick={handlePrev}
                            aria-label="Previous"
                            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-gray-600 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-xl transition shadow-sm font-bold"
                        >
                            &lt;
                        </button>
                        <button
                            onClick={handleNext}
                            aria-label="Next"
                            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-gray-600 bg-white hover:bg-gray-50 border border-gray-200/80 rounded-xl transition shadow-sm font-bold"
                        >
                            &gt;
                        </button>
                        <span className="text-sm md:text-base font-bold text-gray-800 ml-1">{title}</span>
                    </div>

                    <div className="flex items-center bg-gray-200/60 p-1 rounded-xl self-end md:self-auto">
                        <button
                            onClick={() => setCurrentView('dayGridMonth')}
                            className={`px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-medium rounded-lg transition ${currentView === 'dayGridMonth'
                                ? 'bg-white text-[#00C875] font-semibold shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setCurrentView('timeGridWeek')}
                            className={`px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-medium rounded-lg transition ${currentView === 'timeGridWeek'
                                ? 'bg-white text-[#00C875] font-semibold shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Week
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-3 md:p-6 shadow-sm border border-gray-100 overflow-hidden">
                    <style>{`
                        @keyframes calendarViewIn {
                            from { opacity: 0; transform: translateY(8px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .calendar-view-enter {
                            animation: calendarViewIn 0.28s ease-out;
                        }
                    `}</style>
                    <div key={currentView} className="calendar-view-enter">
                        {currentView === 'timeGridWeek'
                            ? <WeekGrid weekStart={weekStart} events={events} onSelectEvent={setSelectedEvent} />
                            : <MonthGrid monthDate={startOfMonth(cursorDate)} events={events} onSelectEvent={setSelectedEvent} />}
                    </div>
                </div>
            </div>

            {/* Event Details Modal*/}
            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onLocalSave={bumpLocalVersion}
                />
            )}
        </div>
    );
}
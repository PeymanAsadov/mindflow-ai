// Bütün bölmələrin məlumatlarını idarə etmək üçün mərkəzi xidmət

const STORAGE_KEYS = {
    EVENTS: 'bot_calendar_events',
    TODOS: 'app_todos',
    MEETINGS: 'app_meetings',
    NOTES: 'app_notes',
    PROJECTS: 'app_projects',
};

// Məlumatı oxumaq
export function getData(keyName) {
    try {
        const data = localStorage.getItem(STORAGE_KEYS[keyName]);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Məlumatı oxumaq mümkün olmadı:", e);
        return [];
    }
}

// Məlumatı yazmaq və digər səhifələrə xəbər vermək (event dispatch)
export function saveData(keyName, items) {
    try {
        localStorage.setItem(STORAGE_KEYS[keyName], JSON.stringify(items));
        // Digər komponentlərin dərhal xəbər tutması üçün hadisə tetikləyirik
        window.dispatchEvent(new Event('storage_updated'));
    } catch (e) {
        console.error("Məlumatı yadda saxlamaq mümkün olmadı:", e);
    }
}

// Telegram botdan və ya digər yerdən gələn yeni elementi birbaşa əlavə etmək üçün
export function addItem(keyName, newItem) {
    const current = getData(keyName);
    const updated = [newItem, ...current];
    saveData(keyName, updated);
    return updated;
}
const STORAGE_KEYS = {
    EVENTS: 'bot_calendar_events',
    TODOS: 'app_todos',
    MEETINGS: 'app_meetings',
    NOTES: 'app_notes',
    PROJECTS: 'app_projects',
};

// Read data for a given key
export function getData(keyName) {
    try {
        const data = localStorage.getItem(STORAGE_KEYS[keyName]);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Unable to read the data:', e);
        return [];
    }
}

// Save data for a given key and notify listeners
export function saveData(keyName, items) {
    try {
        localStorage.setItem(STORAGE_KEYS[keyName], JSON.stringify(items));
        window.dispatchEvent(new Event('storage_updated'));
    } catch (e) {
        console.error('Məlumatı yadda saxlamaq mümkün olmadı:', e);
    }
}

export function addItem(keyName, newItem) {
    const current = getData(keyName);
    const updated = [newItem, ...current];
    saveData(keyName, updated);
    return updated;
}
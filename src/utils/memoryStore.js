// Shared helpers so the Dashboard counts exactly what the pages show.

export const TASK_CATEGORIES = ['tasks', 'todo'];
export const HEALTH_CATEGORIES = ['health', 'health & care'];

const GLOBAL_DELETED_KEY = 'mindflow_deleted_item_ids';
// Older Healthcare code stored deletions only under this key.
const DELETED_KEYS = [GLOBAL_DELETED_KEY, 'mindflow_deleted_health_ids'];

function readArray(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function readLocalItems(storageKey) {
    return readArray(storageKey);
}

// Union of every "deleted ids" list, as strings.
export function getDeletedIds() {
    const set = new Set();
    DELETED_KEYS.forEach(key => readArray(key).forEach(id => set.add(String(id))));
    return set;
}

// Call this from every page's delete handler, regardless of whether
// deleteItem() exists or succeeds on the backend.
export function markDeleted(id) {
    try {
        const set = new Set(readArray(GLOBAL_DELETED_KEY).map(String));
        set.add(String(id));
        localStorage.setItem(GLOBAL_DELETED_KEY, JSON.stringify([...set]));
    } catch {
        // non-critical
    }
    window.dispatchEvent(new Event('mindflow:data-changed'));
}

export function categoryIn(item, categories) {
    return categories.includes(String(item?.category || '').toLowerCase());
}

// server items + local-only items, minus deleted ones.
// rawFilter / localFilter let a caller count only "active" items.
export function countMerged(rawItems, storageKey, rawFilter = () => true, localFilter = () => true) {
    const deleted = getDeletedIds();

    const validRaw = rawItems.filter(i => !deleted.has(String(i.id)));
    const existingIds = new Set(validRaw.map(i => String(i.id)));

    const uniqueLocalOnly = readLocalItems(storageKey).filter(
        i =>
            String(i?.id).startsWith('local-') &&
            !deleted.has(String(i.id)) &&
            !existingIds.has(String(i.id))
    );

    return validRaw.filter(rawFilter).length + uniqueLocalOnly.filter(localFilter).length;
}
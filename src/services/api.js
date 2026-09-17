import axios from 'axios';

const BASE = 'https://backend-production-4d2a.up.railway.app';

// Fetch user profile by gmail
export async function getUser(email) {
    const res = await axios.get(`${BASE}/api/users`, { params: { gmail: email } });
    return res.data?.user || null;
}

// Fetch all items (todos, projects, meetings, notes) by gmail
export async function getAllItems(email) {
    const res = await axios.get(`${BASE}/api/items`, { params: { gmail: email } });
    const raw = res.data?.items;
    return Array.isArray(raw) ? raw : [];
}

// Update user profile by gmail
export async function updateUser(email, data) {
    const res = await axios.put(`${BASE}/api/users`, data, { params: { gmail: email } });
    return res.data;
}

// Update specific item by itemId
export async function updateItem(email, itemId, data) {
    const res = await axios.put(`${BASE}/api/items/${itemId}`, data, { params: { gmail: email } });
    return res.data;
}
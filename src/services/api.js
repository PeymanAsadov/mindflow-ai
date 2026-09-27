import axios from 'axios';

const BASE = 'https://backend-production-4d2a.up.railway.app';

// Fetch user profile by gmail
export async function getUser(email) {
    const res = await axios.get(`${BASE}/api/users`, {
        params: { gmail: email },
    });
    return res.data?.user || null;
}

// Fetch all items by gmail
export async function getAllItems(email) {
    const res = await axios.get(`${BASE}/api/items`, {
        params: { gmail: email },
    });
    const raw = res.data?.items;
    return Array.isArray(raw) ? raw : [];
}

// Update user profile
export async function updateUser(email, data) {
    const res = await axios.put(`${BASE}/api/users`, data, {
        params: { gmail: email },
    });
    return res.data;
}

// Create a new item
export async function addItem(email, data) {
    const res = await axios.post(`${BASE}/api/items`, data, {
        params: { gmail: email },
    });
    return res.data;
}

// Update specific item
export async function updateItem(email, itemId, data) {
    const res = await axios.put(
        `${BASE}/api/items/${encodeURIComponent(itemId)}`,
        data,
        { params: { gmail: email } }
    );
    return res.data;
}

// Delete a specific item
export async function deleteItem(email, itemId, telegramId) {
    const params = { gmail: email };

    if (telegramId !== undefined && telegramId !== null) {
        params.telegramId = telegramId;
    }

    const res = await axios.delete(
        `${BASE}/api/items/${encodeURIComponent(itemId)}`,
        {
            params,
            timeout: 20000,
        }
    );

    return res.data;
}

// Upload item file
export async function uploadItemFile(
    itemId,
    { telegramId, gmail, fileName, mimeType, dataBase64 }
) {
    const res = await axios.post(
        `${BASE}/api/items/${encodeURIComponent(itemId)}/files/upload`,
        {
            telegramId,
            gmail,
            fileName,
            mimeType,
            dataBase64,
        }
    );
    return res.data;
}

// Attach existing file reference
export async function attachItemFileRef(
    itemId,
    { telegramId, gmail, file_id, file_name, mime_type }
) {
    const res = await axios.post(
        `${BASE}/api/items/${encodeURIComponent(itemId)}/files`,
        {
            telegramId,
            gmail,
            file_id,
            file_name,
            mime_type,
        }
    );
    return res.data;
}

// Get item files
export async function getItemFiles(itemId, email) {
    const res = await axios.get(
        `${BASE}/api/items/${encodeURIComponent(itemId)}/files`,
        { params: { gmail: email } }
    );

    return res.data?.files || res.data?.item?.fields?.files || [];
}

// Get item file URL
export async function getItemFileUrl(itemId, index, email) {
    const res = await axios.get(
        `${BASE}/api/items/${encodeURIComponent(itemId)}/files/${index}/url`,
        { params: { gmail: email } }
    );

    return (
        res.data?.url ||
        res.data?.signedUrl ||
        res.data?.signed_url ||
        null
    );
}

// Delete item file
export async function deleteItemFile(
    itemId,
    { gmail, file_id, index }
) {
    const res = await axios.delete(
        `${BASE}/api/items/${encodeURIComponent(itemId)}/files`,
        {
            data: { gmail, file_id, index },
        }
    );

    return res.data;
}

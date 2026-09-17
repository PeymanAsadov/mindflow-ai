import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUser, getAllItems, updateUser, updateItem } from './services/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAll = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        if (!isBackground) setError(null);
        try {
            const email = localStorage.getItem('mindflow_user_email') || '';
            if (!email) {
                if (!isBackground) setLoading(false);
                return;
            }
            const [userData, itemsData] = await Promise.all([
                getUser(email),
                getAllItems(email),
            ]);
            setUser(userData);
            setItems(Array.isArray(itemsData) ? itemsData : []);
        } catch (err) {
            console.error('UserContext fetch error:', err);
            if (!isBackground) setError('Failed to load data from server.');
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(() => {
            fetchAll(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    const handleUpdateUser = async (data) => {
        const email = localStorage.getItem('mindflow_user_email') || '';
        if (email) {
            await updateUser(email, data);
            await fetchAll(true);
        }
    };

    const handleUpdateItem = async (itemId, data) => {
        const email = localStorage.getItem('mindflow_user_email') || '';
        if (email) {
            await updateItem(email, itemId, data);
            await fetchAll(true);
        }
    };

    return (
        <UserContext.Provider value={{ user, items, loading, error, refetch: fetchAll, updateUser: handleUpdateUser, updateItem: handleUpdateItem }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}

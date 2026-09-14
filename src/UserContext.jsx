import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUser, getAllItems } from './services/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const email = localStorage.getItem('mindflow_user_email') || '';
            if (!email) {
                setLoading(false);
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
            setError('Failed to load data from server.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    return (
        <UserContext.Provider value={{ user, items, loading, error, refetch: fetchAll }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}

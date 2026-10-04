import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';

import {
    getUser,
    getAllItems,
    updateUser as apiUpdateUser,
    addItem as apiAddItem,
    updateItem as apiUpdateItem,
    deleteItem as apiDeleteItem,
} from './services/api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);

    const fetchAll = useCallback(async (isBackground = false) => {
        const requestId = ++requestIdRef.current;

        if (!isBackground && mountedRef.current) {
            setLoading(true);
            setError(null);
        }

        const email = localStorage.getItem('mindflow_user_email') || '';

        if (!email) {
            if (mountedRef.current) {
                setUser(null);
                setItems([]);
                setLoading(false);
            }
            return false;
        }

        try {
            const [userData, itemsData] = await Promise.all([
                getUser(email),
                getAllItems(email),
            ]);

            // Ignore outdated requests.
            if (
                !mountedRef.current ||
                requestId !== requestIdRef.current
            ) {
                return false;
            }

            let mergedUser = userData;
            let mergedItems = Array.isArray(itemsData) ? itemsData : [];

            try {
                const userUpdates = JSON.parse(
                    localStorage.getItem('mindflow_user_updates') || '{}'
                );

                if (mergedUser) {
                    mergedUser = { ...mergedUser, ...userUpdates };
                }

                const itemUpdates = JSON.parse(
                    localStorage.getItem('mindflow_item_updates') || '{}'
                );

                mergedItems = mergedItems.map(item => {
                    const localUpdate = itemUpdates[item.id];

                    return localUpdate
                        ? { ...item, ...localUpdate }
                        : item;
                });
            } catch (storageError) {
                console.warn('Could not merge local updates:', storageError);
            }

            setUser(mergedUser);
            setItems(mergedItems);
            setError(null);

            return true;
        } catch (err) {
            if (
                mountedRef.current &&
                requestId === requestIdRef.current
            ) {
                // Only show error if we have no cached data yet (first load failure)
                if (!isBackground) {
                    // Check if we already have user data — if so, don't show error
                    const hasExistingData = !!localStorage.getItem('mindflow_user_email');
                    if (!hasExistingData) {
                        setError('Failed to load data from server.');
                    }
                    // If we have an email configured it's likely a transient network error — stay silent
                }

                console.warn(
                    'Could not fetch MindFlow data:',
                    err.response?.data || err.message
                );
            }

            return false;
        } finally {
            if (
                mountedRef.current &&
                requestId === requestIdRef.current &&
                !isBackground
            ) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        fetchAll();

        // Refresh less frequently to avoid unnecessary requests.
        const interval = setInterval(() => {
            fetchAll(true);
        }, 15000);

        return () => {
            mountedRef.current = false;
            clearInterval(interval);
            requestIdRef.current += 1;
        };
    }, [fetchAll]);

    const handleUpdateUser = async (data) => {
        const email = localStorage.getItem('mindflow_user_email') || '';

        setUser(prev => ({ ...prev, ...data }));

        try {
            const local = JSON.parse(
                localStorage.getItem('mindflow_user_updates') || '{}'
            );

            localStorage.setItem(
                'mindflow_user_updates',
                JSON.stringify({ ...local, ...data })
            );
        } catch (err) {
            console.warn('Could not save local user update:', err);
        }

        if (!email) return { ok: false, error: 'No user email configured' };

        try {
            const result = await apiUpdateUser(email, data);
            await fetchAll(true);
            return { ok: true, result };
        } catch (err) {
            console.warn(
                'Could not update user on server:',
                err.response?.data || err.message
            );

            return {
                ok: false,
                error: err.response?.data?.error || err.message,
            };
        }
    };

    const handleAddItem = async (data) => {
        const email = localStorage.getItem('mindflow_user_email') || '';

        if (!email) {
            return { ok: false, error: 'No user email configured' };
        }

        try {
            const result = await apiAddItem(email, data);

            // Refresh only after the server confirms creation.
            await fetchAll(true);

            return {
                ok: true,
                item: result?.item || result,
                result,
            };
        } catch (err) {
            console.warn(
                'Could not add item on server:',
                err.response?.data || err.message
            );

            return {
                ok: false,
                error:
                    err.response?.data?.error ||
                    err.message ||
                    'Could not add item',
                status: err.response?.status,
                missing: err.response?.data?.missing,
            };
        }
    };

    const handleUpdateItem = async (itemId, data) => {
        const email = localStorage.getItem('mindflow_user_email') || '';

        if (!email) {
            return { ok: false, error: 'No user email configured' };
        }

        const previousItems = items;

        setItems(prev =>
            prev.map(item =>
                String(item.id) === String(itemId)
                    ? { ...item, ...data }
                    : item
            )
        );

        try {
            const local = JSON.parse(
                localStorage.getItem('mindflow_item_updates') || '{}'
            );

            local[itemId] = {
                ...(local[itemId] || {}),
                ...data,
            };

            localStorage.setItem(
                'mindflow_item_updates',
                JSON.stringify(local)
            );
        } catch (err) {
            console.warn('Could not save local item update:', err);
        }

        try {
            const result = await apiUpdateItem(email, itemId, data);
            await fetchAll(true);
            return { ok: true, result };
        } catch (err) {
            console.warn(
                'Could not update item on server:',
                err.response?.data || err.message
            );

            // Restore the previous data if the server rejects the update.
            setItems(previousItems);

            return {
                ok: false,
                error: err.response?.data?.error || err.message,
            };
        }
    };

    // Deletion is treated as optimistic: the item is removed from local
    // state immediately and we don't surface an alert or a console error
    // if the backend call fails — the UI experience should never be
    // blocked by a failed delete request.
    const handleDeleteItem = async (itemId) => {
        const email =
            user?.gmail ||
            localStorage.getItem('mindflow_user_email') ||
            '';

        const telegramId = Number(user?.telegramId || 0);

        setItems(prev =>
            prev.filter(item => String(item.id) !== String(itemId))
        );

        try {
            const result = await apiDeleteItem(email, itemId, telegramId);
            return { ok: true, result };
        } catch (err) {
            // Silently ignore backend failures — the item already stays
            // removed from the UI, so no alert or console noise here.
            return {
                ok: true,
                silentError:
                    err.response?.data?.error ||
                    err.response?.data?.message ||
                    err.message ||
                    'Record could not be deleted on the server.',
            };
        }
    };

    return (
        <UserContext.Provider
            value={{
                user,
                items,
                loading,
                error,
                refetch: fetchAll,
                updateUser: handleUpdateUser,
                addItem: handleAddItem,
                updateItem: handleUpdateItem,
                deleteItem: handleDeleteItem,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MindFlowLogo from "../images/Logo.png";
import { useUser } from '../UserContext';
import {
    LayoutDashboard,
    Calendar,
    LogOut,
    Menu,
    X
} from 'lucide-react';

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user: apiUser } = useUser() || {};

    const sidebarItems = [
        { label: 'İdarə paneli', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { label: 'Təqvim', path: '/calendar', icon: <Calendar size={20} /> },
    ];

    const firstName = apiUser?.firstName || '';
    const lastName = apiUser?.lastName || '';
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || 'User');
    const email = apiUser?.gmail || localStorage.getItem('mindflow_user_email') || '';
    const initials = (firstName[0] || '') + (lastName[0] || '') || 'U';

    const user = { name: fullName, email, initials };

    const handleLogout = () => {
        navigate('/logout');
    };

    const handleItemClick = (path) => {
        navigate(path);
        setMobileOpen(false);
    };

    return (
        <>
            {/* Mobil Header və Açma/Bağlama Düyməsi */}
            <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50 w-full">
                <div
                    onClick={() => navigate('/dashboard')}
                    className="w-20 h-1 cursor-pointer flex items-center overflow-hidden"
                >
                    <img src={MindFlowLogo} alt="MindFlow AI" className="w-full h-full object-cover" />
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                    aria-label="Toggle Menu"
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobil üçün Overlay fon */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-xs"
                />
            )}

            {/* Sidebar Konteyneri (Mobil üçün Drawer, Kompüter üçün Sticky Sidebar) */}
            <aside
                className={`w-64 bg-white border-r border-gray-100 flex flex-col justify-between p-6 flex-shrink-0 h-screen fixed md:sticky top-0 z-50 transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
            >
                <div>
                    {/* Logo hissəsi (Kompüter üçün) */}
                    <div
                        onClick={() => navigate('/dashboard')}
                        className="hidden md:flex items-center gap-3 mb-10 cursor-pointer group"
                    >
                        <div className="w-45 h-12  rounded-xl flex items-center justify-center flex-shrink-0 transition group-hover:scale-105 overflow-hidden">
                            <img src={MindFlowLogo} alt="MindFlow AI" className="w-full h-full object-cover" />
                        </div>
                    </div>

                    {/* Naviqasiya menyusu */}
                    <nav className="space-y-1">
                        {sidebarItems.map((item) => {
                            const isDashboardActive = item.path === '/dashboard' && (
                                location.pathname === '/dashboard' ||
                                location.pathname.startsWith('/notes') ||
                                location.pathname.startsWith('/projects') ||
                                location.pathname.startsWith('/meetings') ||
                                location.pathname.startsWith('/todo')
                            );

                            const isActive = isDashboardActive || location.pathname === item.path;

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => handleItemClick(item.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition text-left ${isActive
                                        ? 'bg-[#EBFBF0] text-[#00C875]'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={isActive ? 'text-[#00C875]' : 'text-gray-400'}>
                                        {item.icon}
                                    </span>
                                    <span className="text-sm">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Profil və Log out hissəsi */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-[#EBFBF0] text-[#00C875] flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {user.initials}
                        </div>
                        <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{user.name}</h4>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-red-600 bg-red-50 hover:bg-red-100 transition text-left"
                    >
                        <LogOut size={20} />
                        <span className="text-sm">Log out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
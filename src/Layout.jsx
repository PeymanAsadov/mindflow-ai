import React from 'react';
import Sidebar from "./components/Sidebar";
import PageTransition from "./PageTransition";
import ScrollToTop from "./ScrollToTop"; // Fayl buradadırsa, import edirik

export default function MainLayout() {
    return (
        <div className="flex flex-col md:flex-row h-screen bg-[#F8F9FC] font-sans text-gray-800 overflow-hidden">
            <Sidebar />
            <ScrollToTop /> {/* Bu komponent hər səhifə dəyişəndə main elementini yuxarı çəkəcək */}
            <main className="flex-1 overflow-y-auto w-full">
                <PageTransition />
            </main>
        </div>
    );
}
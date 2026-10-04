import React, { useState, useEffect } from 'react';
import logoIcon from './images/framelogo.png';

const TEXT = 'MindFlow';
const START_DELAY_MS = 200;
const LETTER_STEP_MS = 100;
const LETTER_DURATION_MS = 300;

// 800ms delay after all letters finish (Figma "After delay 800ms")
const MIN_DISPLAY_MS = START_DELAY_MS + (TEXT.length * LETTER_STEP_MS) + LETTER_DURATION_MS + 800;
const FADE_OUT_MS = 800;

export default function LoadingScreen({ onFinish }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const showTimer = setTimeout(() => setExiting(true), MIN_DISPLAY_MS);
        return () => clearTimeout(showTimer);
    }, []);

    const handleTransitionEnd = () => {
        if (exiting) onFinish && onFinish();
    };

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-[#F8F9FB] flex items-center justify-center loading-screen ${exiting ? 'loading-screen-exit' : ''}`}
            onTransitionEnd={handleTransitionEnd}
        >
            <style>{`
                .loading-screen {
                    opacity: 1;
                    transition: opacity ${FADE_OUT_MS}ms cubic-bezier(0.1, 0.9, 0.2, 1);
                }
                .loading-screen-exit {
                    opacity: 0;
                    pointer-events: none;
                }

                @keyframes spinLogo {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                .loading-icon {
                    animation: spinLogo 2.2s cubic-bezier(0.4, 0.9, 0.2, 1) forwards;
                }

                @keyframes letterIn {
                    0%   { opacity: 0; transform: translateX(-4px); }
                    100% { opacity: 1; transform: translateX(0); }
                }
                .loading-letter {
                    display: inline-block;
                    opacity: 0;
                    /* Smooth spring-like bezier approximation over 300ms */
                    animation: letterIn ${LETTER_DURATION_MS}ms cubic-bezier(0.1, 0.9, 0.2, 1) forwards;
                }
            `}</style>

            <div className="flex items-center gap-3 md:gap-4 -translate-y-8">
                <img src={logoIcon} alt="Logo" className="w-[45px] h-[45px] sm:w-[55px] sm:h-[55px] md:w-[65px] md:h-[65px] loading-icon" />
                <span className="text-[32px] sm:text-[42px] md:text-[48px] font-bold text-gray-900 tracking-tight flex">
                    {TEXT.split('').map((char, i) => (
                        <span
                            key={i}
                            className="loading-letter"
                            style={{ animationDelay: `${START_DELAY_MS + i * LETTER_STEP_MS}ms` }}
                        >
                            {char}
                        </span>
                    ))}
                </span>
            </div>
        </div>
    );
}
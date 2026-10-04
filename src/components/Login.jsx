import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import MindFlowLogo from '../images/Logo.png';

export default function LoginPage({ onLoginSuccess }) {
    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                const userInfo = await axios.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
                );
                const email = userInfo.data?.email || '';
                if (email) {
                    localStorage.setItem('mindflow_user_email', email);
                }
            } catch (e) {
                console.warn('Could not fetch Google userinfo:', e);
            }
            localStorage.setItem('mindflow_auth', 'true');
            if (onLoginSuccess) onLoginSuccess();
        },
        onError: () => console.log('Login Failed'),
    });

    return (
        <div className="min-h-screen bg-[#FAFAFB] flex flex-col items-center justify-center p-4 font-sans">
            {/* Logo at top */}
            <div className="mb-8">
                <img src={MindFlowLogo} alt="MindFlow AI" className="h-10 w-auto object-contain" />
            </div>

            <div className="w-full max-w-[440px] bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-sm flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6 shadow-inner">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>

                <h1 className="text-2xl sm:text-[26px] font-bold text-gray-900 tracking-tight mb-2">
                    MindFlow
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-[320px] mb-8">
                    Sign in to continue to your workspace, tasks, meetings, and calendar.
                </p>

                {/* Google Sign-In Button */}
                <button
                    onClick={() => login()}
                    className="w-full h-12 bg-[#1E7A5E] hover:bg-[#175f49] text-white font-medium rounded-2xl flex items-center justify-center gap-3 transition shadow-sm active:scale-[0.99]"
                >
                    <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                        <span className="text-[#1E7A5E] font-bold text-sm">G</span>
                    </div>
                    <span className="text-sm font-semibold tracking-wide">Continue with Google</span>
                </button>

                <p className="text-[11px] text-gray-400 mt-6">
                    Your information stays organized privately with MindFlow.
                </p>

                <div className="w-full border-t border-gray-100 my-6"></div>

                <p className="text-[11px] text-gray-400 leading-normal">
                    By continuing, you agree to our{' '}
                    <a href="#terms" className="underline hover:text-gray-600 transition">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#privacy" className="underline hover:text-gray-600 transition">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
}
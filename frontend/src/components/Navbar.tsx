'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Sparkles, PlusCircle, BookOpen, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Apex AI
            </span>
            <span className="text-xs block text-blue-400 font-medium">Interview Prep Kit</span>
          </div>
        </Link>

        <div className="flex items-center space-x-4">
          <Link
            href="/kits/new"
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-md shadow-blue-600/20 hover:shadow-blue-500/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Kit</span>
          </Link>

          <Link
            href="/kits"
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>My Kits</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-3 border-l border-slate-800 pl-4 ml-2">
              <div className="flex items-center space-x-2 text-sm text-slate-300">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-semibold border border-slate-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium hidden sm:inline">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-1 px-3 py-2 text-sm text-slate-300 hover:text-white"
            >
              <UserIcon className="w-4 h-4" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bot, Home, LayoutGrid, School, Sprout, User } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-paper-texture">
      <header className="fixed top-0 left-0 right-0 h-12 bg-[#F5F5F5] border-b border-primary/10 flex items-center justify-between px-6 z-50">
        <Sprout className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-serif font-bold tracking-wider text-primary">章园夜校</h1>
        <div className="w-6" />
      </header>

      <main className="mt-12 flex-1 relative overflow-x-hidden">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-primary/10 flex justify-around items-center px-4 pb-safe z-50">
        <NavButton to="/" icon={<Home size={24} />} label="首页" />
        <NavButton to="/courses" icon={<School size={24} />} label="课程" />
        <NavButton to="/market" icon={<LayoutGrid size={24} />} label="雅集" />
        <NavButton to="/profile" icon={<User size={24} />} label="我的" />
        <NavButton to="/chat" icon={<Bot size={24} />} label="小吴" />
      </nav>
    </div>
  );
}

function NavButton({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center transition-all duration-300 w-16 relative',
          isActive ? 'text-accent' : 'text-primary/50'
        )
      }
    >
      {({ isActive }) => (
        <>
          <motion.div whileTap={{ scale: 0.9 }} className="flex items-center justify-center p-1">
            {icon}
          </motion.div>
          <span className="text-[10px] font-medium font-serif">{label}</span>
          {isActive && <motion.div layoutId="nav-indicator" className="w-1 h-1 bg-accent rounded-full mt-1" />}
        </>
      )}
    </NavLink>
  );
}

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    { to: '/',          icon: '⊞', label: 'Dashboard',     roles: null },
    { to: '/pos',       icon: '⊙', label: 'Point of Sale', roles: null },
    { to: '/products',  icon: '⊟', label: 'Products',      roles: null },
    { to: '/customers', icon: '⊕', label: 'Customers',     roles: null },
    { to: '/suppliers', icon: '⊗', label: 'Suppliers',     roles: null },
    { to: '/reports',   icon: '⊘', label: 'Reports',       roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
    { to: '/users',     icon: '⊛', label: 'Staff',         roles: ['OWNER'] },
  ];

  const visibleNav = navItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-brand-charcoal-mid flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wide">
            HARDWARE<span className="text-brand-orange">OS</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">
            {user?.business?.name || 'Loading...'}
          </p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-gray-400 hover:text-white text-xl p-1"
        >
          ✕
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-orange text-white'
                  : 'text-gray-400 hover:text-white hover:bg-brand-charcoal-mid'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-brand-charcoal-mid">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-red-500/20 transition-all duration-150"
        >
          <span>⊖</span> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-brand-gray-light">

      {/* ── Desktop sidebar (always visible on lg+) ── */}
      <aside className="hidden lg:flex w-60 bg-brand-charcoal flex-col flex-shrink-0">
        <SidebarContent/>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <aside className="relative w-72 bg-brand-charcoal flex flex-col z-10 animate-slideIn">
            <SidebarContent/>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile topbar */}
        <header className="lg:hidden bg-brand-charcoal px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1.5 rounded-lg hover:bg-brand-charcoal-mid transition-colors"
            aria-label="Open menu"
          >
            {/* Hamburger icon */}
            <div className="w-5 h-0.5 bg-white mb-1"/>
            <div className="w-5 h-0.5 bg-white mb-1"/>
            <div className="w-5 h-0.5 bg-white"/>
          </button>

          <h1 className="font-display text-xl font-bold text-white">
            HARDWARE<span className="text-brand-orange">OS</span>
          </h1>

          <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
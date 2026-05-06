// Layout — the sidebar + topbar wrapper for all protected pages
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',          icon: '⊞', label: 'Dashboard'  },
  { to: '/pos',       icon: '⊙', label: 'Point of Sale' },
  { to: '/products',  icon: '⊟', label: 'Products'   },
  { to: '/customers', icon: '⊕', label: 'Customers'  },
  { to: '/suppliers', icon: '⊗', label: 'Suppliers'  },
  { to: '/reports',   icon: '⊘', label: 'Reports'    },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-gray-light">

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-brand-charcoal flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-brand-charcoal-mid">
          <h1 className="font-display text-2xl font-bold text-white tracking-wide">
            HARDWARE<span className="text-brand-orange">OS</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {user?.business?.name || 'Loading...'}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
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

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-brand-charcoal-mid">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-gray-400 text-xs truncate capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-red-500/20 transition-all duration-150"
          >
            <span>⊖</span> Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 animate-fadeIn">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
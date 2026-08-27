import { NavLink, Outlet } from 'react-router-dom';
import { UserSwitcher } from './UserSwitcher';
import { useUsers } from '../context/UserContext';
import { ChatIcon, CardIcon, ShieldIcon, SparkleIcon } from './icons';

export function Layout() {
  const { currentUser } = useUsers();

  const navItems = [
    { to: '/', label: 'Chat', icon: ChatIcon },
    { to: '/subscriptions', label: 'Subscriptions', icon: CardIcon },
    ...(currentUser?.role === 'ADMIN' ? [{ to: '/admin', label: 'Admin', icon: ShieldIcon }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <SparkleIcon className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-bold tracking-tight text-slate-900">
                GGI Backend Test
              </span>
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <UserSwitcher />
        </div>
        <nav className="flex items-center gap-1 border-t border-slate-100 px-4 py-1.5 sm:hidden">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

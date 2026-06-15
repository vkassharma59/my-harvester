import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, cn } from './ui';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/owners', label: 'Owners', end: false },
  { to: '/account-requests', label: 'Account requests', end: false },
];

export function Layout() {
  const { admin, logout } = useAuth();
  return (
    <div className="flex h-full">
      <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-5">
          <span className="text-lg">🌾</span>
          <span className="text-sm font-semibold text-slate-800">Harvester Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <p className="px-2 text-xs font-medium text-slate-700">{admin?.name}</p>
          <p className="px-2 pb-2 text-xs text-slate-400">{admin?.email}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../store/useStore';

const nav = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/summary', label: 'Summary', icon: '📰' },
  { to: '/match', label: 'Match', icon: '🏏' },
  { to: '/momentum', label: 'Momentum', icon: '📈' },
  { to: '/player', label: 'Player', icon: '👤' },
  { to: '/team', label: 'Team', icon: '📊' },
  { to: '/fan', label: 'Fan Tools', icon: '⚡' },
  { to: '/faniq', label: 'Fan IQ', icon: '🧠' },
];

export default function Layout() {
  const toast = useStore((s) => s.toast);

  return (
    <div className="grid-bg flex min-h-screen">
      <aside className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10 bg-navy-light md:bottom-auto md:top-0 md:h-full md:w-56 md:flex-col md:border-r md:border-t-0">
        <div className="hidden p-6 md:block">
          <h1 className="font-stat text-2xl tracking-tight text-green">CRIQ</h1>
          <p className="mt-1 text-xs text-white/50">Cricket Intelligence</p>
        </div>
        <nav className="flex w-full justify-around md:flex-col md:gap-1 md:px-3 md:pb-6">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 px-2 py-3 text-xs transition md:flex-row md:gap-3 md:rounded-lg md:px-4 md:py-3 md:text-sm ${
                  isActive
                    ? 'text-green md:bg-green/10 md:glow-green'
                    : 'text-white/60 hover:text-white'
                }`
              }
            >
              <span className="text-lg md:text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 pb-20 pt-4 md:ml-56 md:pb-8 md:pt-8">
        <div className="mx-auto max-w-6xl px-4">
          <Outlet />
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-green/40 bg-navy-card px-4 py-2 text-sm text-green shadow-lg md:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}

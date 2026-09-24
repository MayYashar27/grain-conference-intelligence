import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, CalendarRange, Contact2 } from 'lucide-react';
import { Logo } from './Logo';

/**
 * Application chrome: a single, quiet top bar with the product areas.
 *   • Conferences — the working conference database, including AI discovery.
 *   • Planning — yearly coverage, attendance, and trip opportunities.
 *   • Leads — captured contacts, relationship intelligence, and research.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const area = pathname.startsWith('/planning')
    ? 'planning'
    : pathname.startsWith('/leads')
      ? 'leads'
      : 'conferences';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-grain-800/40 bg-grain-700 shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Link to="/" className="flex items-center" aria-label="Grain — back to start">
            <Logo height={30} />
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/conferences" active={area === 'conferences'} icon={<Compass size={16} />}>
              Conferences
            </NavItem>
            <NavItem to="/planning" active={area === 'planning'} icon={<CalendarRange size={16} />}>
              Planning
            </NavItem>
            <NavItem to="/leads" active={area === 'leads'} icon={<Contact2 size={16} />}>
              Leads
            </NavItem>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
    </div>
  );
}

function NavItem({
  to,
  active,
  icon,
  children,
}: {
  to: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors sm:px-3 ${
        active
          ? 'bg-white/15 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { SIDEBAR_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]/30">
      <nav className="sticky top-14 p-4 space-y-6 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
        {SIDEBAR_ITEMS.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      'block px-3 py-1.5 rounded-lg text-sm transition-colors',
                      location.pathname === item.href
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

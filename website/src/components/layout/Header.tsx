import { Link, useLocation } from 'react-router-dom';
import { Github, Menu, X, Puzzle } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { NAV_ITEMS, GITHUB_REPO } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--background))]/60">
      <div className="container mx-auto flex h-14 max-w-6xl items-center px-4">
        {/* Logo */}
        <Link to="/" className="mr-8 flex items-center gap-2">
          <Puzzle className="h-6 w-6 text-[hsl(var(--primary))]" />
          <span className="font-semibold text-[hsl(var(--foreground))]">@oxog/plugin</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'transition-colors',
                location.pathname.startsWith(item.href)
                  ? 'text-[hsl(var(--foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* GitHub link */}
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] transition-colors text-sm"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[hsl(var(--accent))]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--background))]">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-3 py-2 rounded-lg transition-colors',
                  location.pathname.startsWith(item.href)
                    ? 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

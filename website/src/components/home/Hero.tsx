import { Link } from 'react-router-dom';
import { ArrowRight, Github } from 'lucide-react';
import { GITHUB_REPO, VERSION } from '@/lib/constants';
import { InstallCommand } from './InstallCommand';

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--primary))]/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[hsl(var(--primary))]/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 text-center">
        {/* Version badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] mb-8">
          <span className="text-[hsl(var(--primary))] text-sm font-medium">v{VERSION}</span>
          <span className="text-[hsl(var(--muted-foreground))] text-sm">· Now Available</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
          <span className="text-[hsl(var(--foreground))]">Zero-Dependency </span>
          <span className="gradient-text">Plugin</span>
          <br />
          <span className="gradient-text">System</span>
        </h1>

        {/* Description */}
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-[hsl(var(--muted-foreground))] mb-10">
          Type-safe micro-kernel architecture with events, lifecycle hooks, and dependency resolution. 
          The plugin system you need for building extensible applications.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))] transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>

        {/* Install command */}
        <InstallCommand />
      </div>
    </section>
  );
}

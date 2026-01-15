import { Sparkles, Shield, Puzzle, Radio, RefreshCw, GitBranch } from 'lucide-react';
import { FEATURES } from '@/lib/constants';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Shield,
  Puzzle,
  Radio,
  RefreshCw,
  GitBranch,
};

export function Features() {
  return (
    <section className="py-20 bg-[hsl(var(--card))]/30">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why <span className="gradient-text">@oxog/plugin</span>?
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
            Built for developers who value simplicity, type safety, and performance.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[hsl(var(--primary))]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

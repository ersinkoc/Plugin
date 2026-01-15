import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { NPM_PACKAGE } from '@/lib/constants';
import { cn } from '@/lib/utils';

const PACKAGE_MANAGERS = [
  { id: 'npm', label: 'npm', command: `npm install ${NPM_PACKAGE}` },
  { id: 'yarn', label: 'yarn', command: `yarn add ${NPM_PACKAGE}` },
  { id: 'pnpm', label: 'pnpm', command: `pnpm add ${NPM_PACKAGE}` },
  { id: 'bun', label: 'bun', command: `bun add ${NPM_PACKAGE}` },
];

export function InstallCommand() {
  const [activeTab, setActiveTab] = useState('npm');
  const [copied, setCopied] = useState(false);

  const activeManager = PACKAGE_MANAGERS.find((pm) => pm.id === activeTab)!;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeManager.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex flex-col items-center">
      {/* Tabs */}
      <div className="flex rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 mb-2">
        {PACKAGE_MANAGERS.map((pm) => (
          <button
            key={pm.id}
            onClick={() => setActiveTab(pm.id)}
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              activeTab === pm.id
                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            {pm.label}
          </button>
        ))}
      </div>

      {/* Command */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <code className="font-mono text-sm text-[hsl(var(--muted-foreground))]">
          {activeManager.command}
        </code>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-[hsl(var(--accent))] transition-colors"
          aria-label="Copy command"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          )}
        </button>
      </div>
    </div>
  );
}

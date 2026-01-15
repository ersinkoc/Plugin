import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { CodeBlock as CodeshineBlock } from '@oxog/codeshine/react';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  // Use appropriate codeshine themes
  const codeTheme = resolvedTheme === 'dark' ? 'one-dark' : 'github-light';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'relative group rounded-xl overflow-hidden',
        'border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm',
        'my-4',
        className
      )}
    >
      {/* IDE Header - macOS style */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          {/* Filename */}
          {filename && (
            <span className="text-sm text-[hsl(var(--muted-foreground))] font-mono">
              {filename}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
            {language}
          </span>
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
              'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
              'hover:bg-[hsl(var(--accent))] transition-colors'
            )}
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Block */}
      <div
        className={cn(
          'overflow-x-auto',
          // Container styles
          '[&_.cs-codeblock]:bg-transparent! [&_.cs-codeblock]:rounded-none! [&_.cs-codeblock]:p-4!',
          '[&_.cs-code]:bg-transparent! [&_.cs-code]:flex [&_.cs-code]:flex-col',
          // Line styles - each line as a flex row
          '[&_.cs-line]:flex [&_.cs-line]:leading-relaxed',
          // Line number styles
          '[&_.cs-line-number]:select-none [&_.cs-line-number]:shrink-0',
          '[&_.cs-line-number]:w-8 [&_.cs-line-number]:pr-4 [&_.cs-line-number]:text-right',
          '[&_.cs-line-number]:text-[hsl(var(--muted-foreground))]/50',
          // Line content styles
          '[&_.cs-line-content]:flex-1 [&_.cs-line-content]:whitespace-pre'
        )}
      >
        <CodeshineBlock
          code={code.trim()}
          language={language}
          theme={codeTheme}
          lineNumbers={showLineNumbers}
        />
      </div>
    </div>
  );
}

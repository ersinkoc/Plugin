import { Hero } from '@/components/home/Hero';
import { QuickStart } from '@/components/home/QuickStart';
import { Features } from '@/components/home/Features';

export function Home() {
  return (
    <div>
      <Hero />
      <QuickStart />
      <Features />
    </div>
  );
}

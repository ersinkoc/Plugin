import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';

export function Docs() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem-4rem)]">
      <Sidebar />
      <div className="flex-1 py-8 px-8 max-w-4xl">
        <Outlet />
      </div>
    </div>
  );
}

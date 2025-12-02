'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  const linkClasses = (path: string) => {
    const base = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';
    const active = 'bg-blue-600 text-white';
    const inactive = 'text-gray-700 hover:bg-gray-100 hover:text-blue-600';

    return `${base} ${isActive(path) ? active : inactive}`;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1">
            <Link href="/" className="flex items-center space-x-2 mr-8">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Workflow</span>
            </Link>

            <Link href="/dashboard" className={linkClasses('/dashboard')}>
              Dashboard
            </Link>

            <Link href="/workflows" className={linkClasses('/workflows')}>
              Workflows
            </Link>

            <Link href="/templates" className={linkClasses('/templates')}>
              Templates
            </Link>

            <Link href="/tasks" className={linkClasses('/tasks')}>
              Tasks
            </Link>

            <Link href="/visualization" className={linkClasses('/visualization')}>
              Visualization
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

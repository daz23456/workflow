import type { Meta, StoryObj } from '@storybook/react';
import Link from 'next/link';

/**
 * Navigation provides the main application navigation bar.
 *
 * Features:
 * - Logo with link to home
 * - Navigation links (Workflows, Templates, Tasks)
 * - Active state highlighting
 * - Responsive design
 *
 * Note: This is a visual-only story since the actual component uses Next.js usePathname.
 */

interface NavigationVisualProps {
  activePath: string;
}

function NavigationVisual({ activePath }: NavigationVisualProps) {
  const isActive = (path: string) => {
    if (path === '/') {
      return activePath === '/';
    }
    return activePath?.startsWith(path);
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
            <a href="/" className="flex items-center space-x-2 mr-8">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">W</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Workflow</span>
            </a>

            <a href="/workflows" className={linkClasses('/workflows')}>
              Workflows
            </a>

            <a href="/templates" className={linkClasses('/templates')}>
              Templates
            </a>

            <a href="/tasks" className={linkClasses('/tasks')}>
              Tasks
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

const meta = {
  title: 'Navigation/MainNavigation',
  component: NavigationVisual,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavigationVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Home page active
 */
export const HomePage: Story = {
  args: {
    activePath: '/',
  },
};

/**
 * Workflows page active
 */
export const WorkflowsPage: Story = {
  args: {
    activePath: '/workflows',
  },
};

/**
 * Workflow detail page active
 */
export const WorkflowDetailPage: Story = {
  args: {
    activePath: '/workflows/user-signup',
  },
};

/**
 * Templates page active
 */
export const TemplatesPage: Story = {
  args: {
    activePath: '/templates',
  },
};

/**
 * Tasks page active
 */
export const TasksPage: Story = {
  args: {
    activePath: '/tasks',
  },
};

/**
 * Task detail page active
 */
export const TaskDetailPage: Story = {
  args: {
    activePath: '/tasks/fetch-user',
  },
};

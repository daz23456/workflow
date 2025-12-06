import { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard | Workflow Orchestration',
  description: 'System metrics and workflow health dashboard',
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen theme-gradient">
      <div className="container mx-auto px-4 py-8">
        <Dashboard />
      </div>
    </div>
  );
}

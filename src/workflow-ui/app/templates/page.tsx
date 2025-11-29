import { Metadata } from 'next';
import { TemplateBrowser } from '@/components/templates/template-browser';

export const metadata: Metadata = {
  title: 'Workflow Templates | Workflow Orchestration',
  description: 'Browse and deploy pre-built workflow templates',
};

export default function TemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workflow Templates</h1>
        <p className="mt-2 text-gray-600">
          Browse pre-built workflow templates to accelerate your workflow creation. Filter by
          category, difficulty, or tags to find the perfect starting point.
        </p>
      </div>

      <TemplateBrowser />
    </div>
  );
}

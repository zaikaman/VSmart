'use client';

import { ProjectList } from '@/components/projects/project-list';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dự Án</h1>
          <p className="text-gray-600 mt-1">
            Quản lý tất cả các dự án của bạn
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo Dự Án
        </Button>
      </div>

      <ProjectList />
    </div>
  );
}

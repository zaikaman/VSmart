'use client';

import { Badge } from '@/components/ui/badge';
import { Project } from '@/lib/hooks/use-projects';
import Link from 'next/link';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    todo: 'bg-gray-500',
    'in-progress': 'bg-blue-500',
    done: 'bg-green-500',
  };

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg">{project.ten}</h3>
          <Badge className={statusColors[project.trang_thai]}>
            {project.trang_thai}
          </Badge>
        </div>
        
        {project.mo_ta && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {project.mo_ta}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-500">Tiến độ: </span>
            <span className="font-medium">
              {project.phan_tram_hoan_thanh.toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Deadline: </span>
            <span className="font-medium">
              {new Date(project.deadline).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${project.phan_tram_hoan_thanh}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

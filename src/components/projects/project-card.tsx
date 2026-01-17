'use client';

import { Badge } from '@/components/ui/badge';
import { Project } from '@/lib/hooks/use-projects';
import Link from 'next/link';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    todo: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    'in-progress': 'bg-[#191a23] text-white hover:bg-[#2a2b35]', // Black (Primary)
    done: 'bg-[#b9ff66] text-black hover:bg-[#a8e55a]', // Neon Green (Brand/Done)
  };

  const statusLabels = {
    todo: 'Cần làm',
    'in-progress': 'Đang thực hiện',
    done: 'Hoàn thành',
  };

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="border border-gray-100 rounded-[20px] p-5 hover:shadow-xl transition-all cursor-pointer bg-white group hover:border-[#b9ff66]/50">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-lg group-hover:text-[#191a23] transition-colors">{project.ten}</h3>
          <Badge className={`${statusColors[project.trang_thai as keyof typeof statusColors]} border-0 px-3 py-1 rounded-full`}>
            {statusLabels[project.trang_thai as keyof typeof statusLabels]}
          </Badge>
        </div>

        {project.mo_ta && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
            {project.mo_ta}
          </p>
        )}

        <div className="flex items-center justify-between text-sm mb-2">
          <div>
            <span className="text-gray-500">Tiến độ: </span>
            <span className="font-bold text-[#191a23]">
              {project.phan_tram_hoan_thanh.toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Deadline: </span>
            <span className="font-medium text-[#191a23]">
              {new Date(project.deadline).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>

        <div className="mt-1 w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-[#b9ff66] h-full rounded-full transition-all group-hover:bg-[#191a23]"
            style={{ width: `${project.phan_tram_hoan_thanh}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

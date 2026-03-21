'use client';

import { Badge } from '@/components/ui/badge';
import { Project } from '@/lib/hooks/use-projects';
import Link from 'next/link';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import { Clock, ActivitySquare, CheckCircle2 } from 'lucide-react';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'] });

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusConfig = {
    todo: {
      color: 'border-gray-500 text-gray-400',
      bg: 'bg-gray-500/10',
      icon: Clock,
      label: 'PENDING',
    },
    'in-progress': {
      color: 'border-blue-400 text-blue-400',
      bg: 'bg-blue-400/10',
      icon: ActivitySquare,
      label: 'ACTIVE',
    },
    done: {
      color: 'border-[#b9ff66] text-[#b9ff66]',
      bg: 'bg-[#b9ff66]/10',
      icon: CheckCircle2,
      label: 'COMPLETE',
    },
  };

  const status = statusConfig[project.trang_thai as keyof typeof statusConfig] || statusConfig.todo;
  const StatusIcon = status.icon;

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className={`group relative bg-[#0a0a0a] border border-[#222] p-6 hover:border-[#b9ff66] transition-all duration-300 flex flex-col h-full hover:-translate-y-1 block ${bricolage.className}`}>

        {/* Top Highlight Bar */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-transparent group-hover:via-[#b9ff66] group-hover:to-transparent transition-all duration-500" />

        <div className="flex items-start justify-between mb-4 gap-4">
          <h3 className="font-bold text-xl text-white group-hover:text-[#b9ff66] transition-colors leading-tight line-clamp-2">
            {project.ten}
          </h3>
          <div className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 ${status.bg} border ${status.color} rounded text-[10px] font-bold tracking-widest uppercase`}>
            <StatusIcon className="w-3 h-3" />
            <span>{status.label}</span>
          </div>
        </div>

        {project.mo_ta ? (
          <p className="text-sm text-[#888] mb-6 line-clamp-2 leading-relaxed font-sans">
            {project.mo_ta}
          </p>
        ) : (
          <p className="text-sm text-[#444] italic mb-6 font-sans">
            No description provided.
          </p>
        )}

        {/* Footer/Progress */}
        <div className="mt-auto">
          <div className="flex flex-col gap-3">

            {/* Meta info */}
            <div className={`flex items-center justify-between text-xs ${jetbrains.className} text-[#666]`}>
              <div className="flex flex-col">
                <span className="uppercase text-[10px] tracking-widest text-[#555] mb-1">Status</span>
                <span className="text-white font-semibold">{project.phan_tram_hoan_thanh.toFixed(0)}%</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="uppercase text-[10px] tracking-widest text-[#555] mb-1">Deadline</span>
                <span className="text-white font-semibold">
                  {new Date(project.deadline).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Brutalist Progress Bar */}
            <div className="w-full bg-[#1a1a1a] h-1 relative overflow-hidden mt-1">
              <div
                className="absolute top-0 left-0 h-full bg-[#b9ff66] transition-all duration-1000 ease-out group-hover:shadow-[0_0_10px_#b9ff66]"
                style={{ width: `${project.phan_tram_hoan_thanh}%` }}
              />
              {/* Grid overlay for progress bar */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cGF0aCBkPSJNIDQgMCBMIDAgNCIgc3Ryb2tlPSJyZ2JhKDIxLCAyMSwgMjEsIDAuOCkiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] mix-blend-overlay opacity-50 pointer-events-none" />
            </div>

          </div>
        </div>
      </div>
    </Link>
  );
}

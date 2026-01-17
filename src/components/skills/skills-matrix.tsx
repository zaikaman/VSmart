'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Users, 
  Award, 
  ChevronDown, 
  ChevronUp,
  User
} from 'lucide-react';

const TRINH_DO_COLORS: Record<string, string> = {
  beginner: 'bg-gray-100 text-gray-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-[#b9ff66]/30 text-[#191a23]',
  expert: 'bg-[#191a23] text-white',
};

const TRINH_DO_LABELS: Record<string, string> = {
  beginner: 'Mới bắt đầu',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
  expert: 'Chuyên gia',
};

interface SkillUser {
  id: string;
  ten: string;
  email: string;
  avatar_url: string | null;
  trinh_do: string;
  nam_kinh_nghiem: number;
}

interface SkillMatrixEntry {
  ten_ky_nang: string;
  so_nguoi: number;
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
  tong_nam_kinh_nghiem: number;
  nguoi_dung: SkillUser[];
}

interface SkillsMatrixProps {
  skills: SkillMatrixEntry[];
  tongNguoiDung: number;
  tongKyNang: number;
}

export function SkillsMatrix({ skills, tongNguoiDung, tongKyNang }: SkillsMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  // Lọc skills theo search term
  const filteredSkills = skills.filter(skill =>
    skill.ten_ky_nang.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (skillName: string) => {
    setExpandedSkill(expandedSkill === skillName ? null : skillName);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#191a23] to-[#2a2b35]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Tổng thành viên</p>
                <p className="text-3xl font-bold text-white mt-1">{tongNguoiDung}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-[#b9ff66]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-[#b9ff66] to-[#a8e55a]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#191a23]/70">Tổng kỹ năng</p>
                <p className="text-3xl font-bold text-[#191a23] mt-1">{tongKyNang}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#191a23]/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-[#191a23]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Trung bình/người</p>
                <p className="text-3xl font-bold text-[#191a23] mt-1">
                  {tongNguoiDung > 0 
                    ? (skills.reduce((sum, s) => sum + s.so_nguoi, 0) / tongNguoiDung).toFixed(1)
                    : 0
                  }
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Tìm kiếm kỹ năng..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Skills Matrix Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ma trận kỹ năng</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSkills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Không tìm thấy kỹ năng nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
                <div className="col-span-4">Kỹ năng</div>
                <div className="col-span-1 text-center">Số người</div>
                <div className="col-span-2 text-center">Mới bắt đầu</div>
                <div className="col-span-2 text-center">Trung bình</div>
                <div className="col-span-1 text-center">Nâng cao</div>
                <div className="col-span-1 text-center">Chuyên gia</div>
                <div className="col-span-1"></div>
              </div>

              {/* Rows */}
              {filteredSkills.map((skill) => {
                const isExpanded = expandedSkill === skill.ten_ky_nang;
                
                return (
                  <div key={skill.ten_ky_nang}>
                    <div 
                      className={`
                        grid grid-cols-12 gap-2 px-4 py-3 rounded-lg border transition-all cursor-pointer
                        ${isExpanded 
                          ? 'border-[#b9ff66] bg-[#b9ff66]/5' 
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                        }
                      `}
                      onClick={() => toggleExpand(skill.ten_ky_nang)}
                    >
                      <div className="col-span-4 font-medium text-[#191a23]">
                        {skill.ten_ky_nang}
                      </div>
                      <div className="col-span-1 text-center">
                        <Badge className="bg-[#191a23] text-white border-0">
                          {skill.so_nguoi}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-center">
                        {skill.beginner > 0 && (
                          <Badge className="bg-gray-100 text-gray-700 border-0">
                            {skill.beginner}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        {skill.intermediate > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            {skill.intermediate}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-1 text-center">
                        {skill.advanced > 0 && (
                          <Badge className="bg-[#b9ff66]/30 text-[#191a23] border-0">
                            {skill.advanced}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-1 text-center">
                        {skill.expert > 0 && (
                          <Badge className="bg-[#191a23] text-white border-0">
                            {skill.expert}
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Section - User List */}
                    {isExpanded && skill.nguoi_dung.length > 0 && (
                      <div className="ml-8 mt-2 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm font-medium text-gray-600 mb-3">
                          Danh sách thành viên có kỹ năng này:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {skill.nguoi_dung.map((user) => (
                            <div 
                              key={user.id}
                              className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="bg-[#191a23] text-white text-xs">
                                  {user.ten.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {user.ten}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {user.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`${TRINH_DO_COLORS[user.trinh_do]} border-0 text-xs`}>
                                  {TRINH_DO_LABELS[user.trinh_do]}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {user.nam_kinh_nghiem} năm
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

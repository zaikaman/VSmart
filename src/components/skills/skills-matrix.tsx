'use client';

import { useState } from 'react';
import { Award, ChevronDown, ChevronUp, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TRINH_DO_COLORS: Record<string, string> = {
  beginner: 'bg-stone-100 text-stone-700',
  intermediate: 'bg-sky-100 text-sky-700',
  advanced: 'bg-[#dff3bf] text-[#29411f]',
  expert: 'bg-[#1f2b1f] text-white',
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
  tongNamKinhNghiem: number;
  matDoKyNang: number;
}

export function SkillsMatrix({ skills, tongNguoiDung, tongKyNang, tongNamKinhNghiem, matDoKyNang }: SkillsMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const filteredSkills = skills.filter((skill) => skill.ten_ky_nang.toLowerCase().includes(searchTerm.toLowerCase()));
  const tongChuyenGia = skills.reduce((sum, skill) => sum + skill.expert, 0);
  const tongNguoiSoHuuKyNang = skills.reduce((sum, skill) => sum + skill.so_nguoi, 0);
  const tiLeChuyenGia = tongNguoiSoHuuKyNang > 0 ? (tongChuyenGia / tongNguoiSoHuuKyNang) * 100 : 0;

  const toggleExpand = (skillName: string) => {
    setExpandedSkill(expandedSkill === skillName ? null : skillName);
  };

  return (
    <section className="rounded-[30px] border border-[#dfe5d6] bg-white/90 px-5 py-5 shadow-[0_22px_65px_-48px_rgba(89,109,84,0.35)] backdrop-blur-sm">
      <div className="mb-5 flex flex-col gap-3 border-b border-[#edf1e8] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-xl font-semibold text-[#1f2b1f]">Ma trận kỹ năng</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[#dde5d5] bg-[#f7faf2] px-3 py-1 text-xs font-medium text-[#5d6a58]">
            {tongNguoiDung} thành viên
          </span>
          <span className="rounded-full border border-[#dde5d5] bg-[#f7faf2] px-3 py-1 text-xs font-medium text-[#5d6a58]">
            {tongKyNang} kỹ năng
          </span>
          <span className="rounded-full border border-[#dde5d5] bg-[#f7faf2] px-3 py-1 text-xs font-medium text-[#5d6a58]">
            {tongNamKinhNghiem} năm kinh nghiệm cộng dồn
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Mật độ kỹ năng</p>
            <Users className="h-4 w-4 text-[#56724d]" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-[#223021]">{matDoKyNang.toFixed(1)}</p>
        </div>

        <div className="rounded-[24px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Tỷ lệ chuyên gia</p>
            <Award className="h-4 w-4 text-[#56724d]" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-[#223021]">{tiLeChuyenGia.toFixed(0)}%</p>
        </div>

        <div className="rounded-[24px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Hồ sơ chuyên gia</div>
          <p className="mt-3 text-2xl font-semibold text-[#223021]">{tongChuyenGia}</p>
        </div>

        <div className="rounded-[24px] border border-[#e4eadf] bg-[#fbfcf8] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Kinh nghiệm cộng dồn</div>
          <p className="mt-3 text-2xl font-semibold text-[#223021]">{tongNamKinhNghiem}</p>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-[#e5eadf] bg-[#fbfcf8] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9483]" />
          <Input
            placeholder="Tìm kỹ năng như React, Figma, quản lý dự án..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 border-[#dfe6d7] bg-white pl-10 text-[#223021] placeholder:text-[#8a9483]"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(TRINH_DO_LABELS).map(([value, label]) => (
            <span key={value} className={`rounded-full px-3 py-1 text-xs font-medium ${TRINH_DO_COLORS[value]}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        {filteredSkills.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-[#dce4d3] bg-[#f8faf4] px-6 py-12 text-center">
            {skills.length === 0 ? (
              <>
                <p className="text-lg font-semibold text-[#223021]">Chưa có dữ liệu kỹ năng để hiển thị.</p>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#66735f]">Thành viên cần bổ sung kỹ năng trong hồ sơ cá nhân để ma trận bắt đầu hiển thị dữ liệu.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-[#223021]">Không có kỹ năng nào khớp với từ khóa này.</p>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#66735f]">Thử đổi cách viết hoặc bỏ bớt từ khóa.</p>
              </>
            )}
          </div>
        ) : (
          <div className="min-w-[860px] space-y-2">
            <div className="grid grid-cols-12 gap-2 rounded-[20px] bg-[#f4f7f0] px-4 py-3 text-sm font-semibold text-[#647160]">
              <div className="col-span-4">Kỹ năng</div>
              <div className="col-span-1 text-center">Số người</div>
              <div className="col-span-2 text-center">Mới bắt đầu</div>
              <div className="col-span-2 text-center">Trung bình</div>
              <div className="col-span-1 text-center">Nâng cao</div>
              <div className="col-span-1 text-center">Chuyên gia</div>
              <div className="col-span-1" />
            </div>

            {filteredSkills.map((skill) => {
              const isExpanded = expandedSkill === skill.ten_ky_nang;

              return (
                <div key={skill.ten_ky_nang}>
                  <div
                    className={`grid grid-cols-12 gap-2 rounded-[22px] border px-4 py-3 transition-all ${
                      isExpanded
                        ? 'border-[#cadeb7] bg-[#f7fbf0] shadow-[0_18px_40px_-34px_rgba(89,109,84,0.4)]'
                        : 'border-[#e6ebdf] bg-white hover:border-[#d6dfcb] hover:bg-[#fcfdf9]'
                    } cursor-pointer`}
                    onClick={() => toggleExpand(skill.ten_ky_nang)}
                  >
                    <div className="col-span-4 flex items-center">
                      <div>
                        <p className="font-medium text-[#1f2b1f]">{skill.ten_ky_nang}</p>
                        <p className="mt-1 text-xs text-[#7b8675]">
                          {skill.tong_nam_kinh_nghiem} năm kinh nghiệm cộng dồn
                        </p>
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Badge className="border-0 bg-[#1f2b1f] text-white">{skill.so_nguoi}</Badge>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      {skill.beginner > 0 ? <Badge className="border-0 bg-stone-100 text-stone-700">{skill.beginner}</Badge> : <span className="text-sm text-[#b0b7ab]">-</span>}
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      {skill.intermediate > 0 ? <Badge className="border-0 bg-sky-100 text-sky-700">{skill.intermediate}</Badge> : <span className="text-sm text-[#b0b7ab]">-</span>}
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {skill.advanced > 0 ? <Badge className="border-0 bg-[#dff3bf] text-[#29411f]">{skill.advanced}</Badge> : <span className="text-sm text-[#b0b7ab]">-</span>}
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {skill.expert > 0 ? <Badge className="border-0 bg-[#1f2b1f] text-white">{skill.expert}</Badge> : <span className="text-sm text-[#b0b7ab]">-</span>}
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#5e6a59] hover:bg-[#eef3e7]">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && skill.nguoi_dung.length > 0 ? (
                    <div className="mx-3 mt-2 mb-4 rounded-[22px] border border-[#e6ebdf] bg-[#fafcf7] p-4">
                      <p className="mb-3 text-sm font-medium text-[#5f6d59]">Những thành viên đang có kỹ năng này</p>
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                        {skill.nguoi_dung.map((user) => (
                          <div key={user.id} className="flex items-center gap-3 rounded-[18px] border border-[#e7ece1] bg-white p-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="bg-[#1f2b1f] text-xs text-white">
                                {user.ten.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#223021]">{user.ten}</p>
                              <p className="truncate text-xs text-[#7d8777]">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${TRINH_DO_COLORS[user.trinh_do] || 'bg-stone-100 text-stone-700'} border-0 text-xs`}>
                                {TRINH_DO_LABELS[user.trinh_do] || user.trinh_do}
                              </Badge>
                              <span className="text-xs text-[#7d8777]">{user.nam_kinh_nghiem} năm</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

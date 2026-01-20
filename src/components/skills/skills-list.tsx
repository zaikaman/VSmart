'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

const TRINH_DO_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Mới bắt đầu', color: 'bg-gray-400' },
  intermediate: { label: 'Trung bình', color: 'bg-blue-500' },
  advanced: { label: 'Nâng cao', color: 'bg-[#a8e55a]' },
  expert: { label: 'Chuyên gia', color: 'bg-[#191a23]' },
};

const TRINH_DO_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];

export interface Skill {
  id: string;
  ten_ky_nang: string;
  trinh_do: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  nam_kinh_nghiem: number;
  ngay_tao?: string;
}

interface SkillsListProps {
  skills: Skill[];
  onUpdateSkill?: (id: string, data: { trinh_do?: string; nam_kinh_nghiem?: number }) => Promise<void>;
  onDeleteSkill?: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  readOnly?: boolean;
}

export function SkillsList({ 
  skills, 
  onUpdateSkill, 
  onDeleteSkill,
  isUpdating,
  isDeleting,
  readOnly = false 
}: SkillsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ trinh_do: string; nam_kinh_nghiem: number }>({
    trinh_do: 'intermediate',
    nam_kinh_nghiem: 0,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStartEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setEditData({
      trinh_do: skill.trinh_do,
      nam_kinh_nghiem: skill.nam_kinh_nghiem,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({ trinh_do: 'intermediate', nam_kinh_nghiem: 0 });
  };

  const handleSaveEdit = async (id: string) => {
    if (onUpdateSkill) {
      try {
        await onUpdateSkill(id, editData);
        setEditingId(null);
      } catch (error) {
        // Error đã được xử lý trong mutation
        console.error('Lỗi khi cập nhật kỹ năng:', error);
      }
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    if (onDeleteSkill) {
      onDeleteSkill(id);
    }
  };

  const handleTrinhDoChange = (newTrinhDo: string) => {
    setEditData(prev => ({ ...prev, trinh_do: newTrinhDo }));
  };

  if (skills.length === 0) {
    return (
      <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
        <p className="text-sm text-gray-400">Chưa có kỹ năng nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {skills.map((skill) => {
        const isEditing = editingId === skill.id;
        const trinhDoInfo = TRINH_DO_LABELS[skill.trinh_do] || TRINH_DO_LABELS.intermediate;
        
        return (
          <div 
            key={skill.id}
            className={`
              grid grid-cols-1 md:grid-cols-[1fr,auto,auto,auto] gap-4 items-center p-3 rounded-lg border transition-all
              ${isEditing ? 'border-[#b9ff66] bg-[#b9ff66]/5' : 'border-gray-100 bg-white hover:border-gray-200'}
            `}
          >
            {/* Tên kỹ năng */}
            <span className="font-medium text-gray-900 truncate">
              {skill.ten_ky_nang}
            </span>

            {/* Trình độ */}
            {isEditing ? (
              <div className="flex gap-1">
                {TRINH_DO_ORDER.map((td) => (
                  <button
                    key={td}
                    type="button"
                    onClick={() => handleTrinhDoChange(td)}
                    className={`
                       w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white border border-gray-200
                      ${editData.trinh_do === td ? 'ring-2 ring-offset-1 ring-[#191a23] border-transparent' : 'opacity-50 hover:opacity-100'}
                    `}
                    title={TRINH_DO_LABELS[td].label}
                  >
                    <div className={`w-3 h-3 rounded-full ${TRINH_DO_LABELS[td].color}`} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                <div className={`w-2 h-2 rounded-full ${trinhDoInfo.color}`} />
                <span className="text-sm text-gray-600">{trinhDoInfo.label}</span>
              </div>
            )}

            {/* Số năm kinh nghiệm */}
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={editData.nam_kinh_nghiem}
                  onChange={(e) => setEditData(prev => ({ 
                    ...prev, 
                    nam_kinh_nghiem: Math.max(0, Math.min(50, parseInt(e.target.value) || 0)) 
                  }))}
                  className="w-16 h-8 text-center text-sm"
                />
                <span className="text-xs text-gray-500">năm</span>
              </div>
            ) : (
              <span className="text-sm text-gray-500 w-16 text-right">
                {skill.nam_kinh_nghiem} năm
              </span>
            )}

            {/* Actions */}
            {!readOnly && (
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSaveEdit(skill.id)}
                      disabled={isUpdating}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(skill)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-[#191a23] hover:bg-gray-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(skill.id)}
                      disabled={isDeleting && deletingId === skill.id}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      {isDeleting && deletingId === skill.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

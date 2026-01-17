'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown } from 'lucide-react';

// Danh sách kỹ năng phổ biến để gợi ý
const COMMON_SKILLS = [
  // Frontend
  'React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS', 'SASS',
  // Backend
  'Node.js', 'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby', 'Express.js', 'FastAPI', 'Django', 'Spring Boot',
  // Database
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase', 'Firebase', 'Prisma', 'SQL',
  // DevOps & Cloud
  'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'CI/CD', 'Linux', 'Nginx',
  // Mobile
  'React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android',
  // AI/ML
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'OpenAI', 'LangChain',
  // Design & Tools
  'Figma', 'Adobe XD', 'UI/UX Design', 'Git', 'Jira', 'Agile', 'Scrum',
  // Other
  'REST API', 'GraphQL', 'WebSocket', 'Testing', 'Security', 'Performance Optimization',
];

const TRINH_DO_OPTIONS = [
  { value: 'beginner', label: 'Mới bắt đầu', color: 'bg-gray-100 text-gray-700' },
  { value: 'intermediate', label: 'Trung bình', color: 'bg-blue-100 text-blue-700' },
  { value: 'advanced', label: 'Nâng cao', color: 'bg-[#b9ff66]/30 text-[#191a23]' },
  { value: 'expert', label: 'Chuyên gia', color: 'bg-[#191a23] text-white' },
];

interface SkillsInputProps {
  onAddSkill: (skill: { ten_ky_nang: string; trinh_do: string; nam_kinh_nghiem: number }) => void;
  isLoading?: boolean;
  existingSkills?: string[];
}

export function SkillsInput({ onAddSkill, isLoading, existingSkills = [] }: SkillsInputProps) {
  const [tenKyNang, setTenKyNang] = useState('');
  const [trinhDo, setTrinhDo] = useState('intermediate');
  const [namKinhNghiem, setNamKinhNghiem] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTrinhDoDropdown, setShowTrinhDoDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const trinhDoRef = useRef<HTMLDivElement>(null);

  // Lọc gợi ý kỹ năng
  const filteredSuggestions = COMMON_SKILLS.filter(skill => 
    skill.toLowerCase().includes(tenKyNang.toLowerCase()) &&
    !existingSkills.some(existing => existing.toLowerCase() === skill.toLowerCase())
  ).slice(0, 8);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (trinhDoRef.current && !trinhDoRef.current.contains(event.target as Node)) {
        setShowTrinhDoDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (!tenKyNang.trim()) return;
    
    onAddSkill({
      ten_ky_nang: tenKyNang.trim(),
      trinh_do: trinhDo,
      nam_kinh_nghiem: namKinhNghiem,
    });
    
    // Reset form
    setTenKyNang('');
    setNamKinhNghiem(1);
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (skill: string) => {
    setTenKyNang(skill);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const selectedTrinhDo = TRINH_DO_OPTIONS.find(t => t.value === trinhDo);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto,auto] gap-3 items-start">
        {/* Tên kỹ năng */}
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="Kỹ năng (ví dụ: React, Python...)"
            value={tenKyNang}
            onChange={(e) => {
              setTenKyNang(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => setShowSuggestions(tenKyNang.length > 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
            className="w-full"
          />
          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              {filteredSuggestions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSelectSuggestion(skill)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trình độ dropdown */}
        <div className="relative min-w-[140px]" ref={trinhDoRef}>
          <button
            type="button"
            onClick={() => setShowTrinhDoDropdown(!showTrinhDoDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white text-sm hover:border-gray-400 transition-colors h-10"
            disabled={isLoading}
          >
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                selectedTrinhDo?.value === 'beginner' ? 'bg-gray-400' :
                selectedTrinhDo?.value === 'intermediate' ? 'bg-blue-500' :
                selectedTrinhDo?.value === 'advanced' ? 'bg-[#a8e55a]' : 'bg-[#191a23]'
              }`} />
              {selectedTrinhDo?.label}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showTrinhDoDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showTrinhDoDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[150px]">
              {TRINH_DO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setTrinhDo(option.value);
                    setShowTrinhDoDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg text-sm"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    option.value === 'beginner' ? 'bg-gray-400' :
                    option.value === 'intermediate' ? 'bg-blue-500' :
                    option.value === 'advanced' ? 'bg-[#a8e55a]' : 'bg-[#191a23]'
                  }`} />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Số năm kinh nghiệm */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={50}
            value={namKinhNghiem}
            onChange={(e) => setNamKinhNghiem(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
            disabled={isLoading}
            className="w-20 text-center"
          />
          <span className="text-sm text-gray-600 whitespace-nowrap">năm</span>
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={!tenKyNang.trim() || isLoading}
          className="bg-[#191a23] hover:bg-[#2a2b35] text-white whitespace-nowrap"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm
        </Button>
      </div>
    </div>
  );
}

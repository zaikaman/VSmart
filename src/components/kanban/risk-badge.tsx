'use client';

import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type RiskLevel = 'low' | 'medium' | 'high';

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  riskScore?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const riskConfig = {
  low: {
    label: 'Thấp',
    icon: CheckCircle2,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
    iconColor: 'text-green-600',
  },
  medium: {
    label: 'Trung bình',
    icon: AlertTriangle,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    iconColor: 'text-yellow-600',
  },
  high: {
    label: 'Cao',
    icon: AlertCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    iconColor: 'text-red-600',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-1.5 py-0.5 text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    badge: 'px-2 py-1 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    badge: 'px-2.5 py-1.5 text-sm',
    icon: 'w-4 h-4',
  },
};

export function RiskBadge({
  riskLevel,
  riskScore,
  showScore = false,
  size = 'sm',
  className,
}: RiskBadgeProps) {
  const config = riskConfig[riskLevel];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeStyles.badge,
        className
      )}
    >
      <Icon className={cn(sizeStyles.icon, config.iconColor)} />
      {showScore && riskScore !== undefined ? (
        <span>{riskScore}%</span>
      ) : (
        <span>{config.label}</span>
      )}
    </span>
  );

  // Nếu có risk score, hiển thị tooltip với thông tin chi tiết
  if (riskScore !== undefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>Rủi ro: {config.label}</p>
            <p>Điểm: {riskScore}%</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

/**
 * RiskIndicator - Chỉ hiển thị icon với màu sắc
 * Dùng cho các vị trí nhỏ hẹp
 */
interface RiskIndicatorProps {
  riskLevel: RiskLevel;
  riskScore?: number;
  className?: string;
}

export function RiskIndicator({ riskLevel, riskScore, className }: RiskIndicatorProps) {
  const config = riskConfig[riskLevel];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex', className)}>
            <Icon className={cn('w-4 h-4', config.iconColor)} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Rủi ro: {config.label}</p>
          {riskScore !== undefined && <p>Điểm: {riskScore}%</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * RiskProgressBar - Thanh tiến trình với màu theo risk level
 */
interface RiskProgressBarProps {
  progress: number;
  riskLevel?: RiskLevel;
  className?: string;
}

export function RiskProgressBar({ progress, riskLevel = 'low', className }: RiskProgressBarProps) {
  const progressColors = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  };

  return (
    <div className={cn('w-full bg-gray-200 rounded-full h-1.5', className)}>
      <div
        className={cn('h-1.5 rounded-full transition-all', progressColors[riskLevel])}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const defaultSettings = {
  notifications: {
    emailTaskAssigned: true,
    emailDeadlineReminder: true,
    pushEnabled: false,
    emailComments: true,
    emailTeamDigest: true,
    emailReviewRequests: true,
    emailApprovalResults: true,
  },
  appearance: {
    theme: 'system',
    language: 'vi',
  },
  dashboard: {
    defaultPage: '/dashboard',
    itemsPerPage: 10,
  },
  savedViews: {
    kanban: [],
    planning: [],
    analytics: [],
  },
};

const savedViewSchema = z.object({
  id: z.string().trim().min(1, 'ID view không hợp lệ.').max(64, 'ID view quá dài.'),
  name: z.string().trim().min(1, 'Tên view không được để trống.').max(80, 'Tên view không được vượt quá 80 ký tự.'),
  value: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime('Thời gian tạo view không hợp lệ.'),
});

const settingsPatchSchema = z
  .object({
    notifications: z
      .object({
        emailTaskAssigned: z.boolean().optional(),
        emailDeadlineReminder: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        emailComments: z.boolean().optional(),
        emailTeamDigest: z.boolean().optional(),
        emailReviewRequests: z.boolean().optional(),
        emailApprovalResults: z.boolean().optional(),
      })
      .strict()
      .optional(),
    appearance: z
      .object({
        theme: z.enum(['light', 'dark', 'system']).optional(),
        language: z.enum(['vi', 'en']).optional(),
      })
      .strict()
      .optional(),
    dashboard: z
      .object({
        defaultPage: z
          .enum([
            '/dashboard',
            '/dashboard/projects',
            '/dashboard/kanban',
            '/dashboard/planning',
            '/dashboard/reviews',
            '/dashboard/analytics',
          ])
          .optional(),
        itemsPerPage: z.union([z.literal(10), z.literal(25), z.literal(50)]).optional(),
      })
      .strict()
      .optional(),
    savedViews: z
      .object({
        kanban: z.array(savedViewSchema).max(8, 'Tối đa 8 view đã lưu cho Kanban.').optional(),
        planning: z.array(savedViewSchema).max(8, 'Tối đa 8 view đã lưu cho Planning.').optional(),
        analytics: z.array(savedViewSchema).max(8, 'Tối đa 8 view đã lưu cho Analytics.').optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Không có thay đổi cài đặt hợp lệ để cập nhật.',
  });

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { data: userData, error } = await supabase
      .from('nguoi_dung')
      .select('settings')
      .eq('email', user.email)
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Không thể lấy cài đặt' }, { status: 500 });
    }

    const settings = deepMerge(defaultSettings, (userData?.settings || {}) as Partial<typeof defaultSettings>);

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const validatedPatch = settingsPatchSchema.parse(body);

    const { data: userData, error: fetchError } = await supabase
      .from('nguoi_dung')
      .select('settings')
      .eq('email', user.email)
      .single();

    if (fetchError) {
      console.error('Error fetching current settings:', fetchError);
      return NextResponse.json({ error: 'Không thể lấy cài đặt hiện tại' }, { status: 500 });
    }

    const currentSettings = deepMerge(defaultSettings, (userData?.settings || {}) as Partial<typeof defaultSettings>);
    const newSettings = deepMerge(currentSettings, validatedPatch as Partial<typeof defaultSettings>);

    const { error: updateError } = await supabase
      .from('nguoi_dung')
      .update({ settings: newSettings })
      .eq('email', user.email);

    if (updateError) {
      console.error('Error updating settings:', updateError);
      return NextResponse.json({ error: 'Không thể cập nhật cài đặt' }, { status: 500 });
    }

    return NextResponse.json({ data: newSettings, message: 'Đã cập nhật cài đặt' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu cài đặt không hợp lệ.' }, { status: 400 });
    }

    console.error('Settings PATCH error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        output[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return output;
}

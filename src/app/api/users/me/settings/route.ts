import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Lấy settings của user
export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
        }

        // Lấy settings từ bảng nguoi_dung
        const { data: userData, error } = await supabase
            .from('nguoi_dung')
            .select('settings')
            .eq('email', user.email)
            .single();

        if (error) {
            console.error('Error fetching settings:', error);
            return NextResponse.json({ error: 'Không thể lấy cài đặt' }, { status: 500 });
        }

        // Default settings nếu chưa có
        const defaultSettings = {
            notifications: {
                emailTaskAssigned: true,
                emailDeadlineReminder: true,
                pushEnabled: false,
                emailComments: true,
            },
            appearance: {
                theme: 'system', // 'light' | 'dark' | 'system'
                language: 'vi',
            },
            dashboard: {
                defaultPage: '/dashboard',
                itemsPerPage: 10,
            },
        };

        const settings = userData?.settings || defaultSettings;

        return NextResponse.json({ data: settings });
    } catch (error) {
        console.error('Settings GET error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}

// Cập nhật settings của user
export async function PATCH(request: Request) {
    try {
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
        }

        const body = await request.json();

        // Lấy settings hiện tại
        const { data: userData, error: fetchError } = await supabase
            .from('nguoi_dung')
            .select('settings')
            .eq('email', user.email)
            .single();

        if (fetchError) {
            console.error('Error fetching current settings:', fetchError);
            return NextResponse.json({ error: 'Không thể lấy cài đặt hiện tại' }, { status: 500 });
        }

        // Merge settings mới với settings hiện tại
        const currentSettings = userData?.settings || {};
        const newSettings = deepMerge(currentSettings, body);

        // Cập nhật settings
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
        console.error('Settings PATCH error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}

// Utility function để deep merge objects
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

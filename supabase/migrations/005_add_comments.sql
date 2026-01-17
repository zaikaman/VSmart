-- Migration: Add binh_luan (comments) table for task discussions
-- Created: 2026-01-17

CREATE TABLE public.binh_luan (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    task_id uuid NOT NULL,
    nguoi_dung_id uuid NOT NULL,
    noi_dung text NOT NULL,
    ngay_tao timestamp with time zone DEFAULT now(),
    cap_nhat_cuoi timestamp with time zone DEFAULT now(),
    CONSTRAINT binh_luan_pkey PRIMARY KEY (id),
    CONSTRAINT binh_luan_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id) ON DELETE CASCADE,
    CONSTRAINT binh_luan_nguoi_dung_id_fkey FOREIGN KEY (nguoi_dung_id) REFERENCES public.nguoi_dung(id)
);

-- Index for faster lookup by task
CREATE INDEX idx_binh_luan_task_id ON public.binh_luan(task_id);

-- RLS Policies
ALTER TABLE public.binh_luan ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read comments for tasks they can access
CREATE POLICY "Users can view comments on tasks they can access"
    ON public.binh_luan FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.task t
            JOIN public.phan_du_an pda ON t.phan_du_an_id = pda.id
            JOIN public.thanh_vien_du_an tvda ON pda.du_an_id = tvda.du_an_id
            WHERE t.id = binh_luan.task_id
            AND tvda.nguoi_dung_id = auth.uid()
            AND tvda.trang_thai = 'active'
        )
    );

-- Allow authenticated users to create comments on tasks they can access
CREATE POLICY "Users can create comments on tasks they can access"
    ON public.binh_luan FOR INSERT
    WITH CHECK (
        nguoi_dung_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.task t
            JOIN public.phan_du_an pda ON t.phan_du_an_id = pda.id
            JOIN public.thanh_vien_du_an tvda ON pda.du_an_id = tvda.du_an_id
            WHERE t.id = binh_luan.task_id
            AND tvda.nguoi_dung_id = auth.uid()
            AND tvda.trang_thai = 'active'
        )
    );

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments"
    ON public.binh_luan FOR UPDATE
    USING (nguoi_dung_id = auth.uid())
    WITH CHECK (nguoi_dung_id = auth.uid());

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
    ON public.binh_luan FOR DELETE
    USING (nguoi_dung_id = auth.uid());

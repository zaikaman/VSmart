'use client';

import { useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  PauseCircle,
  PencilLine,
  PlayCircle,
  Plus,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreatePhongBan,
  usePhongBan,
  useUpdatePhongBan,
  useUpdatePhongBanStatus,
  type PhongBan,
} from '@/lib/hooks/use-phong-ban';

interface OrganizationDepartmentsPanelProps {
  canManage: boolean;
}

interface DraftDepartment {
  ten: string;
  mo_ta: string;
}

const emptyDraft: DraftDepartment = {
  ten: '',
  mo_ta: '',
};

const statusToneMap = {
  active: 'border-[#d8e6c7] bg-[#f4faeb] text-[#53684f]',
  inactive: 'border-[#eadbc9] bg-[#fff5ec] text-[#9b633a]',
  merged: 'border-[#d7e1ec] bg-[#eff5fb] text-[#49637e]',
} as const;

const statusLabelMap = {
  active: 'Đang dùng',
  inactive: 'Ngừng dùng',
  merged: 'Đã gộp',
} as const;

function getInitialDraft(department?: PhongBan | null): DraftDepartment {
  return {
    ten: department?.ten || '',
    mo_ta: department?.mo_ta || '',
  };
}

export function OrganizationDepartmentsPanel({
  canManage,
}: OrganizationDepartmentsPanelProps) {
  const { data: phongBanList, isLoading } = usePhongBan({ includeInactive: true });
  const createPhongBanMutation = useCreatePhongBan();
  const updatePhongBanMutation = useUpdatePhongBan();
  const updatePhongBanStatusMutation = useUpdatePhongBanStatus();
  const [createDraft, setCreateDraft] = useState<DraftDepartment>(emptyDraft);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftDepartment>(emptyDraft);
  const [mergeSourceDepartment, setMergeSourceDepartment] = useState<PhongBan | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  const departments: PhongBan[] = phongBanList || [];
  const activeDepartments = departments.filter((department) => department.trang_thai === 'active');
  const inactiveDepartments = departments.filter((department) => department.trang_thai === 'inactive');
  const mergedDepartments = departments.filter((department) => department.trang_thai === 'merged');

  const handleCreate = async () => {
    try {
      await createPhongBanMutation.mutateAsync({
        ten: createDraft.ten,
        mo_ta: createDraft.mo_ta,
      });
      toast.success('Đã thêm phòng ban mới.');
      setCreateDraft(emptyDraft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thêm phòng ban.');
    }
  };

  const startEditing = (department: PhongBan) => {
    setEditingDepartmentId(department.id);
    setEditDraft(getInitialDraft(department));
  };

  const handleUpdate = async () => {
    if (!editingDepartmentId) {
      return;
    }

    try {
      await updatePhongBanMutation.mutateAsync({
        id: editingDepartmentId,
        ten: editDraft.ten,
        mo_ta: editDraft.mo_ta,
      });
      toast.success('Đã cập nhật phòng ban.');
      setEditingDepartmentId(null);
      setEditDraft(emptyDraft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật phòng ban.');
    }
  };

  const handleStatusAction = async (
    department: PhongBan,
    action: 'deactivate' | 'reactivate'
  ) => {
    try {
      await updatePhongBanStatusMutation.mutateAsync({
        id: department.id,
        action,
      });
      toast.success(
        action === 'deactivate'
          ? `Đã chuyển ${department.ten} sang ngừng dùng.`
          : `Đã mở lại ${department.ten}.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật trạng thái phòng ban.'
      );
    }
  };

  const openMergeDialog = (department: PhongBan) => {
    const nextTarget = activeDepartments.find((item) => item.id !== department.id)?.id || '';
    setMergeSourceDepartment(department);
    setMergeTargetId(nextTarget);
  };

  const handleMerge = async () => {
    if (!mergeSourceDepartment || !mergeTargetId) {
      return;
    }

    try {
      await updatePhongBanStatusMutation.mutateAsync({
        id: mergeSourceDepartment.id,
        action: 'merge',
        target_department_id: mergeTargetId,
      });
      toast.success(`Đã gộp ${mergeSourceDepartment.ten} sang phòng ban đích.`);
      setMergeSourceDepartment(null);
      setMergeTargetId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gộp phòng ban.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-[24px] border border-[#e6ebde] bg-[#f7f9f3]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e4cb] bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#5b6d56]">
            <Building2 className="h-3.5 w-3.5" />
            Cấu trúc tổ chức
          </div>
          <h3 className="mt-4 text-xl font-semibold text-[#223021]">
            Phòng ban là danh mục dùng chung cho cả thành viên lẫn dự án.
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#5d6b58]">
            Khi một phòng ban không còn dùng nữa, hãy chuyển sang trạng thái phù hợp hoặc gộp sang phòng ban khác thay vì xóa cứng để tránh mất liên kết dữ liệu.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#deead2] bg-white/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a785f]">Đang dùng</p>
              <p className="mt-2 text-2xl font-semibold text-[#223021]">{activeDepartments.length}</p>
            </div>
            <div className="rounded-[22px] border border-[#eadbc9] bg-white/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a4c]">Ngừng dùng</p>
              <p className="mt-2 text-2xl font-semibold text-[#223021]">{inactiveDepartments.length}</p>
            </div>
            <div className="rounded-[22px] border border-[#d8e2ec] bg-white/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5e7184]">Đã gộp</p>
              <p className="mt-2 text-2xl font-semibold text-[#223021]">{mergedDepartments.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#e6ebde] bg-[#fbfcf8] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#223021]">Thêm phòng ban mới</p>
              <p className="mt-1 text-sm text-[#67745f]">
                Dùng tên đang vận hành thực tế để thành viên và dự án cùng bám vào một nguồn dữ liệu.
              </p>
            </div>
            <div className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7b67]">
              {activeDepartments.length} đang dùng
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="department-name">Tên phòng ban</Label>
              <Input
                id="department-name"
                value={createDraft.ten}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, ten: event.target.value }))
                }
                placeholder="Ví dụ: Kinh doanh, CSKH, Vận hành"
                className="mt-2 border-[#dfe5d6] bg-white"
                disabled={!canManage || createPhongBanMutation.isPending}
              />
            </div>

            <div>
              <Label htmlFor="department-description">Mô tả ngắn</Label>
              <Textarea
                id="department-description"
                value={createDraft.mo_ta}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, mo_ta: event.target.value }))
                }
                placeholder="Ghi chú ngắn về phạm vi phụ trách của phòng ban này."
                className="mt-2 min-h-[112px] border-[#dfe5d6] bg-white"
                disabled={!canManage || createPhongBanMutation.isPending}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!canManage || createPhongBanMutation.isPending || !createDraft.ten.trim()}
              className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
            >
              <Plus className="mr-2 h-4 w-4" />
              {createPhongBanMutation.isPending ? 'Đang thêm...' : 'Thêm phòng ban'}
            </Button>
          </div>
        </div>
      </div>

      {departments.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#d9e3d0] bg-[#f8fbf4] px-5 py-8 text-center">
          <p className="text-base font-medium text-[#223021]">Chưa có phòng ban nào trong tổ chức.</p>
          <p className="mt-2 text-sm leading-6 text-[#66735f]">
            Khi danh mục này sẵn sàng, hệ thống mới có thể gắn thành viên và chia phần dự án theo đúng đầu mối phụ trách.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {departments.map((department) => {
            const isEditing = editingDepartmentId === department.id;
            const isSaving = isEditing && updatePhongBanMutation.isPending;
            const canMerge = activeDepartments.filter((item) => item.id !== department.id).length > 0;

            return (
              <div
                key={department.id}
                className="rounded-[26px] border border-[#e3eadc] bg-white px-5 py-5 shadow-[0_16px_35px_-32px_rgba(98,115,88,0.34)]"
              >
                {isEditing ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`department-edit-name-${department.id}`}>Tên phòng ban</Label>
                        <Input
                          id={`department-edit-name-${department.id}`}
                          value={editDraft.ten}
                          onChange={(event) =>
                            setEditDraft((current) => ({ ...current, ten: event.target.value }))
                          }
                          className="mt-2 border-[#dfe5d6] bg-[#fbfcf8]"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`department-edit-description-${department.id}`}>Mô tả</Label>
                        <Textarea
                          id={`department-edit-description-${department.id}`}
                          value={editDraft.mo_ta}
                          onChange={(event) =>
                            setEditDraft((current) => ({ ...current, mo_ta: event.target.value }))
                          }
                          className="mt-2 min-h-[108px] border-[#dfe5d6] bg-[#fbfcf8]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3">
                      <div className="rounded-[22px] border border-[#dce8d1] bg-[#f6fbef] px-4 py-3 text-sm text-[#556450]">
                        Tên và mô tả mới sẽ cập nhật đồng bộ ở màn thành viên và các luồng chia phần dự án tiếp theo.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={handleUpdate}
                          disabled={isSaving || !editDraft.ten.trim()}
                          className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? 'Đang lưu...' : 'Lưu'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingDepartmentId(null);
                            setEditDraft(emptyDraft);
                          }}
                          disabled={isSaving}
                          className="border-[#dfe5d6] bg-white text-[#5b6955] hover:bg-[#f6f8f1]"
                        >
                          Để sau
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#223021]">{department.ten}</h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusToneMap[department.trang_thai]}`}
                        >
                          {statusLabelMap[department.trang_thai]}
                        </span>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66735f]">
                        {department.mo_ta ||
                          'Chưa có mô tả. Có thể thêm vài dòng để team hiểu rõ phạm vi phụ trách.'}
                      </p>
                      {department.trang_thai === 'merged' && department.merged_into ? (
                        <p className="mt-3 text-sm text-[#5d6d80]">
                          Đã gộp sang <strong>{department.merged_into.ten}</strong>. Thành viên và phần dự án liên quan sẽ được dồn về phòng ban đích.
                        </p>
                      ) : null}
                      {department.trang_thai === 'inactive' ? (
                        <p className="mt-3 text-sm text-[#8a6844]">
                          Phòng ban này không còn nhận phân công mới nhưng dữ liệu cũ vẫn được giữ lại an toàn.
                        </p>
                      ) : null}
                    </div>

                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        {department.trang_thai !== 'merged' ? (
                          <Button
                            variant="outline"
                            onClick={() => startEditing(department)}
                            className="border-[#dfe5d6] bg-white text-[#5b6955] hover:bg-[#f6f8f1]"
                          >
                            <PencilLine className="mr-2 h-4 w-4" />
                            Chỉnh lại
                          </Button>
                        ) : null}

                        {department.trang_thai === 'active' ? (
                          <Button
                            variant="outline"
                            onClick={() => handleStatusAction(department, 'deactivate')}
                            disabled={updatePhongBanStatusMutation.isPending}
                            className="border-[#eadbc9] bg-white text-[#8d6443] hover:bg-[#fff6ef]"
                          >
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Ngừng dùng
                          </Button>
                        ) : null}

                        {department.trang_thai === 'inactive' ? (
                          <Button
                            variant="outline"
                            onClick={() => handleStatusAction(department, 'reactivate')}
                            disabled={updatePhongBanStatusMutation.isPending}
                            className="border-[#d8e6c7] bg-white text-[#56704d] hover:bg-[#f6fbef]"
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Dùng lại
                          </Button>
                        ) : null}

                        {department.trang_thai !== 'merged' ? (
                          <Button
                            variant="outline"
                            onClick={() => openMergeDialog(department)}
                            disabled={updatePhongBanStatusMutation.isPending || !canMerge}
                            className="border-[#d7e1ec] bg-white text-[#536a81] hover:bg-[#f3f8fd]"
                          >
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            Gộp phòng ban
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(mergeSourceDepartment)}
        onOpenChange={(open) => {
          if (!open) {
            setMergeSourceDepartment(null);
            setMergeTargetId('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Gộp phòng ban</DialogTitle>
            <DialogDescription>
              Toàn bộ thành viên và phần dự án đang gắn với phòng ban nguồn sẽ chuyển sang phòng ban đích. Phòng ban cũ sẽ được giữ lại dưới trạng thái đã gộp để theo dõi lịch sử.
            </DialogDescription>
          </DialogHeader>

          {mergeSourceDepartment ? (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] px-4 py-4 text-sm text-[#556451]">
                <p>
                  Nguồn: <strong>{mergeSourceDepartment.ten}</strong>
                </p>
                <p className="mt-2 leading-6">
                  Sau khi gộp, phòng ban này sẽ không còn dùng cho phân công mới và sẽ trỏ lịch sử sang phòng ban đích.
                </p>
              </div>

              <div>
                <Label htmlFor="merge-target">Phòng ban đích</Label>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger id="merge-target" className="mt-2 border-[#dfe5d6] bg-white">
                    <SelectValue placeholder="Chọn phòng ban nhận dữ liệu" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDepartments
                      .filter((department) => department.id !== mergeSourceDepartment.id)
                      .map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.ten}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMergeSourceDepartment(null);
                setMergeTargetId('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleMerge}
              disabled={!mergeSourceDepartment || !mergeTargetId || updatePhongBanStatusMutation.isPending}
              className="border border-[#d7e1ec] bg-[#ecf3fa] text-[#4f6780] hover:bg-[#e3edf7]"
            >
              {updatePhongBanStatusMutation.isPending ? 'Đang gộp...' : 'Xác nhận gộp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Clock, CheckCircle, AlertCircle, Loader2, Users, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useProject } from '@/lib/hooks/use-projects';
import { useProjectParts, useDeleteProjectPart, ProjectPart } from '@/lib/hooks/use-project-parts';
import { CreatePartModal } from '@/components/projects/create-part-modal';
import { EditPartModal } from '@/components/projects/edit-part-modal';
import { ProjectMembersManager } from '@/components/projects/project-members-manager';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const { data: project, isLoading: projectLoading } = useProject(projectId);
    const { data: parts, isLoading: partsLoading } = useProjectParts(projectId);
    const [createPartOpen, setCreatePartOpen] = useState(false);
    const [editPartOpen, setEditPartOpen] = useState(false);
    const [selectedPart, setSelectedPart] = useState<ProjectPart | null>(null);
    const [deletePartId, setDeletePartId] = useState<string | null>(null);
    
    const deletePartMutation = useDeleteProjectPart(projectId);

    const isLoading = projectLoading || partsLoading;

    const handleEditPart = (part: ProjectPart) => {
        setSelectedPart(part);
        setEditPartOpen(true);
    };

    const handleDeletePart = async (partId: string) => {
        try {
            await deletePartMutation.mutateAsync(partId);
            toast.success('Đã xóa phần dự án thành công');
            setDeletePartId(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể xóa phần dự án');
        }
    };

    const statusColors = {
        todo: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200',
        'in-progress': 'bg-[#b9ff66] text-black hover:bg-[#a3e659] border-[#b9ff66]',
        done: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
    };

    const statusLabels = {
        todo: 'Cần làm',
        'in-progress': 'Đang thực hiện',
        done: 'Hoàn thành',
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <Skeleton className="h-8 w-32 mb-6" />
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-5 w-96 mb-8" />
                <div className="grid gap-4 md:grid-cols-3 mb-8">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Không tìm thấy dự án</h2>
                    <p className="text-gray-500 mb-4">Dự án này không tồn tại hoặc đã bị xóa.</p>
                    <Button onClick={() => router.push('/dashboard/projects')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Back button */}
            <Link
                href="/dashboard/projects"
                className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách dự án
            </Link>

            {/* Project Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold">{project.ten}</h1>
                        <Badge variant="outline" className={`${statusColors[project.trang_thai as keyof typeof statusColors]} border`}>
                            {statusLabels[project.trang_thai as keyof typeof statusLabels]}
                        </Badge>
                    </div>
                    {project.mo_ta && (
                        <p className="text-gray-600 max-w-2xl">{project.mo_ta}</p>
                    )}
                </div>
                <Button onClick={() => setCreatePartOpen(true)} className="bg-black hover:bg-gray-800 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Thêm phần dự án
                </Button>
            </div>

            {/* Project Stats */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Tiến độ</CardTitle>
                        <CheckCircle className="h-4 w-4 text-[#b9ff66]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{project.phan_tram_hoan_thanh?.toFixed(0) || 0}%</div>
                        <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
                            <div
                                className="bg-[#b9ff66] h-2 rounded-full transition-all"
                                style={{ width: `${project.phan_tram_hoan_thanh || 0}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Deadline</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Date(project.deadline).toLocaleDateString('vi-VN')}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} ngày còn lại
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Phần dự án</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{parts?.length || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Được phân công</p>
                    </CardContent>
                </Card>
            </div>

            {/* Project Parts */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Các phần dự án</h2>

                {!parts || parts.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-slate-500 mb-4">Chưa có phần dự án nào.</p>
                        <Button onClick={() => setCreatePartOpen(true)} variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Thêm phần dự án đầu tiên
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {parts.map((part: ProjectPart) => (
                            <Card key={part.id} className="hover:shadow-md transition-shadow group">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg group-hover:text-[#8abe4b] transition-colors">{part.ten}</CardTitle>
                                            {part.phong_ban && (
                                                <p className="text-sm text-gray-500 font-medium mt-1">
                                                    Phòng: {part.phong_ban.ten}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`${statusColors[part.trang_thai as keyof typeof statusColors]} border`}>
                                                {statusLabels[part.trang_thai as keyof typeof statusLabels]}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {part.mo_ta && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{part.mo_ta}</p>
                                    )}
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-gray-500">
                                            Tiến độ: <span className="font-medium">{part.phan_tram_hoan_thanh?.toFixed(0) || 0}%</span>
                                        </span>
                                        <span className="text-gray-500">
                                            Deadline: <span className="font-medium">{new Date(part.deadline).toLocaleDateString('vi-VN')}</span>
                                        </span>
                                    </div>
                                    <div className="mb-3 w-full bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className="bg-[#b9ff66] h-1.5 rounded-full transition-all"
                                            style={{ width: `${part.phan_tram_hoan_thanh || 0}%` }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => handleEditPart(part)}
                                        >
                                            <Pencil className="mr-1 h-3 w-3" />
                                            Sửa
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDeletePartId(part.id)}
                                        >
                                            <Trash2 className="mr-1 h-3 w-3" />
                                            Xóa
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Project Members Section */}
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Users className="mr-2 h-5 w-5" />
                            Quản lý thành viên
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProjectMembersManager projectId={projectId} />
                    </CardContent>
                </Card>
            </div>

            {/* Create Part Modal */}
            <CreatePartModal
                open={createPartOpen}
                onOpenChange={setCreatePartOpen}
                projectId={projectId}
            />

            {/* Edit Part Modal */}
            {selectedPart && (
                <EditPartModal
                    open={editPartOpen}
                    onOpenChange={setEditPartOpen}
                    projectId={projectId}
                    part={selectedPart}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletePartId} onOpenChange={() => setDeletePartId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa phần dự án này? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deletePartId && handleDeletePart(deletePartId)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deletePartMutation.isPending}
                        >
                            {deletePartMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xóa...
                                </>
                            ) : (
                                'Xóa'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

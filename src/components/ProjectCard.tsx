
import Link from "next/link"
import { Calendar, ArrowRight } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MiniTimeline } from "@/components/MiniTimeline"
import { StatusBadge, type StatusType } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"

// Format ISO date string to user-friendly local time
function formatDate(isoDate: string): string {
    try {
        const date = new Date(isoDate)
        return date.toLocaleDateString("vi-VN", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    } catch {
        return isoDate
    }
}

export interface ProjectCardProps {
    id: string
    title: string
    description: string
    status: StatusType
    lastUpdated: string
    progress: number // 0-5
    totalSteps: number
    isPrivate?: boolean
}

export function ProjectCard({
    id,
    title,
    description,
    status,
    lastUpdated,
    progress,
    totalSteps,
    isPrivate = false,
}: ProjectCardProps) {
    return (
        <Card className="group relative flex flex-col justify-between overflow-hidden transition-all hover:-translate-y-1 hover:shadow-md hover:border-black/20">
            {/* Accent Line on Hover */}
            <div className="absolute top-0 left-0 h-1 w-full bg-[#b9ff66] opacity-0 transition-opacity group-hover:opacity-100" />

            <CardHeader>
                <div className="flex items-start justify-between">
                    <StatusBadge status={status} />
                    {isPrivate && (
                        <Badge variant="outline" className="text-muted-foreground border-border">
                            Riêng tư
                        </Badge>
                    )}
                </div>
                <CardTitle className="mt-4 line-clamp-1 group-hover:text-primary transition-colors">{title}</CardTitle>
                <CardDescription className="line-clamp-2 mt-2 h-10">
                    {description}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Tiến độ</span>
                        <span>{Math.round((progress / totalSteps) * 100)}%</span>
                    </div>
                    <MiniTimeline currentStep={progress} totalSteps={totalSteps} className="w-full justify-between" />
                </div>
            </CardContent>

            <CardFooter className="border-t border-border bg-secondary/30 p-4">
                <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Đã tạo {formatDate(lastUpdated)}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-background" asChild>
                        <Link href={`/dashboard/projects/${id}`}>
                            Xem <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}

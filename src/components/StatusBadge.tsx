
import React from "react"
import { Badge } from "@/components/ui/badge"

export type StatusType = "planned" | "in-progress" | "shipped"

interface StatusBadgeProps {
    status: StatusType
    className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    // Using explicit tailwind classes for custom branding
    const variants: Record<StatusType, string> = {
        planned: "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200",
        "in-progress": "bg-[#191a23] text-white border-transparent hover:bg-[#2a2b35]", // Black (Primary)
        shipped: "bg-[#b9ff66] text-black border-transparent hover:bg-[#a8e55a]", // Neon Green (Done)
    }

    const labels: Record<StatusType, string> = {
        planned: "Đang lập kế hoạch",
        "in-progress": "Đang thực hiện",
        shipped: "Đã hoàn thành",
    }

    return (
        <Badge className={variants[status] + " " + (className || "")} variant="outline">
            {labels[status]}
        </Badge>
    )
}

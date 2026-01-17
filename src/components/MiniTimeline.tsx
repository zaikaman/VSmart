
import React from "react"
import { cn } from "@/lib/utils"

export function MiniTimeline({
    totalSteps = 5,
    currentStep = 0,
    className,
}: {
    totalSteps?: number
    currentStep?: number
    className?: string
}) {
    return (
        <div className={cn("flex items-center space-x-1", className)}>
            {Array.from({ length: totalSteps }).map((_, i) => (
                <React.Fragment key={i}>
                    <div
                        className={cn(
                            "h-1.5 w-1.5 rounded-full transition-colors",
                            i <= currentStep ? "bg-[#191a23]" : "bg-slate-200"
                        )}
                    />
                    {/* Connecting line */}
                    {i < totalSteps - 1 && (
                        <div
                            className={cn(
                                "h-[1px] w-3 transition-colors",
                                i < currentStep ? "bg-[#191a23]" : "bg-slate-100"
                            )}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}

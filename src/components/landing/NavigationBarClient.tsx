"use client";
import Logo from "./Logo";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
    { href: "/docs", label: "Docs" },
    { href: "https://github.com/zaikaman/VSmart", label: "GitHub" },
];

interface NavigationBarClientProps {
    startButton: React.ReactNode;
}

export default function NavigationBarClient({ startButton }: NavigationBarClientProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => {
        const dialog = document.getElementById(
            "navigation-menu-dialog"
        ) as HTMLDialogElement;
        if (dialog && typeof dialog.hidePopover === "function") {
            dialog.hidePopover();
        }
        setIsMenuOpen(false);
    };

    return (
        <div className="flex items-center justify-between px-[100px] max-xl:px-[60px] max-sm:px-[30px] max-md:gap-[20px] py-0 relative w-full max-w-[1440px] mx-auto">
            <Link
                href="/"
                className="flex items-start overflow-clip px-0 py-[10px] relative max-md:w-full"
                aria-label="Home"
            >
                <Logo className="h-[36px] relative shrink-0 w-auto" />
            </Link>
            <div className="flex gap-[40px] items-center justify-center relative shrink-0 max-xl:hidden">
                {navLinks.map(({ href, label }, index) => (
                    <Link
                        key={index}
                        href={href}
                        className="font-normal leading-[28px] relative shrink-0 text-[20px] text-[#1f2b1f] hover:text-[#587041] transition-colors ml-px"
                    >
                        {label}
                    </Link>
                ))}
                <div className="py-[18px] px-[34px]">
                    {startButton}
                </div>
            </div>
            <button
                className="xl:hidden inline-flex items-center px-4 py-2 rounded-full border border-[#d5e1c7] bg-[#eef6df] text-sm font-semibold text-[#587041] transition hover:bg-[#e2edcf] cursor-pointer"
                onClick={() => setIsMenuOpen(true)}
                popoverTarget="navigation-menu-dialog"
                popoverTargetAction="show"
            >
                MENU
            </button>
            <dialog
                id="navigation-menu-dialog"
                popover="auto"
                open={isMenuOpen}
                className="xl:hidden fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_18%_0%,#f5faeb_0%,#fbfaf4_30%,#eef4ea_100%)] z-50"
                onClose={() => setIsMenuOpen(false)}
            >
                <div className="flex flex-col gap-[40px] items-center justify-center relative shrink-0 p-[100px]">
                    <button
                        className="inline-flex items-center px-6 py-3 rounded-full border border-[#d5e1c7] bg-[#eef6df] text-sm font-semibold text-[#587041] transition hover:bg-[#e2edcf] cursor-pointer"
                        onClick={closeMenu}
                        popoverTarget="navigation-menu-dialog"
                        popoverTargetAction="hide"
                    >
                        CLOSE
                    </button>
                    {navLinks.map(({ href, label }, index) => (
                        <Link
                            key={index}
                            href={href}
                            onClick={(e) => {
                                closeMenu();
                                if (href === "." || href.startsWith("#")) {
                                    e.preventDefault();
                                }
                            }}
                            className="font-normal leading-[28px] relative shrink-0 text-[20px] text-[#1f2b1f] hover:text-[#587041] transition-colors ml-px"
                            popoverTarget="navigation-menu-dialog"
                            popoverTargetAction="hide"
                        >
                            {label}
                        </Link>
                    ))}
                    {startButton}
                </div>
            </dialog>
        </div>
    );
}

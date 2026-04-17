"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Video } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e4e9ef] bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
      <div className="mx-auto flex h-[78px] max-w-7xl items-center justify-between px-4 sm:h-[98px] sm:px-6">
        <Link href="/" aria-label="L-Evate Televisit home">
          <Image
            src="/images/site-logo.png"
            alt="L-Evate Televisit"
            width={427}
            height={105}
            className="h-14 w-auto sm:h-[68px]"
            priority
          />
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#dbe7f7] bg-[#f3f8ff] px-3 py-1 text-[11px] font-semibold text-[#0a4ea9]">
            <Video className="h-3.5 w-3.5" /> HD Video Visits
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d6eadf] bg-[#f2fbf6] px-3 py-1 text-[11px] font-semibold text-[#1d7a4e]">
            <ShieldCheck className="h-3.5 w-3.5" /> HIPAA Compliant
          </span>
        </div>
      </div>
    </header>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Video } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[#18336b] bg-[#08275a] text-[#dce8ff]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:items-center">
        <div className="space-y-3">
          <p className="font-display text-xl font-semibold text-white">L-Evate Network</p>
          <p className="max-w-2xl text-sm text-[#c7d8fb]">
            Modern telehealth scheduling from the comfort of home, with compliant workflows and trusted clinical
            operations for patients and partner practices.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#d8e5ff]">
            <span className="inline-flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" /> HD Video Visits
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> HIPAA Compliant
            </span>
            <span>Same-Day Available</span>
          </div>
        </div>

        <div className="flex justify-start lg:justify-end">
          <Image
            src="/images/legitscript-certified.png"
            alt="LegitScript Certified"
            width={140}
            height={140}
            className="h-auto w-[110px] sm:w-[130px]"
          />
        </div>
      </div>

      <div className="border-t border-[#18336b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-[#b6caef] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Copyright {new Date().getFullYear()} L-Evate Network. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/" className="hover:text-white">
              Terms
            </Link>
            <Link href="/" className="hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function useReferral() {
    const searchParams = useSearchParams();
    const [referrerFid, setReferrerFid] = useState<number | null>(null);

    useEffect(() => {
        // Check URL for ref param
        const ref = searchParams.get("ref");
        if (ref) {
            const fid = parseInt(ref);
            if (!isNaN(fid)) {
                setReferrerFid(fid);
                // Store in localStorage for persistence
                localStorage.setItem("referrerFid", fid.toString());
            }
        } else {
            // Check localStorage if not in URL
            const stored = localStorage.getItem("referrerFid");
            if (stored) {
                setReferrerFid(parseInt(stored));
            }
        }
    }, [searchParams]);

    return { referrerFid };
}

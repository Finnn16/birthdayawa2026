import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type Mood, type Stats } from "@/lib/mood-types";

export function useAdminData() {
  const router = useRouter();
  const [moods, setMoods] = useState<Mood[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [userInfo, setUserInfo] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        setError("Akses ditolak: Anda bukan admin.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Gagal memuat data. Silakan coba lagi.");
        setLoading(false);
        return;
      }

      const json = await res.json();

      if (json.error) {
        setError(json.error);
        setLoading(false);
        return;
      }

      setMoods(json.moods || []);
      setStats(json.stats || null);
      setUserInfo(json.userInfo || null);
    } catch (err) {
      setError("Terjadi kesalahan saat memuat data.");
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { moods, stats, userInfo, loading, error, refetch: fetchData };
}

import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => reportsApi.getSummaryStats(),
    refetchInterval: 10000, // automatically refresh stats every 10 seconds for real-time feel
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: () => reportsApi.getDashboardCharts(),
    refetchInterval: 10000,
  });
}

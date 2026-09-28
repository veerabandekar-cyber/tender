import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { tenderApi } from "@/lib/api";

import {
  Tender,
  TenderFilters,
  TenderStatus,
} from "@/lib/types";

export function useTenders(
  filters?: TenderFilters,
  page: number = 1,
  pageSize: number = 50
) {
  return useQuery({
    queryKey: [
      "tenders",
      filters,
      page,
      pageSize,
    ],

    queryFn: () =>
      tenderApi.getAll(filters, {
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }),

    placeholderData: (previousData) =>
      previousData,
  });
}

export function useTender(id: string) {
  return useQuery({
    queryKey: ["tender", id],

    queryFn: () =>
      tenderApi.get(id),

    enabled: !!id,
  });
}

export function useCreateTender() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<
        Tender,
        "id" |
        "created_at" |
        "updated_at"
      >
    ) =>
      tenderApi.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenders"],
      });
    },
  });
}

export function useUpdateTender() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Tender>;
    }) =>
      tenderApi.update(id, data),

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["tenders"],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "tender",
          data.id,
        ],
      });
    },
  });
}

export function useUpdateTenderStatus() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: TenderStatus;
    }) =>
      tenderApi.updateStatus(
        id,
        status
      ),

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["tenders"],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "tender",
          data.id,
        ],
      });
    },
  });
}

export function useDeleteTender() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      tenderApi.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tenders"],
      });
    },
  });
}
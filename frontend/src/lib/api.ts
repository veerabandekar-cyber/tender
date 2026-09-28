import {
  Tender,
  Organization,
  SearchKeyword,
  SearchLog,
  DashboardStats,
  TenderFilters,
  TenderStatus,
} from "./types";
import { getAuthHeaders, getStoredUser } from "./auth";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const port = window.location.port;
    if (port === "5173" || port === "3000") {
      return "http://127.0.0.1:8000";
    }
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "";
    }
  }
  return import.meta.env.VITE_API_URL || "";
};

const BASE_URL = getBaseUrl();
const API_PREFIX = "/api/v1";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${API_PREFIX}${path}`;

  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options.headers,
  };

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error(`API request failed: ${url}`, error);

    throw new Error(
      "Unable to reach the portal server. Please ensure the backend is running."
    );
  }

  if (!response.ok) {
    let errorDetail = "API Request failed";

    try {
      const data = await response.json();
      errorDetail =
        data.detail ||
        data.message ||
        errorDetail;
    } catch {
      // Ignore JSON parsing errors.
    }

    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================
// TENDER API
// ============================================================

export const tenderApi = {
  async getAll(
    filters?: TenderFilters,
    pagination?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<{
    items: Tender[];
    total: number;
  }> {
    const params = new URLSearchParams();

    // Filters
    if (filters?.search) {
      params.append("search", filters.search);
    }

    if (filters?.status) {
      params.append("status", filters.status);
    }

    if (filters?.organization_id) {
      params.append(
        "organization_id",
        filters.organization_id
      );
    }

    if (filters?.sort_by) {
      params.append("sort_by", filters.sort_by);
    }

    if (filters?.sort_order) {
      params.append("sort_order", filters.sort_order);
    }

    // Backend pagination
    const offset = pagination?.offset ?? 0;
    const limit = pagination?.limit ?? 50;

    params.append("offset", String(offset));
    params.append("limit", String(limit));

    return request<{
      items: Tender[];
      total: number;
    }>(`/tenders/?${params.toString()}`);
  },

  async get(id: string): Promise<Tender> {
    return request<Tender>(`/tenders/${id}`);
  },

  async create(
    data: Omit<
      Tender,
      "id" | "created_at" | "updated_at"
    >
  ): Promise<Tender> {
    return request<Tender>("/tenders/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(
    id: string,
    data: Partial<Tender>
  ): Promise<Tender> {
    return request<Tender>(`/tenders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async updateStatus(
    id: string,
    status: TenderStatus
  ): Promise<Tender> {
    return request<Tender>(
      `/tenders/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      }
    );
  },

  async delete(id: string): Promise<void> {
    await request<void>(`/tenders/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================================
// ORGANIZATION API
// ============================================================

export const orgApi = {
  async getAll(): Promise<Organization[]> {
    return request<Organization[]>("/organizations/");
  },

  async get(
    id: string
  ): Promise<
    Organization & {
      tenders: Tender[];
    }
  > {
    return request<
      Organization & {
        tenders: Tender[];
      }
    >(`/organizations/${id}`);
  },

  async create(
    data: Omit<
      Organization,
      "id" | "created_at" | "updated_at"
    >
  ): Promise<Organization> {
    return request<Organization>(
      "/organizations/",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  async update(
    id: string,
    data: Partial<Organization>
  ): Promise<Organization> {
    return request<Organization>(
      `/organizations/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },
};

// ============================================================
// DISCOVERY API
// ============================================================

export const discoveryApi = {
  async getKeywords(): Promise<SearchKeyword[]> {
    return request<SearchKeyword[]>(
      "/discovery/keywords"
    );
  },

  async addKeyword(
    keyword: string
  ): Promise<SearchKeyword> {
    return request<SearchKeyword>(
      "/discovery/keywords",
      {
        method: "POST",
        body: JSON.stringify({
          keyword,
        }),
      }
    );
  },

  async toggleKeyword(
    id: string
  ): Promise<SearchKeyword> {
    const keywords = await this.getKeywords();

    const keyword = keywords.find(
      (k) => k.id === id
    );

    if (!keyword) {
      throw new Error("Keyword not found");
    }

    return request<SearchKeyword>(
      `/discovery/keywords/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !keyword.is_active,
        }),
      }
    );
  },

  async deleteKeyword(id: string): Promise<void> {
    await request<void>(
      `/discovery/keywords/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  async getLogs(): Promise<SearchLog[]> {
    return request<SearchLog[]>(
      "/discovery/logs"
    );
  },

  async run(): Promise<SearchLog> {
    return request<SearchLog>(
      "/discovery/run",
      {
        method: "POST",
      }
    );
  },
};

// ============================================================
// REPORTS API
// ============================================================

export const reportsApi = {
  async getSummaryStats(): Promise<DashboardStats> {
    return request<DashboardStats>(
      "/reports/summary"
    );
  },

  async getDashboardCharts(): Promise<{
    statusData: Array<{ name: string; value: number }>;
    weekData: Array<{ name: string; count: number }>;
    orgData: Array<{ name: string; fullName: string; count: number }>;
  }> {
    return request<{
      statusData: Array<{ name: string; value: number }>;
      weekData: Array<{ name: string; count: number }>;
      orgData: Array<{ name: string; fullName: string; count: number }>;
    }>("/reports/charts");
  },

  async exportExcel(
    type: string
  ): Promise<{
    success: boolean;
    downloadUrl: string;
  }> {
    const url =
      `${BASE_URL}${API_PREFIX}/reports/export`;

    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(
        "Failed to export Excel report"
      );
    }

    const blob = await response.blob();

    const downloadUrl =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = downloadUrl;

    link.download =
      `Active_Tenders_Report_${
        new Date()
          .toISOString()
          .split("T")[0]
      }.xlsx`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      downloadUrl,
    };
  },

  async sendEmail(
    type: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const userEmail =
      getStoredUser()?.email ||
      "sales.head@analytica.com";

    return request<{
      message: string;
    }>("/reports/email", {
      method: "POST",
      body: JSON.stringify({
        recipient_email: userEmail,
      }),
    }).then((res) => ({
      success: true,
      message: res.message,
    }));
  },
};
import axios, { AxiosInstance } from "axios";
import { auth } from "@/config/firebase";
import { ApiResponse } from "@/types";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: "/api",
      headers: { "Content-Type": "application/json" },
    });

    // Interceptor: adicionar token
    this.client.interceptors.request.use(async (config) => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async upload<T>(url: string, file: File, fields?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
    }

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: { "Content-Type": undefined },
    });

    return response.data.data as T;
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url);
    return response.data.data as T;
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  async put<T>(url: string, data: unknown): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }
}

export default new ApiClient();

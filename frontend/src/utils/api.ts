const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export const api = {
  getToken: () => localStorage.getItem("flashmind_token"),
  setToken: (token: string) => localStorage.setItem("flashmind_token", token),
  clearToken: () => localStorage.removeItem("flashmind_token"),
  
  getApiKey: () => localStorage.getItem("flashmind_gemini_key") || "",
  setApiKey: (key: string) => localStorage.setItem("flashmind_gemini_key", key),

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    // Add auth token if requested (default to true)
    if (options.auth !== false) {
      const token = this.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    // Add local user-configured Gemini Key if present
    const localApiKey = this.getApiKey();
    if (localApiKey) {
      headers.set("X-Gemini-Key", localApiKey);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
      let errMsg = "An error occurred";
      try {
        const errData = await response.json();
        errMsg = errData.detail || errMsg;
      } catch {
        // use default message
      }
      throw new Error(errMsg);
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  },

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body: any, options?: RequestOptions) {
    const headers = new Headers(options?.headers || {});
    let finalBody = body;

    if (!(body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }

    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      headers,
      body: finalBody,
    });
  },

  put<T>(endpoint: string, body: any, options?: RequestOptions) {
    const headers = new Headers(options?.headers || {});
    headers.set("Content-Type", "application/json");
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
};

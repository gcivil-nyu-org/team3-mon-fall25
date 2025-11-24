import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 60000, // 60 seconds for file uploads
});

// Request interceptor - add JWT token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // ✅ Check if we *had* a token before clearing
      const hadToken = !!localStorage.getItem('access_token');

      // Clear auth storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      // ✅ Only redirect if we *previously* had a token
      // (i.e., session expired). If user was never logged in,
      // let the app stay on Home/Browse/etc.
      if (hadToken && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle 413 errors specifically
    if (error.response?.status === 413) {
      console.error('API Error (413): File(s) are too large', error);
    } else {
      console.error('API Error:', error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
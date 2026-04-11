import axios from 'axios';
import auth from '@react-native-firebase/auth';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.potholepatrol.in/v1';

const axiosClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor — attach a fresh Firebase ID token to every request.
 *
 * getIdToken() returns the cached token and silently refreshes it if it is
 * within 5 minutes of expiry. This is the correct call — do NOT use
 * getIdToken(true) here as that forces a network round-trip every request.
 */
axiosClient.interceptors.request.use(async (config) => {
    const user = auth().currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Response interceptor — if the server returns 401 (token expired race
 * condition), force-refresh the token and retry the original request once.
 */
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retried) {
            originalRequest._retried = true;
            const user = auth().currentUser;
            if (user) {
                const token = await user.getIdToken(true); // force network refresh
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axiosClient(originalRequest);
            }
        }
        return Promise.reject(error);
    },
);

export default axiosClient;

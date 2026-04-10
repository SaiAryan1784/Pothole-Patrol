import axios from 'axios';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.potholepatrol.in/v1';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosClient;

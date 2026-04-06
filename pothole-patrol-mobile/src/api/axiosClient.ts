import axios from 'axios';
import auth from '@react-native-firebase/auth';

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.potholepatrol.in/v1';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(async (config) => {
  const currentUser = auth().currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosClient;

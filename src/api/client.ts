import axios from 'axios';
import useAuthStore from '../stores/authStore';

export const apiClient = axios.create({
    baseURL: 'http://localhost:5000',
});

apiClient.interceptors.request.use((config)=>{
    const accessToken = useAuthStore.getState().accessToken;
    console.log('accesstokne form interceptor', accessToken)
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
      console.log('Final headers:', config.headers);

    return config;
})

apiClient.interceptors.response.use(res=>res, async (error)=>{
    const orginalReqquest = error.config;
    console.log('error: ',error)
    if(orginalReqquest._retry){
        return Promise.reject(error);
    }
    if(error.response.status === 401){
        try {
            const refreshToken = useAuthStore.getState().refreshToken;
            const newAccessToken = await apiClient.post('/api/v1/auth/refresh', { refreshToken });
            console.log('newAccessToken', newAccessToken)
            useAuthStore.getState().setAccessToken(newAccessToken.data.data.tokens.access);
            orginalReqquest._retry = true;
            return apiClient(orginalReqquest);
        } catch (error) {
            return Promise.reject(error);
        }
    }
    return Promise.reject(error);
})
export default apiClient;

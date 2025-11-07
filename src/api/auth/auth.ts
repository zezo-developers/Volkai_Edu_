import apiClient from "../client";

const registerUser = async (payload: IRegisterUser) => {
    return await apiClient.post('/api/v1/auth/register', payload);
};

const loginUser = async (payload: ILoginUser) => {
    return await apiClient.post('/api/v1/auth/login', payload);
};

const logoutUser = async () => {
    return await apiClient.post('/api/v1/auth/logout');
};

const verifyEmail = async (token: string) => {
    return await apiClient.post('/api/v1/auth/verify-email', { token });
};

const forgotPassword = async (email: string) => {
    return await apiClient.post('/api/v1/auth/password/forgot', {email});
};

const resetPassword = async (newPassword: string, token: string) => {
    console.log({newPassword, token})
    return await apiClient.post('/api/v1/auth/password/reset', {newPassword, token});
}

const AuthHttp = {
    registerUser,
    loginUser,
    logoutUser,
    verifyEmail,
    forgotPassword,
    resetPassword
};

export default AuthHttp;
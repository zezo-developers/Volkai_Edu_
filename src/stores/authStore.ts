import { create } from 'zustand';
import { persist } from 'zustand/middleware'
import AuthHttp from '../api/auth/auth';
import { AxiosError } from 'axios';

export interface IUser {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    status: 'active' | 'inactive',
    roles: string,
    emailVerified: boolean,
    avatarUrl: string 
}

export interface IOrganization {
    id:string,
    name: string,
    slug: string,
    status: string,
    createdBy: string,
    domain: string,
    logoUrl:string,
    website: string,
    industry: string,
    size: string,
}


interface AuthState {
    user: IUser | null,
    setUser: (user: IUser | null) => void

    organization: IOrganization | null,
    setOrganization: (org: IOrganization | null) => void

    accessToken: string | null,
    setAccessToken: (token: string | null) => void

    refreshToken: string | null,
    setRefreshToken: (token: string | null) => void,

    refreshAccessToken: () => void,

    logout: () => void
}

const useAuthStore = create<AuthState>()(persist(
    (set)=>({
        user: null,
        setUser: (user: any | null) => set({ user }),

        organization: null,
        setOrganization: (org: IOrganization | null) => set({ organization: org }),

        accessToken: null,
        setAccessToken: (token: string | null) => set({ accessToken: token }),

        refreshToken: null,
        setRefreshToken: (token: string | null) => set({ refreshToken: token }),
        
        refreshAccessToken: () => {},
        logout: async () => {
            try {
                console.log('loggin out')
                const res = await AuthHttp.logoutUser();
                console.log('logout res; ', res)
                if(res?.data?.success){
                    set({ accessToken: null, refreshToken: null, user: null, organization: null });
                }
            } catch (error) {
                console.log('logout error: ', error);
                if(error instanceof AxiosError){
                    console.log('logout error: ', error.response?.data);
                }
            }
        }
    }),
    { name: 'auth-storage' },
))

export default useAuthStore;
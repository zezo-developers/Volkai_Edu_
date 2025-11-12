import useAuthStore from '../../stores/authStore'
import { Navigate, Outlet } from 'react-router-dom';

const ProtectRoutes = () => {
    const token = useAuthStore.getState().accessToken;
    if(!token){
        return <Navigate to="/login" />
    }
  return (
    <Outlet/>
  )
}

export default ProtectRoutes
import useAuthStore from '../../stores/authStore'
import { Navigate, Outlet } from 'react-router-dom';

const AlreadyLogin = () => {
    const {accessToken} = useAuthStore(state=>state);
    if(accessToken){
        return <Navigate to="/" />;
    }
  return (
    <Outlet/>
  )
}

export default AlreadyLogin
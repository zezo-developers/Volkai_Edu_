
import Home from '../(app)/Home'
import { useRoutes } from 'react-router-dom'
import { LoginPage } from '../components/auth/LoginPage'
import { SignupPage } from '../components/auth/SignupPage'
import { StudentLoginPage } from '../components/auth/StudentLoginPage'
import { StudentSignupPage } from '../components/auth/StudentSignupPage'
import dashboardRoutes from './dashboard.routes'
import ProtectRoutes from './routesBarriers/ProtectRoutes'
import AlreadyLogin from './routesBarriers/AlreadyLogin'
import authRoutes from './auth.routes'

function AppRoutes () {
  const routes = [
    {path: '/', element: <Home/>},
    {
      path: '/auth', 
      element: <AlreadyLogin/>,
      children: authRoutes
    },
    
    {path: '/student-login', element: <StudentLoginPage/>},
    {path: '/student-signup', element: <StudentSignupPage/>},

    {path:'/dashboard', element:<ProtectRoutes/>, 
      children: dashboardRoutes
    },

    {path: '*', element: <div>404</div>},
  ]

  return useRoutes(routes)
}


export default AppRoutes;
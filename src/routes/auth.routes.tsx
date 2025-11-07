import { ForgotPassPage } from "../components/auth/ForgotPassPage";
import { LoginPage } from "../components/auth/LoginPage";
import { ResetPassPage } from "../components/auth/ResetPassPage";
import { SignupPage } from "../components/auth/SignupPage";
import VerifyEmailPage from "../components/auth/VerifyEmailPage";

const authRoutes = [
    {path: 'login', element: <LoginPage/>},
    {path: 'signup', element: <SignupPage/>},
    {path: 'verify-email/:token', element: <VerifyEmailPage/>},
    {path: 'forgot-pass', element: <ForgotPassPage/>},
    {path: 'reset-pass/:token', element: <ResetPassPage/>},
]

export default authRoutes;
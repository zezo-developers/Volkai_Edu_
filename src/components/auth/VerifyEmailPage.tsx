import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import AuthHttp from "../../api/auth/auth";
import useAuthStore from "../../stores/authStore";

const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const {setAccessToken, setRefreshToken, setUser, setOrganization} = useAuthStore();

  // --- define verification API call ---
  const verifyEmail = async () => {
    if (!token) throw new Error("Invalid or missing token");
    const res = await AuthHttp.verifyEmail(token);
    return res.data;
  };

  // --- useQuery handles loading / error / success automatically ---
  const { data, isLoading, isError, error, isSuccess } = useQuery({
    queryKey: ["verify-email", token],
    queryFn: verifyEmail,
    retry: false, // prevent retrying on 401/invalid token
    enabled: !!token, // run only if token exists
  });

  // --- optional: redirect or side effect on success ---
  React.useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        const tokens = data?.data?.tokens;
        const user = data?.data?.user;
        const organization = data?.data?.organization;
        
        setUser(user);
        setOrganization(organization);
        setAccessToken(tokens?.access);
        setRefreshToken(tokens.refresh);
        navigate("/auth/login");
      }, 3000);
    }
  }, [isSuccess, navigate]);

  // --- UI States ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-xl font-semibold">Verifying your email...</h1>
        <p>Please wait.</p>
      </div>
    );
  }

  if (isError) {
    console.error(error);
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-red-600">
        <h1 className="text-2xl font-bold">Verification Failed</h1>
        <p>{(error as any)?.response?.data?.message || "Invalid or expired link"}</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-green-600">
        <h1 className="text-2xl font-bold">Email Verified Successfully 🎉</h1>
        <p>Redirecting you to login...</p>
      </div>
    );
  }

  return null;
};

export default VerifyEmailPage;

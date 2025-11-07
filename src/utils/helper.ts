import { AxiosError } from "axios";
import { toast } from "react-toastify";

const normalizeError = (error: any) => {
    const errorGot = Array.isArray(error.response?.data.message) ? error.response?.data.message[0] : (error.response?.data.message)
    const normalizedError = errorGot.toLowerCase().includes('refresh') ? 'Something went wrong' : errorGot;
    return normalizedError;
}

export const handleErrorGlobally = (error: any) => {
    if(error instanceof AxiosError){
        console.log('error response: ', error.response?.data);
        return( normalizeError(error) ||'Something went wrong');
    }else{
        console.log('No Axios error: ',error);
        return ('Something went wrong');
    }
};
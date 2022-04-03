import axios from "axios";
import { APP_CONFIG } from "../config";

const api = axios.create({
	baseURL: APP_CONFIG.API_URL,
  headers: { 'Content-Type': 'application/json' },
})

const tokenInterceptor = (config: any) => {
	//config.headers.Authorization = ;
	console.log('STRING: ', APP_CONFIG.API_URL)
	console.log('request: ', config)
  return config;
};
api.interceptors.request.use(tokenInterceptor);

export default api

export const API = {
	AUTH_USER: '/auth/login'
}
import { API_URL, BASE_URL } from '@env'

type Configuration = {
	BASE_URL: any,
	API_URL: any
}

export const APP_CONFIG: Configuration = {
	BASE_URL: BASE_URL,
	API_URL: API_URL
}
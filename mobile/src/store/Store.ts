import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable } from "mobx";
import api, { API } from "../api";

class Store {
	  _user: any
	  _userIsLogged: boolean = false
	
	constructor() {
		makeAutoObservable(this)
	}
	
	loginUser = async (email:string, pass: string) => {
		try {
			const body = {
				email: email,
				password: pass
			}
			const response  = (await api.post(API.AUTH_USER, body)) as any
			const {data: {token}} = response
			console.log("USER", token)
			await AsyncStorage.setItem('@token', token)
			this.isUserLogged = true
		} catch (error: any) {
			console.log("ERRORRRR", Object.keys(error), error.response)
			console.error("Couldn't authenticate user ", error)
		}
	}
	
	checkAuth = async () => {
		const token = await AsyncStorage.getItem("@token")
		if (!!token && !this._userIsLogged) this._userIsLogged = true
	}
	
	get isUserLogged() {
		return this._userIsLogged
	}
	
	set isUserLogged(islogged) {
		this._userIsLogged = islogged
	}
	
	logoutUser = async () => {
		await AsyncStorage.removeItem('@token')
		this._userIsLogged = false
	}
}

export const createStore = () => {
	const store = new Store()
	return store
}

export type TSStore = ReturnType<typeof createStore>
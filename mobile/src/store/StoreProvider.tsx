import React from "react";
import { createStore, TSStore } from "./Store";
	
export const storeContext = React.createContext<TSStore | null>(null)

const getStore = (init: any) => {
	const [store] = React.useState(init)
	return store
}

export const useStore = () => {
	const store = React.useContext(storeContext)
	if (!store) throw new Error('useStore must be within a store provider')
	return store
}
 
 const StoreProvider: React.FC = ({children}) => {
	 const store = getStore(createStore)
	 console.log("Provider store", store)
	 return <storeContext.Provider value={store}>{children}</storeContext.Provider>
 }
 
 export default StoreProvider
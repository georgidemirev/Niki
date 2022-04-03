import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import LoginStackNavigator from './navigation/LoginStackNavigator';
import TabNavigator from './navigation/TabNavigator';
import { useStore } from './store/StoreProvider';
interface AppProps {
	navigation: any
}

const App: React.FC<AppProps> = ({navigation}) => {
	const { isUserLogged, _userIsLogged, checkAuth } = useStore()
	console.log("My app", isUserLogged)
	useEffect(() => {
		console.log("EFFEEECT", isUserLogged)
		checkAuth()
		
	}, [_userIsLogged])
	return (
			!_userIsLogged ? <LoginStackNavigator /> : <TabNavigator />
	)
}

export default observer(App)
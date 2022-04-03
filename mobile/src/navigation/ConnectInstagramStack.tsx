import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import ConnectScreen from '../screens/connectInstagram/ConnectScreen';
import ConnectSuccessScreen from '../screens/connectInstagram/ConnectSuccessScreen';

const Stack = createNativeStackNavigator()

const ConnectInstagramStack = () => {
	return (
		<Stack.Navigator>
			<Stack.Screen name='Connect' component={ConnectScreen}/>
			<Stack.Screen name='Success' component={ConnectSuccessScreen}/>
		</Stack.Navigator>
	)
}

export default ConnectInstagramStack
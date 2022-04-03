import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as React from 'react';
import MyApp from '../MyApp';
import ConnectInstagramStack from './ConnectInstagramStack';

const Stack = createNativeStackNavigator()

const RootStack = () => {
	return (
		<Stack.Navigator initialRouteName='MyApp'>
			<Stack.Group>
				<Stack.Screen name="MyApp" component={MyApp} options={{headerShown: false}} />
			</Stack.Group>
			<Stack.Group screenOptions={{presentation: 'modal'}}>
				<Stack.Screen name='ConnectModal' component={ConnectInstagramStack} options={{headerShown: false}} />
			</Stack.Group>
		</Stack.Navigator>
	)
}

export default RootStack

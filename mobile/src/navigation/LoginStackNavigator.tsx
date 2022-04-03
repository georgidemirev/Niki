import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ComponentsScreen from "../screens/ComponentsScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

const Stack = createNativeStackNavigator()

const LoginStackNavigator = () => {
	return (
		<Stack.Navigator initialRouteName='Login'>
			<Stack.Screen name='Login' component={LoginScreen} />
			<Stack.Screen name='Register' component={RegisterScreen} />
			<Stack.Screen name='Components' component={ComponentsScreen} />
		</Stack.Navigator>
	)
}

export default LoginStackNavigator
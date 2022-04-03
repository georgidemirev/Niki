import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as React from 'react';
import colors from "../assets/colors";
import AppIcon, { IconType } from "../components/common/AppIcon";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SupportScreen from "../screens/SupportScreen";


const Tab = createBottomTabNavigator()

const TabNavigator = () => {
	return (
		<Tab.Navigator
			screenOptions={({route}) => ({
				tabBarIcon: ({focused, color, size}) => {
					let iconName: IconType = 'chat'
					if (route.name === 'Chats') iconName = 'chat'
					else if (route.name === 'Profile') iconName = 'profile'
					else if (route.name === 'Support') iconName = 'profile'
					return <AppIcon icon={iconName} size={30} color={color} />
				},
				tabBarActiveTintColor: colors.purple,
				tabBarInactiveTintColor: colors.inactive_grey,
				tabBarActiveBackgroundColor: colors.white,
				tabBarInactiveBackgroundColor: colors.white,
				tabBarHideOnKeyboard: true,
				tabBarAllowFontScaling: true,
				tabBarLabelStyle: {fontSize: 16}
			})}>
			<Tab.Screen name='Chats' component={ChatScreen}/>
			<Tab.Screen name='Profile' component={ProfileScreen}/>
			<Tab.Screen name='Support' component={SupportScreen}/>
		</Tab.Navigator>
	)
}

export default TabNavigator


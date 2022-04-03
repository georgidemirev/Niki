
import React from "react";
import { Text, View } from "react-native";
import { Button } from "../components/common/Button";
import { useStore } from "../store/StoreProvider";

const ChatScreen = () => {
	const {logoutUser} = useStore()
	return (
		<View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
			<Text>Chat Screen</Text>
			<Button onPress={() => logoutUser()} title='Logout' />
		</View>
	)

}

export default ChatScreen
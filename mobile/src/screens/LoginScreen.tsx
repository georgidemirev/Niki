import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import colors from "../assets/colors"
import { Button } from "../components/common/Button"
import { HBox } from "../components/common/HBox"
import { Logo } from "../components/common/Logo"
import { TextInput } from "../components/common/TextInput"
import { useStore } from "../store/StoreProvider"

const LoginScreen = () => {
	const [email, setEmail] = useState('')
	const [pass, setPass] = useState('')
	
	const {loginUser} = useStore()
	
	const onPressLogin = () => {
		if (!!email && !!pass) loginUser(email, pass)
		
	}
	
	return (
		<ScrollView contentContainerStyle={{...styles.screenContainer}}>
			<HBox style={{...styles.logoContainer}}>
				<Logo />
			</HBox>
			<View style={{...styles.formContainer}}>
				<TextInput placeholder='Email' label='Email' onChangeText={text => setEmail(text.toLowerCase().trim())}/>
				<TextInput placeholder='Password' label='Password' secure onChangeText={text => setPass(text.trim())}/>
				<Button title='Login' onPress={onPressLogin}/>
				<View style={{...styles.optionsContainer}}>
					<Text onPress={() => console.log("Helpoo")} style={styles.textForgotPassword}>Forgot password?</Text>
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	border: {
		borderColor: 'magenta', 
		borderWidth: 1,
	},
	logoContainer: {
		paddingVertical: 0,
	},
	screenContainer: {
		flex: 1, 
		flexGrow: 1,
		alignItems: 'center',
		paddingVertical: '15%',
		backgroundColor: colors.background
	},
	formContainer: {
		flex: 1,
		width: '100%',
		paddingHorizontal: 15,
		justifyContent: 'center',
	},
	optionsContainer: {
		width: '100%',
		alignItems: 'center',
		marginVertical: 15,
	},
	textForgotPassword: {
		fontSize: 18,
		fontWeight: '500',
		color: colors.purple,
	}
})

export default observer(LoginScreen)
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/common/Button';
import { HBox } from '../components/common/HBox';
import { TextInput } from '../components/common/TextInput';


const ComponentsScreen = () => {
	return (
		<View style={styles.container}>
			<Text>influ.ai</Text>
			<TextInput label='Email' placeholder='Enter email' />
			<TextInput label='Password' placeholder='Enter password' />
			<Button title='ha'/>
			<View style={{alignItems: 'center'}}>
				<Text>Forgot your password?</Text>
				<HBox>
					<Text>Don't have an account?</Text>
					<Text>Sign up</Text>
				</HBox>
			</View>
		</View>
	)
}

export default ComponentsScreen

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
    justifyContent: 'center',
  },
})
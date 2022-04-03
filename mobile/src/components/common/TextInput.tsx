import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { TextInput as _TextInput } from "react-native-paper";

interface Props {
	label?: string
	onChangeText?(text: string): void
	secure?: boolean
	placeholder?: string
}

export const TextInput: React.FC<Props> = ({label, secure, placeholder, onChangeText}) => {
	const [value, setValue] = useState('')
	
	const handleTextValue = (text: string) => {
		setValue(text)
		if (onChangeText) onChangeText(text) 
	}
	
	return (
		<_TextInput 
		style={styles.container}
			label={label ?? ''} 
			value={value}
			mode='outlined'
			outlineColor='#8D06FF'
			placeholder={placeholder ?? 'Enter text'}
			secureTextEntry={secure}
			onChangeText={handleTextValue}/>
	)
}

const styles = StyleSheet.create({
	container: {
		marginVertical: 15
	}
})




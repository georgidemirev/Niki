import React from "react";
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import colors from "../../assets/colors";

interface ButtonProps {
	title: string,
	mode?: 'outlined' | 'primary'
	color?: string
	onPress?(): void
}

export const Button: React.FC<ButtonProps> = ({title, mode, color, onPress}) => {
	return (
		<TouchableOpacity style={{...styles.container, ...styles[mode ?? 'primary']}} onPress={onPress}>
			<Text style={{...styles.buttonText, ...styles[`${mode ?? 'primary'}Text`]}}>{title}</Text>
		</TouchableOpacity>
	
	)
}

const styles = StyleSheet.create({
	container: {
		borderRadius: 30,
		paddingVertical: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 15,
	},
	outlined: {
		borderWidth: 1,
		borderColor: colors.purple,
	},
	primary: {
		backgroundColor: colors.purple,
		
	},
	buttonText: {
		fontSize: 20,
		fontWeight: '700',
	},
	outlinedText: {
		color: colors.purple
	},
	primaryText: {
		color: '#fff'
	}
})
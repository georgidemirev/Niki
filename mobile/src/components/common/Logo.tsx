import React from 'react';
import { Image, View } from 'react-native';

export const Logo = () => {
	return (
		<View style={{width: 180, height: 60}}>
			<Image source={require('../../assets/logo.png')} style={{resizeMode: 'contain', width: '100%', height: '100%'}} />
		</View>
	)
}
import React from 'react'
import { View, ViewProps } from 'react-native'

export interface BoxProps {
	children?: any
	fullwidth?: boolean
	borderbox?: boolean
	style?: any
	align?: 'left' | 'center' | 'right' | 'around' | 'between' | 'evenly'
	valign?: 'top' | 'center' | 'bottom' | 'baseline' | 'stretch'
	bgColor?: string
	bgOpacity?: number
	className?: string
	ref?: any
	onClick?(): void
}

export const HBox: React.FC<BoxProps & ViewProps> = (props) => {
	
	const align = (): 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' => {
		switch (props.align) {
			case 'left': return 'flex-start'
			case 'center': return 'center'
			case 'right': return 'flex-end'
			case 'around': return 'space-around'
			case 'between': return 'space-between'
			case 'evenly': return 'space-evenly'
			default: return 'flex-start'
		}
	}
	
	const valign = (): 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline' => {
		switch (props.valign) {
			case 'top': return 'flex-start'
			case 'center': return 'center'
			case 'bottom': return 'flex-end'
			case 'stretch': return 'stretch'
			case 'baseline': return 'baseline'
			default: return 'flex-start'
		}
	}
	
	return (
		<View style={{
			flexDirection: 'row', 
			justifyContent: align(),
			alignItems: valign(),
			flexWrap: 'wrap', ...props.style}}>
			{props.children}
		</View>
	)
}
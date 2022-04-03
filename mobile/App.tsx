import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { SafeAreaView, useColorScheme } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import RootStack from './src/navigation/RootStack';
import StoreProvider from './src/store/StoreProvider';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  }

  return (
		<SafeAreaProvider>
			<SafeAreaView style={{flex: 1}}>
				<StoreProvider>
					<NavigationContainer>
					 <PaperProvider>
				  		<RootStack />
					 </PaperProvider>
			 		</NavigationContainer>
		 		</StoreProvider>
			</SafeAreaView>
		</SafeAreaProvider>
	 	
  )
}

export default App;

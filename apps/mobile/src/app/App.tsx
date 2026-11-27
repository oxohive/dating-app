import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NotificationsBootstrap } from '../features/notifications/components/NotificationsBootstrap';
import { RootNavigator } from './navigation/RootNavigator';

const queryClient = new QueryClient();

/**
 * App root: wires up the providers every feature relies on (navigation,
 * server-state cache, safe-area, gesture handling) and renders the root
 * stack. Intentionally has no feature logic of its own.
 */
export function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <RootNavigator />
            <NotificationsBootstrap />
            <StatusBar style="auto" />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

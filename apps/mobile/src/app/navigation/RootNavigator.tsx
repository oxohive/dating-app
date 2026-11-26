import type { RouteProp } from '@react-navigation/native';
import { createStackNavigator, type StackNavigationProp } from '@react-navigation/stack';
import { LoginScreen } from '../../features/auth/screens/LoginScreen';
import { ConversationScreen } from '../../features/messaging/screens/ConversationScreen';
import { InboxScreen } from '../../features/messaging/screens/InboxScreen';
import { DiscoveryScreen } from '../../features/discovery/screens/DiscoveryScreen';
import { LikesScreen } from '../../features/likes/screens/LikesScreen';
import { MatchesScreen } from '../../features/matches/screens/MatchesScreen';
import { OnboardingScreen } from '../../features/onboarding/screens/OnboardingScreen';
import { ProfileScreen } from '../../features/profile/screens/ProfileScreen';

/**
 * Every route the app can navigate to, with its params. This is the
 * single source of truth other screens type their navigation/route
 * hooks against.
 */
export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Discovery: undefined;
  Profile: undefined;
  Likes: undefined;
  Matches: undefined;
  Inbox: undefined;
  Conversation: { conversationId: string };
};

export type RootNavigationProp = StackNavigationProp<RootStackParamList>;
export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<RootStackParamList, T>;

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Root stack for the whole app. Flat for the MVP skeleton — tab
 * navigation between Discovery/Likes/Matches/Inbox/Profile can replace
 * this once the product shape settles.
 */
export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen component={LoginScreen} name="Login" options={{ headerShown: false }} />
      <Stack.Screen component={OnboardingScreen} name="Onboarding" />
      <Stack.Screen component={DiscoveryScreen} name="Discovery" />
      <Stack.Screen component={ProfileScreen} name="Profile" />
      <Stack.Screen component={LikesScreen} name="Likes" />
      <Stack.Screen component={MatchesScreen} name="Matches" />
      <Stack.Screen component={InboxScreen} name="Inbox" />
      <Stack.Screen component={ConversationScreen} name="Conversation" />
    </Stack.Navigator>
  );
}

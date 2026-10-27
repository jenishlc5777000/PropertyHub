import './src/i18n';
import { useEffect, useMemo, useState } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { ThemeContext, darkColors, lightColors } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OnboardingScreen, LoginScreen, RegisterScreen, ForgotPasswordScreen } from './src/screens/auth';
import { HomeScreen, SearchScreen, MapScreen } from './src/screens/browse';
import PropertyDetailScreen from './src/screens/PropertyDetail';
import PostPropertyScreen from './src/screens/PostProperty';
import { InquiriesScreen, ChatScreen } from './src/screens/inquiries';
import {
  FavoritesScreen,
  MyListingsScreen,
  UnlockedContactsScreen,
  CreditsScreen,
  NotificationsScreen,
  ProfileScreen,
  SettingsScreen,
  AgentProfileScreen,
  EmiScreen,
} from './src/screens/account';
import { AdminReviewScreen } from './src/screens/admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (n, e) => n < 2 && (!e.response || e.response.status >= 500) },
  },
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

function Tabs() {
  const { t } = useTranslation();
  const icons = { Home: 'home', Search: 'search', Map: 'map', Favorites: 'heart', Profile: 'person' };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? icons[route.name] : `${icons[route.name]}-outline`} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('home') }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: t('search') }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: t('map') }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: t('favorites') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} />
    </Tab.Navigator>
  );
}

function RootNavigator({ onboarded, setOnboarded }) {
  const { t } = useTranslation();
  const { ready } = useAuth();
  if (!ready || onboarded === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#059669" size="large" />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      {!onboarded ? (
        <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
          {(props) => <OnboardingScreen {...props} onDone={setOnboarded} />}
        </Stack.Screen>
      ) : null}
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="AgentProfile" component={AgentProfileScreen} options={{ title: '' }} />
      <Stack.Screen name="PostProperty" component={PostPropertyScreen} options={{ title: t('postProperty') }} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} options={{ title: t('myListings') }} />
      <Stack.Screen name="Inquiries" component={InquiriesScreen} options={{ title: t('inquiries') }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: '' }} />
      <Stack.Screen name="UnlockedContacts" component={UnlockedContactsScreen} options={{ title: t('unlockedContacts') }} />
      <Stack.Screen name="Credits" component={CreditsScreen} options={{ title: t('creditsBilling') }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('notifications') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings') }} />
      <Stack.Screen name="Emi" component={EmiScreen} options={{ title: t('emiCalculator') }} />
      <Stack.Screen name="AdminReview" component={AdminReviewScreen} options={{ title: 'Review queue' }} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('login') }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t('register') }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: t('resetPassword') }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}

/** Opens the relevant screen when a push notification is tapped. */
function useNotificationRouting() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      if (!navigationRef.isReady()) return;
      if (data.review) navigationRef.navigate('AdminReview');
      else if (data.inquiryId) navigationRef.navigate('Chat', { id: data.inquiryId });
      else if (data.slug || data.propertyId) navigationRef.navigate('PropertyDetail', { slug: data.slug || data.propertyId });
      else if (data.type === 'credits' || data.type === 'payment') navigationRef.navigate('Credits');
      else navigationRef.navigate('Notifications');
    });
    return () => sub.remove();
  }, []);
}

export default function App() {
  const system = useColorScheme();
  const [mode, setModeState] = useState('system');
  const [onboarded, setOnboarded] = useState(null);
  useNotificationRouting();

  useEffect(() => {
    AsyncStorage.multiGet(['ph_theme', 'ph_onboarded']).then(([[, th], [, ob]]) => {
      if (th) setModeState(th);
      setOnboarded(ob === '1');
    });
  }, []);

  const setMode = (m) => {
    setModeState(m);
    AsyncStorage.setItem('ph_theme', m).catch(() => {});
  };
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const colors = dark ? darkColors : lightColors;
  const theme = useMemo(() => ({ colors, mode, setMode }), [colors, mode]);
  const navTheme = useMemo(
    () => ({
      ...(dark ? DarkTheme : DefaultTheme),
      colors: { ...(dark ? DarkTheme : DefaultTheme).colors, primary: colors.accent, background: colors.bg, card: colors.card, text: colors.text, border: colors.border },
    }),
    [dark, colors]
  );

  const finishOnboarding = () => {
    AsyncStorage.setItem('ph_onboarded', '1').catch(() => {});
    setOnboarded(true);
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeContext.Provider value={theme}>
          <AuthProvider>
            <NavigationContainer ref={navigationRef} theme={navTheme}>
              <StatusBar style={dark ? 'light' : 'dark'} />
              <RootNavigator onboarded={onboarded} setOnboarded={finishOnboarding} />
            </NavigationContainer>
          </AuthProvider>
        </ThemeContext.Provider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

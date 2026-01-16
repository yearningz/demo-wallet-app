import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from 'react-native';
import { RootStackParamList } from './src/navigation/types';

import LoginScreen from './src/screens/LoginScreen';
import CreateAccountScreen from './src/screens/CreateAccountScreen';
import AccountDetailsScreen from './src/screens/AccountDetailsScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import AssetsScreen from './src/screens/AssetsScreen';
import HomeScreen from './src/screens/HomeScreen';
import CardManageScreen from './src/screens/CardManageScreen';
import MineScreen from './src/screens/MineScreen';
import QrScanScreen from './src/screens/QrScanScreen';
import ScanResultScreen from './src/screens/ScanResultScreen';
import SelectTokenScreen from './src/screens/SelectTokenScreen';
import SelectNetworkScreen from './src/screens/SelectNetworkScreen';
import ReceivingAddressScreen from './src/screens/ReceivingAddressScreen';
import InputAmountScreen from './src/screens/InputAmountScreen';
import TestHttpsScreen from './src/screens/TestHttpsScreen';
import TransactionDetailsScreen from './src/screens/TransactionDetailsScreen';
import OrderListScreen from './src/screens/OrderListScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import PreAuthSuccessScreen from './src/screens/PreAuthSuccessScreen';

type TabParamList = {
  首页: undefined;
  卡管理: undefined;
  Assets: undefined;
  我的: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // 标签样式与高度
        tabBarActiveTintColor: '#D84A4F',
        tabBarInactiveTintColor: '#8F8F8F',
        tabBarLabelStyle: { fontSize: 16, lineHeight: 30, textAlign: 'center' },
        tabBarStyle: { height: 90, display:'flex',alignItems: 'center', justifyContent: 'center'},
        tabBarItemStyle: { height: 90, display:'flex',alignItems: 'center', justifyContent: 'center'},
        tabBarIcon: ({ focused }) => {
          // 使用 src/tabs 下的图片资源；卡管理暂用首页图标占位
          const name = route.name;
          const iconSource = (() => {
            if (name === '首页') {
              return focused
                ? require('./src/tabs/home-selected.png')
                : require('./src/tabs/home-unselected.png');
            }
            if (name === '我的') {
              return focused
                ? require('./src/tabs/mine-selected.png')
                : require('./src/tabs/mine-unselected.png');
            }
            // 卡管理
            return focused
              ? require('./src/tabs/card-selected.png')
              : require('./src/tabs/card-unselected.png');
          })();
          return (
            <Image
              source={iconSource}
              style={{ width: 32, height: 32, marginTop: 40, marginBottom: 40, resizeMode: 'contain', alignSelf: 'center' }}
            />
          );
        },
      })}
    >
      <Tab.Screen name="首页" component={HomeScreen} />
      <Tab.Screen name="卡管理" component={CardManageScreen} />
      <Tab.Screen name="Assets" component={AssetsScreen} options={{ tabBarLabel: '资产' }} />
      <Tab.Screen name="我的" component={MineScreen} />
    </Tab.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{ headerShown: false, contentStyle: { paddingTop: 20, backgroundColor: '#fff' } }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Assets" component={AssetsScreen} />
        <Stack.Screen name="SelectToken" component={SelectTokenScreen} />
        <Stack.Screen name="SelectNetwork" component={SelectNetworkScreen} />
        <Stack.Screen name="ReceivingAddress" component={ReceivingAddressScreen} />
        <Stack.Screen name="InputAmount" component={InputAmountScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
        <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
        <Stack.Screen name="TestHttps" component={TestHttpsScreen} />
        <Stack.Screen name="QrScan" component={QrScanScreen} />
        <Stack.Screen name="ScanResult" component={ScanResultScreen} />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="OrderList" component={OrderListScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
        <Stack.Screen name="PreAuthSuccess" component={PreAuthSuccessScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;

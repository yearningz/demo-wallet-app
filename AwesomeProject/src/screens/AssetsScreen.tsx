import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

const mockTokens = [
  { symbol: 'BNB', price: '$586.16', change: '-0.18%' },
  { symbol: 'METIS', price: '$13.7', change: '+0.46%' },
  { symbol: 'USDT', price: '$0.99985', change: '+0.01%' },
  { symbol: 'CRVUSD', price: '$0.99985', change: '+0.04%' },
  { symbol: 'Cake', price: '$1.84', change: '-3.33%' },
  { symbol: 'ETH', price: '$1,633.02', change: '+0.51%' },
  { symbol: 'POL', price: '$0.18306', change: '-0.51%' },
];

type TabParamList = {
  首页: undefined;
  卡管理: undefined;
  Assets: undefined;
  我的: undefined;
};
type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Assets'>,
  NativeStackScreenProps<RootStackParamList>
>;

const AssetsScreen = ({}: Props) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>资产</Text></View>
      <WebView
        source={{ uri: 'http://172.20.10.6:8088/app/cards/index.html' }}
        style={styles.webview}
        startInLoadingState
        renderError={() => (
          <View style={styles.body}><Text style={styles.placeholder}>页面加载失败</Text></View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600', color: '#222' },
  webview: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#666' },
});

export default AssetsScreen;

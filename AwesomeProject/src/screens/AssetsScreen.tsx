import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

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
              <View style={styles.header}>
                  
                  </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600', color: '#222' },
  webview: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#666' },
});

export default AssetsScreen;

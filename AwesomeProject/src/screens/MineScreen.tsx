import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const MineScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>我的</Text></View>
      <WebView
        source={{ uri: 'http://172.20.10.6:8088/app/profile/index.html' }}
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
  title: { fontSize: 18, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#666' },
  webview: { flex: 1 },
});

export default MineScreen;

import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const CardManageScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} />
      <WebView
        source={{ uri: 'http://172.20.10.6:8088/app/cards/fiat/index.html' }}
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
  webview: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#666' },
});

export default CardManageScreen;

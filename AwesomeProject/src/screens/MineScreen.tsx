import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

const MineScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <WebView
        source={{ uri: 'http://172.20.10.6:8088/app/profile/index.html' }}
        style={styles.webview}
        startInLoadingState
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
        renderError={() => (
          <View style={styles.body}><Text style={styles.placeholder}>页面加载失败</Text></View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 0,
    padding: 0,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#222' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#666' },
  webview: { 
    flex: 1,
    margin: 0,
    padding: 0,
  },
});

export default MineScreen;

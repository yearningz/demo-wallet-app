import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';

const MineScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>我的</Text></View>
      <View style={styles.body}>
        <Text style={styles.placeholder}>个人中心</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: '#666' },
});

export default MineScreen;
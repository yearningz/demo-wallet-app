import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScanResultScreenProps } from '../navigation/types';

const ScanResultScreen = ({ navigation, route }: ScanResultScreenProps) => {
  const { text } = route.params;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>扫码结果</Text></View>
      <View style={styles.body}>
        <Text style={styles.label}>二维码内容</Text>
        <Text style={styles.value}>{text}</Text>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.pop()}>
          <Text style={styles.btnText}>返回</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 14, color: '#666' },
  value: { marginTop: 8, fontSize: 16, color: '#222' },
  btn: { marginTop: 24, backgroundColor: '#f44336', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 16 },
});

export default ScanResultScreen;
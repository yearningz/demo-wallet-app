import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PreAuthSuccessScreenProps } from '../navigation/types';

type Props = PreAuthSuccessScreenProps;

const formatTimestamp = (ts: any) => {
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return '-';
  const d = new Date(n * 1000);
  const pad = (x: number) => String(x).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${dd} ${hh}:${mm}:${ss}`;
};

const PreAuthSuccessScreen = ({ navigation, route }: Props) => {
  const tokenSymbol = route?.params?.tokenSymbol ?? '';
  const txHash = route?.params?.txHash ?? '';
  const blockNumber = route?.params?.blockNumber ?? '';
  const timestamp = route?.params?.timestamp ?? '';
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fullScreenMask}>
        <Text style={styles.successTitle}>预授权开通成功</Text>
        <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>网络类型</Text>
            <Text style={styles.sectionValue}>以太访</Text>
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>币种</Text>
            <Text style={styles.sectionValue}>{tokenSymbol || '-'}</Text>
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>链上交易哈希</Text>
            <Text style={styles.sectionValue}>{txHash || '-'}</Text>
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>区块号</Text>
            <Text style={styles.sectionValue}>{blockNumber || '-'}</Text>
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>区块时间戳</Text>
            <Text style={styles.sectionValue}>{formatTimestamp(timestamp)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, { marginTop: 30, alignSelf: 'stretch' }]}
          onPress={() => navigation.pop()}
        >
          <Text style={styles.payBtnText}>完成</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  fullScreenMask: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#222' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 14, color: '#666', fontWeight: '700',width: 90 },
  sectionValue: { fontSize: 14, color: '#222',width: 200 },
  payBtn: { backgroundColor: '#D84A4F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: '#fff', fontSize: 16, textAlign: 'center' },
});

export default PreAuthSuccessScreen;

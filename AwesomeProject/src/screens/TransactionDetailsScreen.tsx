import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { TransactionDetailsScreenProps } from '../navigation/types';

const maskAddress = (addr: string) => {
  if (!addr || addr.length <= 12) return addr;
  const head = addr.slice(0, 6);
  const tail = addr.slice(-6);
  return `${head}******${tail}`;
};

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

const TransactionDetailsScreen = ({ navigation, route }: TransactionDetailsScreenProps) => {
  const { txn } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>交易详情</Text>
        <Text style={styles.close}>×</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle]}>链下信息</Text>
            <View style={styles.box}>
          <View style={styles.row}><Text style={styles.label}>商户号</Text><Text style={styles.value}>{txn?.merchantId ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>终端号</Text><Text style={styles.value}>{txn?.terminalId ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>订单号</Text><Text style={styles.value}>{txn?.referenceNumber ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>交易时间</Text><Text style={styles.value}>{formatTimestamp(txn?.timestamp)}</Text></View>
        </View>
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>链上信息</Text>
        <View style={styles.box}>
          <View style={styles.row}><Text style={styles.label}>链上交易哈希</Text><Text style={styles.value}>{txn?.tx_hash ?? txn?.txHash ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>链上交易状态</Text><Text style={styles.value}>{txn?.status ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>区块号</Text><Text style={styles.value}>{txn?.block_number ?? txn?.blockNumber ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>区块时间戳</Text><Text style={styles.value}>{formatTimestamp(txn?.block_timestamp ?? txn?.timestamp)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>发送方地址</Text><Text style={styles.value}>{maskAddress((txn?.from_address ?? txn?.fromAddress) || '')}</Text></View>
          <View style={styles.row}><Text style={styles.label}>接收方地址</Text><Text style={styles.value}>{maskAddress((txn?.to_address ?? txn?.toAddress) || '')}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Gas使用量</Text><Text style={styles.value}>{txn?.gas_used ?? txn?.gasUsed ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Gas价格(Wei)</Text><Text style={styles.value}>{txn?.gas_price ?? txn?.gasPrice ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Gas费用</Text><Text style={styles.value}>{txn?.gas_cost ?? txn?.gasCost ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>合约函数名</Text><Text style={styles.value}>{txn?.function_name ?? txn?.functionName ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>代币符号</Text><Text style={styles.value}>{txn?.token_symbol ?? (Array.isArray(txn?.tokenTransfers) && txn?.tokenTransfers[0]?.tokenSymbol) ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>转账金额</Text><Text style={styles.value}>{txn?.amount ?? (Array.isArray(txn?.tokenTransfers) && txn?.tokenTransfers[0]?.amount) ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>业务状态码</Text><Text style={styles.value}>{txn?.status_code ?? txn?.statusCode ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>状态消息</Text><Text style={styles.value}>{txn?.message ?? txn?.msg ?? '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>链ID</Text><Text style={styles.value}>{txn?.chain_id ?? txn?.chainId ?? '-'}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomColor: '#eee', borderBottomWidth: 1 },
  back: { fontSize: 18, color: '#333' },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  close: { fontSize: 18, color: '#333' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 14, color: '#222', fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 13, color: '#555' ,width: '40%'},
  value: { fontSize: 13, color: '#333' , width: '50%'},
  box: { marginTop: 12, borderColor: '#eee', borderWidth: 1, borderRadius: 8, padding: 12 },
  boxTitle: { fontSize: 13, color: '#333', marginBottom: 8, fontWeight: '600' },
  boxText: { fontSize: 12, color: '#444' },
});

export default TransactionDetailsScreen;

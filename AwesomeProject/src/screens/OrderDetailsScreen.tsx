import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';

import { OrderDetailsScreenProps } from '../navigation/types';

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

const OrderDetailsScreen = ({ navigation, route }: OrderDetailsScreenProps) => {
  const referenceNumber = route?.params?.referenceNumber ?? '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`http://172.20.10.6:8088/api/v1/posTransaction/queryOrderDetail?referenceNumber=${referenceNumber}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        const d = json?.data ?? {};
        const mapped = {
          txHash: String(d?.txHash ?? d?.tx_hash ?? ''),
          status: String(d?.status ?? ''),
          blockNumber: String(d?.blockNumber ?? d?.block_number ?? ''),
          timestamp: String(d?.timestamp ?? d?.block_timestamp ?? ''),
          fromAddress: String(d?.fromAddress ?? d?.from_address ?? ''),
          toAddress: String(d?.toAddress ?? d?.to_address ?? ''),
          gasUsed: String(d?.gasUsed ?? d?.gas_used ?? ''),
          gasPrice: String(d?.gasPrice ?? d?.gas_price ?? ''),
          gasCost: String(d?.gasCost ?? d?.gas_cost ?? ''),
          inputData: String(d?.inputData ?? ''),
          functionName: String(d?.functionName ?? d?.function_name ?? ''),
          tokenSymbol: String(d?.tokenSymbol ?? (Array.isArray(d?.tokenTransfers) && d?.tokenTransfers[0]?.tokenSymbol) ?? ''),
          amount: String(d?.amount ?? (Array.isArray(d?.tokenTransfers) && d?.tokenTransfers[0]?.amount) ?? ''),
          merchantId: String(d?.merchantId ?? ''),
          terminalId: String(d?.terminalId ?? ''),
          referenceNumber: String(d?.referenceNumber ?? ''),
          transactionAmount: String(d?.transactionAmount ?? ''),
          statusCode: String(json?.statusCode ?? d?.statusCode ?? ''),
          msg: String(json?.msg ?? d?.msg ?? ''),
          chainId: String(d?.chainId ?? d?.chain_id ?? ''),
        };
        setData(mapped);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [referenceNumber]);

  const dto = (data as any) ?? {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>订单详情</Text>
        <Text style={styles.back} onPress={() => navigation.goBack()}>←</Text>
      </View>
      {loading && <Text style={styles.loading}>正在加载详情…</Text>}
      {!!error && <Text style={styles.error}>错误：{error}</Text>}
      {!loading && !error && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>链下信息</Text>
          <View style={styles.row}><Text style={styles.label}>商户号</Text><Text style={styles.value}>{dto?.merchantId || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>终端号</Text><Text style={styles.value}>{dto?.terminalId || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>交易金额</Text><Text style={styles.value}>{dto?.transactionAmount != null ? `$${String(dto?.transactionAmount)}` : '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>订单号</Text><Text style={styles.value}>{dto?.referenceNumber || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>交易日期、时间</Text><Text style={styles.value}>{formatTimestamp(dto?.timestamp)}</Text></View>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>链上信息</Text>
          <View style={styles.row}><Text style={styles.label}>链上交易哈希</Text><Text style={styles.value}>{dto?.txHash || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>链上交易状态</Text><Text style={styles.value}>{dto?.status || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>区块号</Text><Text style={styles.value}>{dto?.blockNumber || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>区块时间戳</Text><Text style={styles.value}>{formatTimestamp(dto?.timestamp)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>发送方地址</Text><Text style={styles.value}>{maskAddress(String(dto?.fromAddress || ''))}</Text></View>
          <View style={styles.row}><Text style={styles.label}>接收方地址</Text><Text style={styles.value}>{maskAddress(String(dto?.toAddress || ''))}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Gas使用量</Text><Text style={styles.value}>{dto?.gasUsed || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Gas价格(Wei)</Text><Text style={styles.value}>{dto?.gasPrice || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Gas费用</Text><Text style={styles.value}>{dto?.gasCost || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>合约函数名</Text><Text style={styles.value}>{dto?.functionName || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>代币符号</Text><Text style={styles.value}>{dto?.tokenSymbol || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>转账金额</Text><Text style={styles.value}>{dto?.amount || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>业务状态码</Text><Text style={styles.value}>{dto?.statusCode || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>状态消息</Text><Text style={styles.value}>{dto?.msg || '-'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>链ID</Text><Text style={styles.value}>{dto?.chainId || '-'}</Text></View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomColor: '#eee', borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  back: { fontSize: 18, color: '#333' },
  loading: { paddingHorizontal: 16, paddingTop: 8, color: '#666', fontSize: 12 },
  error: { paddingHorizontal: 16, paddingTop: 8, color: '#d32f2f', fontSize: 12 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 14, color: '#222', fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 12, color: '#555', width: 70 },
  value: { fontSize: 13, color: '#333' },
});

export default OrderDetailsScreen;

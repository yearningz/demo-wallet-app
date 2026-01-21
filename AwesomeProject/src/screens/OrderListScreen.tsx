import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

import { OrderListScreenProps } from '../navigation/types';

const statusMap: Record<string, string> = {
  '00': '成功',
  '01': '成功',
  '02': '处理中',
  '03': '失败',
};

const OrderListScreen = ({ navigation, route }: OrderListScreenProps) => {
  const userId = route?.params?.userId ?? '03572638';
  const tokenSymbol = route?.params?.tokenSymbol ?? '';
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('http://172.20.10.6:8088/api/v1/posTransaction/queryOrderList?reqType=app&primaryAccountNumber=625807******4153&tokenSymbol=' + tokenSymbol, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        console.warn(json);
        const arr = Array.isArray(json?.data) ? json.data : [];
        const mapped = arr.map((it: any, idx: number) => ({
          id: String(it?.offChain?.id ?? idx),
          time: String(it?.offChain?.transactionTime ?? ''),
          amount: String(it?.offChain?.transactionAmount ?? ''),
          status: String(it?.offChain?.transactionStatus ?? it?.offChain?.returnCode ?? ''),
          referenceNumber: String(it?.offChain?.referenceNumber ?? ''),
          hash: String(it?.offChain?.chainTransactionHash ?? ''),
          merchantId: String(it?.offChain?.merchantId ?? ''),
          terminalId: String(it?.offChain?.terminalId ?? ''),
          messageType: String(it?.offChain?.messageType ?? ''),
        }));
        setList(mapped);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, tokenSymbol]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('OrderDetails', { referenceNumber: String(item.referenceNumber || '') })}
    >
      <View style={styles.left}> 
        <Text style={styles.amount}>${item.amount}</Text>
        <Text style={styles.status}>{statusMap[item.status] ?? item.status}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.ref}>订单号 {item.referenceNumber}</Text>
        <Text style={styles.time}>{item.time}</Text>
        {!!item.hash && <Text style={styles.hash}>Hash {item.hash.slice(0, 10)}…{item.hash.slice(-6)}</Text>}
      </View>
      <View style={styles.right}>
        <Text style={styles.more}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>←</Text></TouchableOpacity>
        <Text style={styles.title}>详情列表</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.close}>×</Text>
        </TouchableOpacity>
      </View>
      {loading && <Text style={styles.loading}>正在加载订单…</Text>}
      {!!error && <Text style={styles.error}>错误：{error}</Text>}
      <FlatList
        data={list}
        keyExtractor={(item) => String( item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        ListEmptyComponent={!loading && !error ? (<View style={styles.empty}><Text style={styles.emptyText}>暂无订单</Text></View>) : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomColor: '#eee', borderBottomWidth: 1 },
  back: { fontSize: 18, color: '#333' },
  title: { fontSize: 16, fontWeight: '600', color: '#222' },
  close: { fontSize: 18, color: '#333' },
  loading: { paddingHorizontal: 16, paddingTop: 8, color: '#666', fontSize: 12 },
  error: { paddingHorizontal: 16, paddingTop: 8, color: '#d32f2f', fontSize: 12 },
  content: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomColor: '#f5f5f5', borderBottomWidth: 1 },
  left: { width: 88 },
  amount: { fontSize: 16, color: '#222', fontWeight: '600' },
  status: { fontSize: 12, color: '#777', marginTop: 4 },
  mid: { flex: 1, paddingHorizontal: 12 },
  ref: { fontSize: 13, color: '#333' },
  time: { fontSize: 12, color: '#777', marginTop: 2 },
  hash: { fontSize: 11, color: '#999', marginTop: 2 },
  right: { width: 24, alignItems: 'flex-end' },
  more: { fontSize: 20, color: '#bbb' },
  empty: { paddingTop: 20, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 13 },
});

export default OrderListScreen;

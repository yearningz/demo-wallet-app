import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const stableSymbols = ['USDT', 'USDC', 'EURC'];

const maskToken = (s: string) => {
  if (!s) return '';
  const head = s.slice(0, 6);
  const tail = s.slice(-4);
  return `${head}****${tail}`;
};

const maskAddress = (addr: string) => {
  if (!addr) return '';
  const head = addr.slice(0, 6);
  const tail = addr.slice(-6);
  return `${head}******${tail}`;
};

const CardManageScreen = () => {
  const navigation = useNavigation<any>();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revokingSymbol, setRevokingSymbol] = useState<string | null>(null);

  const revokePreAuth = async (tokenSymbol: string) => {
    try {
      setRevokingSymbol(tokenSymbol);
      const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/revokeApplyPreAuth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "userId": "03572638",
          "primaryAccountNumber": "625807******4153",
          "tokenSymbol": tokenSymbol
        }),
      });
      const json = await res.json();
      console.warn('json', json);
        console.warn('json', json.statusCode);
      if (json?.statusCode == '00') {
        Alert.alert('成功', '预授权撤销成功');
      } else {
        Alert.alert('失败', json?.statusMsg || '撤销预授权失败');
      }
    } catch (e: any) {
      Alert.alert('错误', e?.message || '网络请求失败');
    } finally {
      setRevokingSymbol(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('http://172.20.10.6:8088/api/v1/posTransaction/queryCards?userId=03572638', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        console.warn('json', json);
        const data = Array.isArray(json?.data) ? json.data : [];
        const mapped = data.map((c: any, idx: number) => ({
          id: String(c?.id ?? idx),
          type: c?.cardType === 'S' ? 'stable' : 'bank',
          name: c?.cardType === 'S' ? '稳定币账户' : (c?.issuingInstitution || '银行卡'),
          token: String(c?.primaryAccountNumber || ''),
          address: String(c?.blockchainAddress || ''),
          coins: Array.isArray(c?.balanceInfos)
            ? c.balanceInfos.map((b: any) => ({ symbol: String(b?.tokenSymbol || ''), balance: String(b?.balance || '') }))
            : [],
          color: c?.cardType === 'S' ? '#e7f0ff' : '#f8d7e2',
        }));
        setCards(mapped);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>卡管理</Text></View>
      {loading && <Text style={styles.loading}>正在加载卡列表…</Text>}
      {!!error && <Text style={styles.error}>错误：{error}</Text>}
      <FlatList
        data={cards}
        keyExtractor={(item, idx) => String((item as any).id ?? idx)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading && !error ? (
          <View style={styles.empty}><Text style={styles.emptyText}>暂无卡片</Text></View>
        ) : null}
        renderItem={({ item }) => (
          <View style={[styles.cardRow, ((item as any).type === 'stable') ? styles.rowStable : styles.rowBank]}>
            {(() => {
              const t = (item as any).type;
              const name = String((item as any).name || '');
              const src = t === 'stable'
                ? require('../tabs/usdc.png')
                : name.includes('招商')
                  ? require('../tabs/招商银行.png')
                  : name.includes('上海')
                    ? require('../tabs/上海银行.png')
                    : require('../tabs/card-unselected.png');
              return (
                <Image source={src} style={styles.cardImage} resizeMode="contain" />
              );
            })()}
            <View style={styles.cardCenter}>
              <Text style={styles.cardName}>{(item as any).name} [{maskToken((item as any).token)}]</Text>
              {(item as any).type === 'stable' && <Text style={styles.addr}>地址 {maskAddress((item as any).address)}</Text>}
              {(item as any).type === 'stable' && Array.isArray((item as any).coins) && (item as any).coins.length > 0 && (
                <View style={styles.stableRow}>
                  {(((item as any).coins ?? []) as { symbol: string; balance: string }[]).map((c: { symbol: string; balance: string }, idx: number) => (
                    <View key={`${c.symbol}-${idx}`} style={styles.stableChip}>
                      <Text style={styles.stableChipText}>{`${c.symbol}: ${c.balance}`}</Text>
                      <TouchableOpacity style={styles.transferBtn} onPress={() => {
                        navigation.navigate('OrderList', { userId: '03572638', tokenSymbol:c.symbol });
                      }}>
                        <Text style={styles.transferText}>详情</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.transferBtn, revokingSymbol === c.symbol && { opacity: 0.6 }]}
                        disabled={revokingSymbol === c.symbol}
                        onPress={() => revokePreAuth(c.symbol)}
                      >
                        {revokingSymbol === c.symbol ? (
                          <ActivityIndicator size="small" color="#666" />
                        ) : (
                          <Text style={styles.transferText}>撤销预授权</Text>
                        )}
                      </TouchableOpacity>
                    </View>

                  ))}
                </View>

              )}
            </View>
            {/* <TouchableOpacity style={styles.transferBtn} onPress={() => {
              navigation.navigate('OrderList', { userId: '03572638',tokenSymbol:'' });
            }}>
              <Text style={styles.transferText}>详情</Text>
            </TouchableOpacity> */}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600' },
  list: { padding: 16 },
  loading: { paddingHorizontal: 16, paddingTop: 8, color: '#666', fontSize: 12 },
  error: { paddingHorizontal: 16, paddingTop: 8, color: '#d32f2f', fontSize: 12 },
  empty: { paddingHorizontal: 16, paddingTop: 20 },
  emptyText: { color: '#999', fontSize: 13 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  rowStable: { backgroundColor: '#eef5ff' },
  rowBank: { backgroundColor: '#f9f1f1' },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  cardCenter: { flex: 1 },
  cardName: { fontSize: 15, color: '#222', fontWeight: '600' },
  addr: { marginTop: 6, fontSize: 12, color: '#555' },
  stableRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  stableChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fff' },
  stableChipText: { fontSize: 12, color: '#333' },
  transferBtn: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferText: { fontSize: 14, color: '#666' },
});

export default CardManageScreen;

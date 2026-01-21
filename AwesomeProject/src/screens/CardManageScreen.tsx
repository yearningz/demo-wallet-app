import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const toNumber = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

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
  const [preAuthMap, setPreAuthMap] = useState<Record<string, boolean>>({});
  const [applyingSymbol, setApplyingSymbol] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bank' | 'stable'>('bank');

  const recheckPreAuth = async (tokenSymbol: string) => {
    try {
      const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/checkPreAuth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryAccountNumber: '625807******4153',
          tokenSymbol,
          userId: '03572638',
        }),
      });
      const json = await res.json();
      const approved = json?.statusCode === '00' && json?.data?.approved === true;
      setPreAuthMap((prev) => ({ ...(prev || {}), [tokenSymbol]: approved }));
    } catch {}
  };

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
      if (json?.statusCode === '00') {
        Alert.alert('成功', '预授权撤销成功');
        await recheckPreAuth(tokenSymbol);
      } else {
        Alert.alert('失败', json?.statusMsg || '撤销预授权失败');
        await recheckPreAuth(tokenSymbol);
      }
    } catch (e: any) {
      Alert.alert('错误', e?.message || '网络请求失败');
    } finally {
      setRevokingSymbol(null);
    }
  };

  const applyPreAuth = async (tokenSymbol: string) => {
    try {
      setApplyingSymbol(tokenSymbol);
      const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/applyPreAuth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryAccountNumber: '625807******4153',
          tokenSymbol: tokenSymbol,
          userId: '03572638',
        }),
      });
      const json = await res.json();
      if (json?.statusCode === '00') {
        try {
          navigation.navigate('PreAuthSuccess', { tokenSymbol, txHash: json?.data?.txHash || '', blockNumber: json?.data?.blockNumber || '', timestamp: json?.data?.timestamp || '', referenceNumber: json?.data?.referenceNumber || '' });
        } catch {}
        setPreAuthMap((prev) => ({ ...(prev || {}), [tokenSymbol]: true }));
      } else {
        Alert.alert('失败', json?.statusMsg || '预授权失败');
      }
    } catch (e: any) {
      Alert.alert('错误', e?.message || '网络请求失败');
    } finally {
      setApplyingSymbol(null);
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

  useEffect(() => {
    const symbols = cards
      .filter((c: any) => c?.type === 'stable')
      .flatMap((c: any) => (Array.isArray(c?.coins) ? c.coins.map((x: any) => String(x?.symbol || '')) : []));
    const unique = Array.from(new Set(symbols)).filter((s) => !!s);
    if (unique.length === 0) return;
    (async () => {
      try {
        const entries = await Promise.all(
          unique.map(async (s) => {
            const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/checkPreAuth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                primaryAccountNumber: '625807******4153',
                tokenSymbol: s,
                userId: '03572638',
              }),
            });
            const json = await res.json();
            const approved = json?.statusCode === '00' && json?.data?.approved === true;
            return [s, approved] as [string, boolean];
          })
        );
        setPreAuthMap((prev) => ({ ...(prev || {}), ...Object.fromEntries(entries) }));
      } catch {}
    })();
  }, [cards]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header} />
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('bank')}>
          <Text style={[styles.tabText, activeTab === 'bank' && styles.tabActiveText]}>法币账户({cards.filter((c: any) => c?.type === 'bank').length})</Text>
          {activeTab === 'bank' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('stable')}>
          <Text style={[styles.tabText, activeTab === 'stable' && styles.tabActiveText]}>稳定币账户({cards.filter((c: any) => c?.type === 'stable').length})</Text>
          {activeTab === 'stable' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>
      {loading && <Text style={styles.loading}>正在加载卡列表…</Text>}
      {!!error && <Text style={styles.error}>错误：{error}</Text>}
      <FlatList
        data={cards.filter((c: any) => c?.type === activeTab)}
        keyExtractor={(item, idx) => String((item as any).id ?? idx)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading && !error ? (
          <View style={styles.empty}><Text style={styles.emptyText}>{activeTab === 'bank' ? '暂无法币账户' : '暂无稳定币账户'}</Text></View>
        ) : null}
        renderItem={({ item }) => (
          (item as any).type === 'stable' ? (() => {
            const coins = Array.isArray((item as any).coins) ? ((item as any).coins as { symbol: string; balance: string }[]) : [];
            const total = coins.reduce((sum, c) => sum + toNumber(c.balance), 0);
            const preferredSymbol = coins.find((c) => String(c.symbol || '').toUpperCase() === 'USDC')?.symbol || coins[0]?.symbol || '';
            const busy = revokingSymbol === preferredSymbol || applyingSymbol === preferredSymbol;
            const approved = !!preferredSymbol && preAuthMap?.[preferredSymbol] === true;

            return (
              <View style={[styles.cardRow, styles.rowStable, styles.stableCardRow]}>
                <View style={styles.stableLeft}>
                  <Image source={require('../tabs/usdc.png')} style={styles.stableAvatar} resizeMode="contain" />
                </View>
                <View style={styles.stableMid}>
                  <View style={styles.stableTopRow}>
                    <Text style={styles.stableAddress}>{maskAddress(String((item as any).address || ''))}</Text>
                  </View>
                  <View style={styles.stableAssetRow}>
                    <Text style={styles.stableAssetLabel}>总资产</Text>
                    <Text style={styles.stableAssetValue}>{total.toFixed(2)}</Text>
                  </View>
                  {coins.length > 0 && (
                    <View style={styles.stableCoinList}>
                      {coins.map((c, idx) => {
                        const sym = String(c.symbol || '');
                        const iconText = sym ? sym[0].toUpperCase() : '◎';
                        const bg = sym.toUpperCase() === 'USDC' ? '#2F6BFF' : sym.toUpperCase() === 'USDT' ? '#12A066' : '#666';
                        return (
                          <View key={`${sym}-${idx}`} style={styles.stableCoinRow}>
                            <View style={[styles.stableCoinIcon, { backgroundColor: bg }]}>
                              <Text style={styles.stableCoinIconText}>{iconText}</Text>
                            </View>
                            <Text style={styles.stableCoinSymbol}>{sym}</Text>
                            <Text style={styles.stableCoinBalance}>{String(c.balance ?? '')}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
                <View style={styles.stableRight}>
                  <TouchableOpacity
                    style={styles.stableActionBtn}
                    onPress={() => navigation.navigate('OrderList', { userId: '03572638', tokenSymbol: '' })}
                  >
                    <Text style={styles.stableActionText}>详情</Text>
                  </TouchableOpacity>
                  {!!preferredSymbol && (
                    <TouchableOpacity
                      style={[styles.stableActionBtn, busy && { opacity: 0.6 }]}
                      disabled={busy}
                      onPress={() => {
                        if (approved) {
                          revokePreAuth(preferredSymbol);
                        } else {
                          applyPreAuth(preferredSymbol);
                        }
                      }}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#666" />
                      ) : (
                        <Text style={styles.stableActionText}>{approved ? '撤销预授权' : '开通预授权'}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })() : (
            <View style={[styles.cardRow, styles.rowBank, styles.bankCardRow]}>
              {(() => {
                const name = String((item as any).name || '');
                const src = name.includes('招商')
                  ? require('../tabs/招商银行.png')
                  : name.includes('上海')
                    ? require('../tabs/上海银行.png')
                    : require('../tabs/card-unselected.png');
                return (
                  <Image source={src} style={styles.cardImage} resizeMode="contain" />
                );
              })()}
              <View style={styles.bankMid}>
                <Text style={styles.cardName}>{(item as any).name} [{maskToken((item as any).token)}]</Text>
                <Text style={styles.bankBalance}>
                  {(() => {
                    const coins = Array.isArray((item as any).coins) ? ((item as any).coins as { symbol: string; balance: string }[]) : [];
                    const total = coins.reduce((sum, c) => sum + toNumber(c.balance), 0);
                    return total.toFixed(2);
                  })()}
                </Text>
              </View>
              <View style={styles.bankRight}>
                <TouchableOpacity
                  style={styles.bankActionBtn}
                  onPress={() => {
                    Alert.alert('提示', '转账功能开发中');
                  }}
                >
                  <Text style={styles.bankActionText}>转账</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bankActionBtn}
                  onPress={() => navigation.navigate('OrderList', { userId: '03572638', tokenSymbol: '' })}
                >
                  <Text style={styles.bankActionText}>账单</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  title: { fontSize: 16, fontWeight: '600' },
  list: { padding: 16 },
  loading: { paddingHorizontal: 16, paddingTop: 8, color: '#666', fontSize: 12 },
  error: { paddingHorizontal: 16, paddingTop: 8, color: 'red', fontSize: 12 },
  empty: { paddingHorizontal: 16, paddingTop: 20 },
  emptyText: { color: '#999', fontSize: 13 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 24 },
  tabItem: { alignItems: 'center' },
  tabText: { fontSize: 15, color: '#666' },
  tabActiveText: { color: 'red', fontWeight: '600' },
  tabUnderline: { marginTop: 6, height: 3, width: 80, backgroundColor: 'red', borderRadius: 3 },
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
  bankCardRow: { alignItems: 'stretch', paddingVertical: 16 },
  bankMid: { flex: 1, justifyContent: 'center' },
  bankBalance: { marginTop: 10, fontSize: 26, color: '#111', fontWeight: '800' },
  bankRight: { width: 90, justifyContent: 'center', gap: 10 },
  bankActionBtn: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6E8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankActionText: { fontSize: 14, color: '#333', fontWeight: '500' },
  stableCardRow: { alignItems: 'stretch', paddingVertical: 16 },
  stableLeft: { marginRight: 12, justifyContent: 'center' },
  stableAvatar: { width: 44, height: 64, borderRadius: 14 },
  stableMid: { flex: 1, paddingRight: 8 },
  stableTopRow: { flexDirection: 'row', alignItems: 'center' },
  stableAddress: { fontSize: 14, color: '#8A8F9B', fontWeight: '500' },
  stableAssetRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
  stableAssetLabel: { fontSize: 14, color: '#333', marginRight: 10 },
  stableAssetValue: { fontSize: 22, color: '#111', fontWeight: '700' },
  stableCoinList: { marginTop: 10, gap: 8 },
  stableCoinRow: { flexDirection: 'row', alignItems: 'center' },
  stableCoinIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  stableCoinIconText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stableCoinSymbol: { fontSize: 14, color: '#333', fontWeight: '600', marginRight: 5 },
  stableCoinBalance: { fontSize: 14, color: '#333' },
  stableRight: { width: 84, justifyContent: 'center', gap: 8 },
  stableActionBtn: {
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6E8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stableActionText: { fontSize: 14, color: '#333', fontWeight: '500' },
});

export default CardManageScreen;

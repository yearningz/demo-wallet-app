import React from 'react';
import { SafeAreaView, View, FlatList,Text, StyleSheet, TouchableOpacity } from 'react-native';

import { QrScanScreenProps } from '../navigation/types';

type Props = { navigation: QrScanScreenProps['navigation'] };
const mockNews = [
  { title: '以太坊 Dencun 升级推进', source: 'Ethereum', time: '2 小时前' },
  { title: 'SEC 批准多支以太坊 ETF', source: 'SEC', time: '昨天' },
  { title: '链上稳定币增发创近高', source: 'Glassnode', time: '3 天前' },
  { title: 'Solana 生态 DEX 交易量增长', source: 'DefiLlama', time: '本周' },
];
const HomeScreen = ({ navigation }: Props) => {
  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            
            </View>
              <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('QrScan')}>
                  <View style={styles.actionIcon}><Text style={styles.iconText}>○</Text></View>
                  <Text style={styles.actionLabel}>扫一扫</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('SelectToken')}>
                  <View style={styles.actionIcon}><Text style={styles.iconText}>⬇</Text></View>
                  <Text style={styles.actionLabel}>发送</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action}>
                  <View style={styles.actionIcon}><Text style={styles.iconText}>⬆︎</Text></View>
                  <Text style={styles.actionLabel}>接收</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action}>
                  <View style={styles.actionIcon}><Text style={styles.iconText}>⌛</Text></View>
                  <Text style={styles.actionLabel}>历史记录</Text>
                </TouchableOpacity>
              </View>
        
              <View style={styles.tabsRow}>
                <Text style={[styles.tab, styles.tabActive]}>Web3 资讯</Text>
                <Text style={styles.tab}>热点</Text>
                <Text style={styles.tab}>分析</Text>
              </View>

              <FlatList
                data={mockNews}
                keyExtractor={(item, idx) => `${item.title}-${idx}`}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <View style={styles.newsRow}>
                    <View style={styles.newsLeft}>
                      <View style={styles.newsIcon}><Text style={styles.iconTextSmall}>📰</Text></View>
                      <View>
                        <Text style={styles.newsTitle}>{item.title}</Text>
                        <Text style={styles.newsMeta}>{item.source} · {item.time}</Text>
                      </View>
                    </View>
                    <View style={styles.tokenRight}>
                      <Text style={styles.more}>›</Text>
                    </View>
                  </View>
                )}
              />
    </SafeAreaView>
    
  );
};

const red = '#b71c1c';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  city: { color: '#fff', fontSize: 14 },
  search: { color: '#fff', fontSize: 14 },
  hero: { height: 140, backgroundColor: red, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 18, color: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  bigBtn: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#f44336', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8 },
  bigBtnText: { fontSize: 28, color: '#fff', fontWeight: '600' },

  menu: { fontSize: 20, color: '#222' },
  title: { fontSize: 18, fontWeight: '600', color: '#222' },
  profile: { fontSize: 18 },
  address: { paddingHorizontal: 16, paddingTop: 6, fontSize: 16, letterSpacing: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  action: { alignItems: 'center' },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: red,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconText: { color: red, fontSize: 20, fontWeight: '600' },
  actionLabel: { fontSize: 12, color: '#333' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  tab: { fontSize: 13, color: '#777', paddingVertical: 6 },
  tabActive: { color: red, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  tokenLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTextSmall: { color: '#999', fontSize: 14 },
  tokenSymbol: { fontSize: 14, color: '#222', fontWeight: '600' },
  tokenPrice: { fontSize: 12, color: '#888' },
  tokenRight: { alignItems: 'flex-end' },
  mask: { fontSize: 12, color: '#333' },
  change: { fontSize: 12, marginTop: 4 },
  up: { color: '#2e7d32' },
  down: { color: red },
  newsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  newsLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  newsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsTitle: { fontSize: 14, color: '#222', fontWeight: '600' },
  newsMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  more: { fontSize: 20, color: '#bbb' },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomItem: { color: '#666' },
  bottomActive: { color: red, fontWeight: '600' },
});

export default HomeScreen;

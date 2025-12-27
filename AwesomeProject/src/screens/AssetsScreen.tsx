import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';

import { AssetsScreenProps } from '../navigation/types';

const mockTokens = [
  { symbol: 'BNB', price: '$586.16', change: '-0.18%' },
  { symbol: 'METIS', price: '$13.7', change: '+0.46%' },
  { symbol: 'USDT', price: '$0.99985', change: '+0.01%' },
  { symbol: 'CRVUSD', price: '$0.99985', change: '+0.04%' },
  { symbol: 'Cake', price: '$1.84', change: '-3.33%' },
  { symbol: 'ETH', price: '$1,633.02', change: '+0.51%' },
  { symbol: 'POL', price: '$0.18306', change: '-0.51%' },
];

const AssetsScreen = ({ navigation }: AssetsScreenProps) => {
  return (
    <SafeAreaView style={styles.container}>
  

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('SelectToken')}>
          <View style={styles.actionIcon}><Text style={styles.iconText}>⬇︎</Text></View>
          <Text style={styles.actionLabel}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <View style={styles.actionIcon}><Text style={styles.iconText}>⬆︎</Text></View>
          <Text style={styles.actionLabel}>Receive</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <View style={styles.actionIcon}><Text style={styles.iconText}>⌛</Text></View>
          <Text style={styles.actionLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action}>
          <View style={styles.actionIcon}><Text style={styles.iconText}>✓</Text></View>
          <Text style={styles.actionLabel}>Approvals</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('TestHttps')}>
          <View style={styles.actionIcon}><Text style={styles.iconText}>🔒</Text></View>
          <Text style={styles.actionLabel}>Test HTTPS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        <Text style={[styles.tab, styles.tabActive]}>Tokens</Text>
        <Text style={styles.tab}>DeFi</Text>
        <Text style={styles.tab}>NFTs</Text>
      </View>

      <FlatList
        data={mockTokens}
        keyExtractor={(item) => item.symbol}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.tokenRow}>
            <View style={styles.tokenLeft}>
              <View style={styles.tokenIcon}><Text style={styles.iconTextSmall}>◎</Text></View>
              <View>
                <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                <Text style={styles.tokenPrice}>{item.price}</Text>
              </View>
            </View>
            <View style={styles.tokenRight}>
              <Text style={styles.mask}>******</Text>
              <Text style={[styles.change, item.change.startsWith('-') ? styles.down : styles.up]}>
                {item.change}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={styles.bottomNav}>
        <Text style={styles.bottomItem}>Home</Text>
        <Text style={styles.bottomItem}>Markets</Text>
        <Text style={styles.bottomItem}>Trade</Text>
        <Text style={styles.bottomItem}>Discover</Text>
        <Text style={[styles.bottomItem, styles.bottomActive]}>Assets</Text>
      </View>
    </SafeAreaView>
  );
};

const red = '#e53935';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
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

export default AssetsScreen;
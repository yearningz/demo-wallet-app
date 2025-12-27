import React from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';

import { AccountDetailsScreenProps } from '../navigation/types';

const AccountDetailsScreen = ({ navigation }: AccountDetailsScreenProps) => {
  const account = {
    balance: '1,234.56',
    transactions: [
      { id: '1', description: 'Starbucks', amount: '-$5.45' },
      { id: '2', description: 'Apple Store', amount: '-$999.00' },
      { id: '3', description: 'Salary', amount: '+$2,500.00' },
    ],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Details</Text>
      <Text style={styles.balance}>Balance: {account.balance}</Text>
      <Text style={styles.transactionsTitle}>Recent Transactions</Text>
      <FlatList
        data={account.transactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionItem}>
            <Text>{item.description}</Text>
            <Text>{item.amount}</Text>
          </View>
        )}
      />
      <Button
        title="Make a Payment"
        onPress={() => navigation.navigate('Payment')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  balance: {
    fontSize: 20,
    marginBottom: 20,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default AccountDetailsScreen;
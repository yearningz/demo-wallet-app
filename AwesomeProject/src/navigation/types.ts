import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  CreateAccount: undefined;
  AccountDetails: undefined;
  Payment: { tokenSymbol?: string; network?: string; to?: string; memo?: string; amount?: string | number; scanText?: string } | undefined;
  Assets: undefined;
  SelectToken: undefined;
  SelectNetwork: { tokenSymbol: string };
  ReceivingAddress: { tokenSymbol: string; network: string };
  InputAmount: { tokenSymbol: string; network: string; to: string; memo?: string };
  TestHttps: undefined;
  MainTabs: undefined;
  QrScan: undefined;
  ScanResult: { text: string };
  OrderList: { userId?: string, tokenSymbol?: string } | undefined;
  OrderDetails: { referenceNumber: string };
  TransactionDetails: {
    txn?: any;
    address: string;
    stable: string;
    network: string;
    productPrice: number;
    gasFee: string;
    totalPay: string;
  };
  PreAuthSuccess: { tokenSymbol?: string; txHash?: string; blockNumber?: string; timestamp?: string | number; referenceNumber?: string };
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type CreateAccountScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateAccount'>;
export type AccountDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'AccountDetails'>;
export type PaymentScreenProps = NativeStackScreenProps<RootStackParamList, 'Payment'>;
export type AssetsScreenProps = NativeStackScreenProps<RootStackParamList, 'Assets'>;
export type SelectTokenScreenProps = NativeStackScreenProps<RootStackParamList, 'SelectToken'>;
export type SelectNetworkScreenProps = NativeStackScreenProps<RootStackParamList, 'SelectNetwork'>;
export type ReceivingAddressScreenProps = NativeStackScreenProps<RootStackParamList, 'ReceivingAddress'>;
export type InputAmountScreenProps = NativeStackScreenProps<RootStackParamList, 'InputAmount'>;
export type TestHttpsScreenProps = NativeStackScreenProps<RootStackParamList, 'TestHttps'>;
export type QrScanScreenProps = NativeStackScreenProps<RootStackParamList, 'QrScan'>;
export type ScanResultScreenProps = NativeStackScreenProps<RootStackParamList, 'ScanResult'>;
export type OrderListScreenProps = NativeStackScreenProps<RootStackParamList, 'OrderList'>;
export type OrderDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'OrderDetails'>;
export type TransactionDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'TransactionDetails'>;
export type PreAuthSuccessScreenProps = NativeStackScreenProps<RootStackParamList, 'PreAuthSuccess'>;

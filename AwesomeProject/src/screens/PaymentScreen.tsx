import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  InteractionManager,
  Keyboard,
  ScrollView,
} from 'react-native';

import { PaymentScreenProps } from '../navigation/types';

const API_BASE_URL = 'http://172.20.10.6:8088/api/v1';

const PaymentScreen = ({ navigation, route }: PaymentScreenProps) => {
  const initialAmount = route?.params && (route.params as any).amount ? String((route.params as any).amount) : '';
  const amount = initialAmount;
  const [agreed, setAgreed] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectingCard, setSelectingCard] = useState(false);
  const [selectingToken, setSelectingToken] = useState(false);
  const [tokenOptions, setTokenOptions] = useState<string[]>([]);
  const [pendingCard, setPendingCard] = useState<any | null>(null);
  const [selectingTokenSymbol, setSelectingTokenSymbol] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [balanceInsufficientHint, setBalanceInsufficientHint] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [useMultiAccountPayment, setUseMultiAccountPayment] = useState(false);
  const [selectedPayCardIds, setSelectedPayCardIds] = useState<string[]>([]);
  const [balanceByKey, setBalanceByKey] = useState<Record<string, { value: number; raw: string; loading: boolean; error: string }>>({});
  const balanceCheckKeyRef = useRef<string>('');
  const [gasFee, setGasFee] = useState('');
  const [productPrice, setProductPrice] = useState<number>(0);
  const [totalPay, setTotalPay] = useState<string>('');
  const [txn, setTxn] = useState<any | null>(null);
  const [factor, setFactor] = useState<any | null>(null);
  const [factorLoading, setFactorLoading] = useState(false);
  const [factorError, setFactorError] = useState('');
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [preAuthInfo, setPreAuthInfo] = useState<any | null>(null);
  const [preAuthLoading, setPreAuthLoading] = useState(false);
  const [preAuthError, setPreAuthError] = useState('');
  const [preAuthSheetVisible, setPreAuthSheetVisible] = useState(false);
  const [preAuthSuccessVisible, setPreAuthSuccessVisible] = useState(false);
  const passwordInputRef = useRef<any>(null);
  const [lockSheets, setLockSheets] = useState(false);
  const to = (route?.params as any)?.to as string | undefined;
  const scanText = (route?.params as any)?.scanText as string | undefined;
  const [payPassword, setPayPassword] = useState('');
// 支付状态：idle | paying | success | timeout
  const [payStatus, setPayStatus] = useState<'idle' | 'loading' | 'success' | 'timeout'>('idle');

  const orderAmount = useMemo(() => {
    const v1 = Number(factor?.transactionAmount);
    if (Number.isFinite(v1) && v1 > 0) return v1;
    const v2 = Number(productPrice);
    if (Number.isFinite(v2) && v2 > 0) return v2;
    const v3 = Number(amount);
    if (Number.isFinite(v3) && v3 > 0) return v3;
    return 0;
  }, [factor?.transactionAmount, productPrice, amount]);

  const balanceKey = useCallback((cardId: string, tokenSymbol: string) => `${cardId}|${tokenSymbol}`, []);

  const resolveChainType = useCallback((card: any) => {
    const chainId = Number(card?.chainId ?? card?.raw?.card?.chainId ?? card?.raw?.chain?.chainId);
    if (chainId === 42161) return 'ARBITRUM';
    if (chainId === 1) return 'ETHEREUM';
    const chainName = String(card?.chainName ?? '');
    if (!chainName) return 'ETHEREUM';
    const upper = chainName.trim().toUpperCase().replace(/\s+/g, '_');
    if (upper.includes('ARBITRUM')) return 'ARBITRUM';
    if (upper.includes('ETH')) return 'ETHEREUM';
    return upper;
  }, []);

  const resolvePrimaryAccountNumber = useCallback(
    (idsOverride?: string[]) => {
      const ids = Array.isArray(idsOverride) ? idsOverride : [];
      const id =
        (ids.length > 0 ? String(ids[0]) : '') ||
        (selectedCardId ? String(selectedCardId) : '') ||
        (cards.length > 0 ? String(cards[0]?.id ?? '') : '');
      const card = cards.find((c) => String(c?.id) === String(id)) ?? cards[0];
      const cardToken = String(card?.cardToken ?? '');
      return cardToken;
    },
    [cards, selectedCardId]
  );

  const fetchBalance = useCallback(
    async (cardId: string, tokenSymbol: string) => {
      const key = balanceKey(cardId, tokenSymbol);
      const card = cards.find((c) => String(c?.id) === String(cardId));
      if (!card?.chainWalletAddress) {
        setBalanceByKey((prev) => ({
          ...prev,
          [key]: { value: 0, raw: '', loading: false, error: '缺少链上地址' },
        }));
        return 0;
      }
      try {
        setBalanceByKey((prev) => ({
          ...prev,
          [key]: { value: prev?.[key]?.value ?? 0, raw: prev?.[key]?.raw ?? '', loading: true, error: '' },
        }));
        const res = await fetch(`${API_BASE_URL}/payment/getBalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: String(card.chainWalletAddress),
            chainType: resolveChainType(card),
            tokenSymbol: String(tokenSymbol),
          }),
        });
        const json = await res.json();
        const raw = String(json?.balance ?? json?.data?.balance ?? '');
        const value = Number(raw);
        const normalizedValue = Number.isFinite(value) ? value : 0;
        setBalanceByKey((prev) => ({
          ...prev,
          [key]: { value: normalizedValue, raw, loading: false, error: '' },
        }));
        return normalizedValue;
      } catch (e: any) {
        setBalanceByKey((prev) => ({
          ...prev,
          [key]: { value: prev?.[key]?.value ?? 0, raw: prev?.[key]?.raw ?? '', loading: false, error: String(e?.message || e) },
        }));
        return 0;
      }
    },
    [balanceKey, cards, resolveChainType]
  );

  const ensureSufficientBalance = useCallback(async () => {
    if (!selectingTokenSymbol) return false;
    const base = Array.isArray(selectedPayCardIds) ? selectedPayCardIds : [];
    const ids = (base.length > 0 ? base : selectedCardId ? [selectedCardId] : []).filter(Boolean);
    if (ids.length === 0) return false;
    const vals = await Promise.all(ids.map((id) => fetchBalance(String(id), String(selectingTokenSymbol))));
    const total = vals.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
    if (orderAmount > 0 && total < orderAmount) {
      setSelectedPayCardIds(ids);
      setBalanceInsufficientHint(true);
      setMultiSelectMode(true);
      setUseMultiAccountPayment(false);
      setSelectingCard(true);
      return false;
    }
    setBalanceInsufficientHint(false);
    return true;
  }, [fetchBalance, orderAmount, selectedCardId, selectedPayCardIds, selectingTokenSymbol]);

  const buildTransferInfos = useCallback((idsOverride?: string[], amountOverride?: number) => {
    const base = Array.isArray(idsOverride) ? idsOverride : Array.isArray(selectedPayCardIds) ? selectedPayCardIds : [];
    const ids = base.filter(Boolean);
    if (ids.length <= 1) return [];
    if (!selectingTokenSymbol) return [];
    const targetAmount = Number(amountOverride ?? orderAmount);
    if (!targetAmount || !(targetAmount > 0)) return [];

    const formatAmount = (n: number) => {
      const s = Number.isFinite(n) ? n.toFixed(6) : '0.000000';
      return s.replace(/\.?0+$/, '');
    };

    let remaining = targetAmount;
    const byChain: Record<string, number> = {};
    for (const id of ids) {
      if (!(remaining > 0)) break;
      const card = cards.find((c) => String(c?.id) === String(id));
      if (!card) continue;
      const k = balanceKey(String(id), String(selectingTokenSymbol));
      const bal = balanceByKey[k]?.value ?? 0;
      const available = Number.isFinite(bal) ? bal : 0;
      const take = Math.max(0, Math.min(available, remaining));
      if (take <= 0) continue;
      const chainType = resolveChainType(card);
      byChain[chainType] = (byChain[chainType] ?? 0) + take;
      remaining -= take;
    }

    return Object.keys(byChain).map((chainType) => ({
      chainType,
      tokenSymbol: String(selectingTokenSymbol),
      amount: formatAmount(byChain[chainType]),
    }));
  }, [balanceByKey, balanceKey, cards, orderAmount, resolveChainType, selectedPayCardIds, selectingTokenSymbol]);

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
  const parseScanText = (s?: string) => {
    if (!s) return null;
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const jsonStr = s.slice(start, end + 1);
      try {
        const obj = JSON.parse(jsonStr);
        if (obj && typeof obj === 'object') return obj;
      } catch {}
    }
    return null;
  };

  const fetchAccountCardList = useCallback(async () => {
    try {
      setCardsLoading(true);
      setCardsError('');
      const res = await fetch(`http://172.20.10.6:8088/account/queryCardList`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardToken: null,
          chainId: null,
          chainWalletAddress: null,
          nationalIdNo: null,
          mobileNo: null,
          page: { no: 1, size: 20 },
        }),
      });
   
      const json = await res.json();
      const content = Array.isArray(json?.data?.content) ? json.data.content : [];
      const mapped = content.map((it: any, idx: number) => {
        const card = it?.card ?? {};
        const chain = it?.chain ?? {};
        const id = String(card?.id ?? card?.cardToken ?? idx);
        const name = String(card?.userName ?? '账户');
        const cardToken = String(card?.cardToken ?? '');
        const chainId = Number(card?.chainId ?? chain?.chainId ?? 0);
        const chainWalletAddress = String(card?.chainWalletAddress ?? '');
        const tokens = Array.isArray(chain?.tokens) ? chain.tokens.map((t: any) => String(t)) : [];
        const chainName = String(chain?.chainName ?? '');
        return { id, name, cardToken, chainId, chainWalletAddress, tokens, chainName, raw: it };
      });
      setCards(mapped);
      if (mapped.length > 0) {
        const firstId = mapped[0].id;
        setSelectedCardId((prev) => {
          if (prev) return prev;
          return firstId;
        });
        setSelectedPayCardIds((prev) => (prev.length > 0 ? prev : [firstId]));
      }
    } catch (e: any) {
      setCardsError(String(e?.message || e));
    } finally {
      setCardsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountCardList();
  }, [fetchAccountCardList]);

  useEffect(() => {
    if (selectingCard) {
      fetchAccountCardList();
    }
  }, [selectingCard, fetchAccountCardList]);

  useEffect(() => {
    if (!scanText) return;
    if (cards.length === 0) return;

    const firstCard = cards[0];
    const firstCardId = String((firstCard as any)?.id ?? '');
    const firstToken = Array.isArray((firstCard as any)?.tokens) ? String((firstCard as any).tokens[0] ?? '') : '';

    setSelectedCardId((prev) => prev || firstCardId);
    setSelectingTokenSymbol((prev) => prev || firstToken);
    setSelectedPayCardIds((prev) => (prev.length > 0 ? prev : [firstCardId]));
    setUseMultiAccountPayment(false);
  }, [scanText, cards]);

  useEffect(() => {
    if (!scanText) return;
    if (!selectedCardId || !selectingTokenSymbol) return;
    if (!orderAmount || !(orderAmount > 0)) return;
    const base = Array.isArray(selectedPayCardIds) ? selectedPayCardIds : [];
    const ids = (base.length > 0 ? base : [selectedCardId]).filter(Boolean);
    const k = `${ids.join(',')}|${selectingTokenSymbol}|${String(orderAmount)}`;
    if (balanceCheckKeyRef.current === k) return;
    balanceCheckKeyRef.current = k;
    (async () => {
      const vals = await Promise.all(ids.map((id) => fetchBalance(String(id), String(selectingTokenSymbol))));
      const total = vals.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
      setBalanceInsufficientHint(total < orderAmount);
    })();
  }, [fetchBalance, orderAmount, scanText, selectedCardId, selectedPayCardIds, selectingTokenSymbol]);

  useEffect(() => {
    if (!selectingTokenSymbol) return;
    if (!orderAmount || !(orderAmount > 0)) return;
    const base = Array.isArray(selectedPayCardIds) ? selectedPayCardIds : [];
    if (base.length === 0) return;
    const ids = base.filter(Boolean);
    (async () => {
      const vals = await Promise.all(ids.map((id) => fetchBalance(String(id), String(selectingTokenSymbol))));
      const total = vals.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
      setBalanceInsufficientHint(total < orderAmount);
    })();
  }, [fetchBalance, orderAmount, selectedPayCardIds, selectingTokenSymbol]);

  useEffect(() => {
    const obj = parseScanText(scanText);
    if (obj && typeof obj === 'object') {
      setFactor((prev: any) => ({
        ...(prev || {}),
        merchantId: obj.merchantId ?? (prev || {}).merchantId,
        terminalId: obj.terminalId ?? (prev || {}).terminalId,
        referenceNumber: obj.referenceNumber ?? (prev || {}).referenceNumber,
        transactionAmount: obj.transactionAmount != null ? Number(obj.transactionAmount) : (prev || {}).transactionAmount,
        transactionType: obj.transactionType ?? (prev || {}).transactionType,
      }));
      //1.4不从交易要素获取商品价格
      const amt = obj.transactionAmount != null ? Number(obj.transactionAmount) : 0;
      setProductPrice(amt.toFixed(4) as unknown as number);
      // 预授权检查移至“确认付款”点击后执行
      // const total = (amt + Number(gasFee || 0)).toFixed(4);
      //     const total =
      // Number.isFinite(Number(amt))
      //   ? (Number(amt) + Number(gasFee || 0)).toFixed(4)
      //   : '0.0000';
      //     setTotalPay(total ? String(total) : '');
    }
  }, [scanText]);

  useEffect(() => {
    const price = Number(productPrice);
    const gas = Number(gasFee);

    if (!Number.isFinite(price) || !Number.isFinite(gas)) {
      setTotalPay('计算中…');
      return;
    }

    setTotalPay((price + gas).toFixed(4));
  }, [productPrice, gasFee]);


  const fetchTransFactor = useCallback(async () => {
    try {
      const primaryAccountNumber = resolvePrimaryAccountNumber();
      if (!primaryAccountNumber) {
        setFactor(null);
        return;
      }
      setFactorLoading(true);
      setFactorError('');
      const res = await fetch(`http://172.20.10.6:8088/api/v1/posTransaction/queryTransFactor?primaryAccountNumber=${encodeURIComponent(primaryAccountNumber)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      const list: any[] = Array.isArray(json?.data) ? json.data : [];
      if (list.length === 0) {
        // 防御：接口正常但无数据
        setFactor(null);
        return;
      }
      const first = list[0];
      setFactor((prev: any) => ({
        ...(prev || {}),
        ...first,
      }));
    } catch (e: any) {
      setFactorError(String(e?.message || e));
    } finally {
      setFactorLoading(false);
    }
  }, [resolvePrimaryAccountNumber]);

  const fetchGasCost = useCallback(async () => {
  try {
    setGasFee('计算中…');
    const res = await fetch(
      'http://172.20.10.6:8088/api/v1/posTransaction/queryGasCost',
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const json = await res.json();

      const gas = json?.data != null ? Number(json.data) : 0;
      setGasFee(String(gas));

    } catch (e) {
      console.warn('fetchGasCost error', e);
      setGasFee('');
    }
  }, []);

  useEffect(() => {
    if (showPasswordScreen) {
      fetchGasCost();
    }
  }, [showPasswordScreen, fetchGasCost]);

  useEffect(() => {
    if (showPasswordScreen) {
      setPayPassword('');
      const task = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          passwordInputRef.current?.focus?.();
        });
      });
      return () => {
        task.cancel();
      };
    }
  }, [showPasswordScreen]);
  useEffect(() => {
    if (showPasswordScreen) {
      passwordInputRef.current?.focus?.();
    }
  }, [showPasswordScreen]);

  useEffect(() => {
    fetchTransFactor();
  }, [fetchTransFactor]);

  return (
    <View style={styles.overlay}>
      {!lockSheets && !showPasswordScreen && !selectingCard && !preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helpBtn}>
              <Text style={styles.helpText}>?</Text>
            </TouchableOpacity>
          </View>

          {factorLoading && <Text style={styles.sectionDesc}>正在获取交易要素…</Text>}
          {!!factorError && <Text style={styles.sectionDesc}>错误：{factorError}</Text>}
          {cardsLoading && <Text style={styles.sectionDesc}>正在获取账户列表…</Text>}
          {!!cardsError && <Text style={styles.sectionDesc}>错误：{cardsError}</Text>}
          {!!preAuthError && <Text style={styles.sectionDesc}>错误：{preAuthError}</Text>}

          {/* <View style={styles.amountBlock}>
          <Text style={styles.currency}>$</Text>
               <Text style={styles.amount}>{factor?.transactionAmount != null ? `${String(factor?.transactionAmount)}`  : ''}</Text>
        </View> */}

          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商户号</Text><Text style={styles.sectionValue}>{factor?.merchantId ?? '-'}</Text></View>
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>终端号</Text><Text style={styles.sectionValue}>{factor?.terminalId ?? '-'}</Text></View>
            {/* <View style={styles.sectionRow}><Text style={styles.sectionTitle}>交易金额</Text><Text style={styles.sectionValue}>{factor?.transactionAmount != null ? `$${String(factor?.transactionAmount)}` : '-'}</Text></View> */}
            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>订单号</Text><Text style={styles.sectionValue}>{factor?.referenceNumber ?? '-'}</Text></View>
            {factor?.transactionType !== '预授权' ? (
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商品价格</Text><Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text></View>
            ) :   <View style={styles.sectionRow}><Text style={styles.sectionTitle}>授权金额</Text><Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text></View>}
          
            {factor?.transactionType === '预授权' && (
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>订单类型</Text><Text style={styles.sectionValue}>预授权</Text></View>
            )}

          </View>

          {/* 账户安全地址 */}
          {/* <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>链上账户地址</Text>
          <View style={styles.addrRight}>
            <Text style={styles.sectionValue}>{maskAddress(factor?.blockchainAddress ?? '')}</Text>
            <View style={styles.safeBadge}><Text style={styles.safeText}>✓</Text></View>
          </View>
        </View> */}

          {/* 稳定币选择 */}
          {/* <Pressable style={styles.sectionRow} onPress={() => setStableOpen((v) => !v)}>
          <Text style={styles.sectionTitle}>稳定币</Text>
          <Text style={styles.sectionValue}>{selectedStable} ▾</Text>
        </Pressable>
        {stableOpen && (
          <View style={styles.dropdown}>
            {stableOptions.map((c) => (
              <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setSelectedStable(c); setStableOpen(false); }}>
                <Text style={[styles.dropdownText, selectedStable === c && styles.dropdownTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )} */}

          {/* 商品价格与费用 */}
          {/* <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>商品价格</Text>
          <Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text>
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Gas费</Text>
          <View style={styles.gasRight}>
            <Text style={styles.sectionValue}>{gasFee ? `$${gasFee}` : ''}</Text>
          </View>
        </View>
        <Text style={styles.tipText}>费用根据以网络拥堵情况计算，最终扣费以实际打包成交价为准。</Text>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>实际支付</Text>
          <Text style={styles.sectionValue}>{totalPay ? `$${totalPay}` : ''}</Text>
        </View>*/}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>网络类型</Text>
          <Text style={styles.sectionValue}>以太网</Text>
        </View>

          <TouchableOpacity
            style={styles.sectionRow}
            onPress={() => {
              setMultiSelectMode(balanceInsufficientHint);
              setSelectingCard(true);
            }}
          >
            <Text style={styles.sectionTitle}>支付方式</Text>
            <View style={styles.payMethodRight}>
              <Text
                style={styles.payMethodText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {(() => {
                  const n = Array.isArray(selectedPayCardIds) && selectedPayCardIds.length > 0 ? selectedPayCardIds.length : selectedCardId ? 1 : 0;
                  if (n > 1) return `已选${n}个账户`;
                  const c = cards.find((x) => x.id === selectedCardId);
                  return `${c?.name ?? '账户'} [${String(c?.cardToken ?? '')}]`;
                })()}
              </Text>
            </View>
          </TouchableOpacity>

          {balanceInsufficientHint && (
            <Text style={[styles.sectionDesc, { marginTop: 8 }]}>余额不足，点击“支付方式”可多选账户</Text>
          )}

          {(selectingTokenSymbol) && (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>币种</Text>
              <Text style={styles.sectionValue}>{selectingTokenSymbol ?? '-'} </Text>
            </View>
          )}

          {to && (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>接收地址</Text>
              <Text style={styles.sectionValue}>{to}</Text>
            </View>
          )}

          {/* {memo && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Memo</Text>
            <Text style={styles.sectionValue}>{memo}</Text>
          </View>
        )} */}

          <View style={styles.agreeRow}>
            <Pressable
              onPress={() => setAgreed((v) => !v)}
              style={[styles.checkbox, agreed && styles.checkboxChecked]}
            >
              {agreed ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </Pressable>
            <Text style={styles.agreeText}>我已阅读并同意相关协议</Text>
          </View>

          <TouchableOpacity
            disabled={!agreed}
            onPress={() => {
              (async () => {
                if (!selectingTokenSymbol) {
                  Alert.alert('提示', '请选择币种');
                  setSelectingCard(true);
                  return;
                }
                const ok = await ensureSufficientBalance();
                if (!ok) return;
              // setSuccessVisible(true);
              // setTxnLoading(true);
              // setTxnError('');
              // (async () => {
              //   let ac: AbortController | undefined;
              //   let tid: any;
              //   try {
              //     ac = new AbortController();
              //     tid = setTimeout(() => ac?.abort(), 30000);
              //     const res = await fetch('http://172.20.10.6:8088/api/v1/posTransaction/QRcodeConsumeActiveScan', {
              //       method: 'POST',
              //       headers: { 'Content-Type': 'application/json' },
              //       body: JSON.stringify({
              //         primaryAccountNumber: '6258071001604153',
              //         transactionAmount: String(factor?.transactionAmount ?? amount ?? ''),
              //         terminalId: String(factor?.terminalId ?? ''),
              //         merchantId: String(factor?.merchantId ?? ''),
              //         referenceNumber: String(factor?.referenceNumber ?? ''),
              //       }),
              //       signal: ac.signal,
              //     });
              //     const json = await res.json();
              //     console.warn('json', json);
              //     const d = json?.data ?? {};
              //     const mapped = {
              //       txHash: String(d?.txHash ?? ''),
              //       status: String(d?.status ?? ''),
              //       blockNumber: String(d?.blockNumber ?? ''),
              //       timestamp: String(d?.timestamp ?? ''),
              //       fromAddress: String(d?.fromAddress ?? ''),
              //       toAddress: String(d?.toAddress ?? ''),
              //       gasUsed: String(d?.gasUsed ?? ''),
              //       gasPrice: String(d?.gasPrice ?? ''),
              //       gasCost: String(d?.gasCost ?? ''),
              //       inputData: String(d?.inputData ?? ''),
              //       functionName: String(d?.functionName ?? ''),
              //       events: Array.isArray(d?.events) ? d.events : [],
              //       tokenTransfers: Array.isArray(d?.tokenTransfers) ? d.tokenTransfers : [],
              //       merchantId: String(d?.merchantId ?? ''),
              //       terminalId: String(d?.terminalId ?? ''),
              //       referenceNumber: String(d?.referenceNumber ?? ''),
              //       transactionAmount: String(d?.transactionAmount ?? ''),
              //       statusCode: String(json?.statusCode ?? ''),
              //       msg: String(json?.msg ?? ''),
              //       totalPay: String((Number(d?.transactionAmount ?? 0) + Number(d?.gasCost ?? 0))),
              //     } as any;
              //     setTxn(mapped);
              //   } catch (e: any) {
              //     setTxnError(String(e?.message || e));
              //   } finally {
              //     if (tid) clearTimeout(tid);
              //     setTxnLoading(false);
              //   }
              // })();
              const isPreAuth = String(factor?.transactionType) === '预授权';
              if (!isPreAuth) {
                setShowPasswordScreen(true);
                return;
              }
              (async () => {
                try {
                  setPreAuthLoading(true);
                  setPreAuthError('');
                  const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/checkPreAuth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      primaryAccountNumber: resolvePrimaryAccountNumber(),
                      tokenSymbol: selectingTokenSymbol || '',
                      userId: '03572638',
                    }),
                  });
                  const json = await res.json();
                  setPreAuthInfo(json?.data ?? null);
                  if (json?.statusCode === '00' && json?.data?.approved === true) {
                    setShowPasswordScreen(true);
                  } else {
                    setPreAuthSheetVisible(true);
                  }
                } catch (e: any) {
                  setPreAuthError(String(e?.message || e));
                } finally {
                  setPreAuthLoading(false);
                }
              })();
              })();
            }}
            style={[styles.payBtn, !agreed && styles.payBtnDisabled]}
          >
            <Text style={styles.payBtnText}>{String(factor?.transactionType) === '预授权' ? '确认授权' : '确认付款'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {!lockSheets && selectingCard && !selectingToken && !preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectingCard(false);
                setMultiSelectMode(false);
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{multiSelectMode ? '选择付款方式（可多选）' : '选择付款方式'}</Text>
          </View>

          <ScrollView style={styles.cardListLimited} contentContainerStyle={styles.cardListContent} showsVerticalScrollIndicator>
            {cardsLoading && (
              <View style={styles.stretchMarginTop8}>
                <ActivityIndicator />
              </View>
            )}
            {!!cardsError && <Text style={styles.sectionDesc}>错误：{cardsError}</Text>}
            {(multiSelectMode && selectingTokenSymbol ? cards.filter((c) => Array.isArray((c as any).tokens) && (c as any).tokens.includes(selectingTokenSymbol)) : cards).map((c) => {
              const id = String((c as any).id);
              const checked = Array.isArray(selectedPayCardIds) && selectedPayCardIds.includes(id);
              const k = balanceKey(id, String(selectingTokenSymbol));
              const b = balanceByKey[k];
              const rightText = !selectingTokenSymbol
                ? ''
                : b?.loading
                  ? '查询中…'
                  : b?.error
                    ? '查询失败'
                    : b?.raw
                      ? String(b.raw)
                      : '';
              return (
                <TouchableOpacity
                  key={id}
                  style={styles.cardItem}
                  onPress={() => {
                    if (multiSelectMode && selectingTokenSymbol) {
                      setSelectedPayCardIds((prev) => {
                        const base = Array.isArray(prev) ? prev : [];
                        const has = base.includes(id);
                        const next = has ? base.filter((x) => x !== id) : [...base, id];
                        if (!has) {
                          fetchBalance(id, String(selectingTokenSymbol));
                        }
                        return next;
                      });
                      setSelectedCardId((prev) => prev || id);
                      return;
                    }
                    setPendingCard(c);
                    setTokenOptions(Array.isArray((c as any).tokens) ? (c as any).tokens : []);
                    setSelectingToken(true);
                  }}
                >
                  {multiSelectMode && selectingTokenSymbol ? (
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked ? <Text style={styles.checkboxTick}>✓</Text> : null}
                    </View>
                  ) : (
                    <View style={styles.cardThumb} />
                  )}
                  <View style={[styles.cardMiddle, multiSelectMode && selectingTokenSymbol ? { marginLeft: 12 } : null]}>
                    <Text style={styles.cardName}>{String((c as any).name)} [{String((c as any).cardToken ?? '')}]</Text>
                    <Text style={styles.cardBalance}>{String((c as any).chainWalletAddress ?? '')}</Text>
                  </View>
                  {multiSelectMode && selectingTokenSymbol ? (
                    <View style={{ width: 96, alignItems: 'flex-end' }}>
                      <Text style={styles.cardBalance}>{rightText || '-'}</Text>
                    </View>
                  ) : selectedCardId === c.id ? (
                    <Text style={styles.selectedBadge}>✓</Text>
                  ) : (
                    <View style={styles.unselectedDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {multiSelectMode && selectingTokenSymbol && (
            <TouchableOpacity
              style={[styles.payBtn, (!Array.isArray(selectedPayCardIds) || selectedPayCardIds.length === 0) && styles.payBtnDisabled]}
              disabled={!Array.isArray(selectedPayCardIds) || selectedPayCardIds.length === 0}
              onPress={() => {
                const first = Array.isArray(selectedPayCardIds) ? selectedPayCardIds[0] : '';
                if (first) setSelectedCardId(String(first));
                setUseMultiAccountPayment(Array.isArray(selectedPayCardIds) && selectedPayCardIds.length > 1);
                setSelectingCard(false);
                setMultiSelectMode(false);
              }}
            >
              <Text style={styles.payBtnText}>确定</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {!lockSheets && selectingCard && selectingToken && !preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                setSelectingToken(false);
                setPendingCard(null);
                setTokenOptions([]);
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>选择币种</Text>
          </View>

          <View style={styles.cardList}>
            {tokenOptions.length === 0 ? (
              <Text style={styles.sectionDesc}>暂无可选币种</Text>
            ) : (
              tokenOptions.map((sym) => (
                <TouchableOpacity
                  key={sym}
                  style={styles.cardItem}
                  onPress={() => {
                    if (pendingCard) {
                      const id = String((pendingCard as any).id);
                      setSelectedCardId(id);
                      setSelectedPayCardIds([id]);
                    }
                    setSelectingTokenSymbol(String(sym));
                    setUseMultiAccountPayment(false);
                    setSelectingToken(false);
                    setPendingCard(null);
                    setTokenOptions([]);
                    setSelectingCard(false);
                  }}
                >
                  <View style={styles.cardThumb} />
                  <View style={styles.cardMiddle}>
                    <Text style={styles.cardName}>{sym}</Text>
                  </View>
                  {selectingTokenSymbol === sym ? (
                    <Text style={styles.selectedBadge}>✓</Text>
                  ) : (
                    <View style={styles.unselectedDot} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}
      {preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { setPreAuthSheetVisible(false); setLockSheets(true); navigation.goBack(); }} style={styles.closeBtn}>
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>预授权</Text>
          </View>
          {!!preAuthError && <Text style={styles.sectionDesc}>错误：{preAuthError}</Text>}
          <View style={styles.stretchMarginTop8}>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>付款人地址</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.payerAddress ?? '-'}</Text>
            </View>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>代币</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.tokenSymbol ?? '-'}</Text>
            </View>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>代币合约地址</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.tokenAddress ?? '-'}</Text>       
            </View>
            <View style={[styles.sectionRow, styles.sectionRowWrap]}>
              <Text style={styles.sectionTitle}>Permit2合约地址</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.permit2Address ?? '-'}</Text>
            </View>
          </View>
          <TouchableOpacity
            disabled={preAuthLoading}
            style={[styles.payBtn, preAuthLoading && styles.payBtnLoading]}
            onPress={() => {
              (async () => {
                try {
                  setPreAuthLoading(true);
                  const res = await fetch('http://172.20.10.6:8088/api/v1/preAuth/applyPreAuth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      primaryAccountNumber: resolvePrimaryAccountNumber(),
                      tokenSymbol: selectingTokenSymbol || preAuthInfo?.tokenSymbol || '',
                      userId: '03572638',
                    }),
                  });
                  const json = await res.json();
                  if (json?.statusCode === '00') {
                    setPreAuthInfo((prev: any) => ({ ...(prev || {}), ...(json?.data || {}), approved: true }));
                    setPreAuthSheetVisible(false);
                    setPreAuthSuccessVisible(true);
                  } else {
                    Alert.alert('失败', json?.statusMsg || '授权失败');
                  }
                } catch (e: any) {
                  Alert.alert('错误', e?.message || '网络请求失败');
                } finally {
                  setPreAuthLoading(false);
                }
              })();
            }}
          >
            {preAuthLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>确定授权</Text>}
          </TouchableOpacity>
        </View>
      )}
      {!lockSheets && preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setPreAuthSuccessVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>预授权已开通</Text>
          </View>
          <View style={styles.stretchMarginTop8}>  
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>链上交易哈希</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.txHash ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块号</Text>
              <Text style={styles.sectionValue}>{preAuthInfo?.blockNumber ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块时间戳</Text>
              <Text style={styles.sectionValue}>{formatTimestamp(preAuthInfo?.timestamp)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.payBtn, styles.fullWidthBtn]}
            onPress={() => {
              setPreAuthSuccessVisible(false);
              setShowPasswordScreen(true);
            }}
          >
            <Text style={styles.payBtnText}>完成</Text>
          </TouchableOpacity>
        </View>
      )}
      {showPasswordScreen && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setShowPasswordScreen(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>输入支付密码</Text>
          </View>

          {/* Display Product Price and Gas Fee */}
          <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商品价格</Text><Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text></View>
          <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Gas费</Text><Text style={styles.sectionValue}>{gasFee ? `$${gasFee}` : ''}</Text></View>
          <View style={styles.sectionRow}><Text style={styles.sectionTitle}>实际支付</Text><Text style={styles.sectionValue}>{totalPay ? `$${totalPay}` : ''}</Text></View>

          {/* Password Input */}
          <Pressable style={styles.pwdContainer} onPress={() => passwordInputRef.current?.focus?.()}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.pwdBox}>
                <Text style={styles.pwdDot}>
                  {payPassword.length > i ? '●' : ''}
                </Text>
              </View>
            ))}

            {/* 真正接收输入的隐藏输入框 */}
            <TextInput
              ref={passwordInputRef}
              value={payPassword}
              onChangeText={(v) => {
                const digits = String(v).replace(/\D/g, '').slice(0, 6);
                setPayPassword(digits);
              }}
              keyboardType="number-pad"
              secureTextEntry
              caretHidden
              maxLength={6}
              style={styles.hiddenInput}
              autoFocus
            />
          </Pressable>

          <TouchableOpacity
            onPress={() => {
              (async () => {
                const ok = await ensureSufficientBalance();
                if (!ok) {
                  setShowPasswordScreen(false);
                  return;
                }
                Keyboard.dismiss();
                setPayStatus('loading');
                (async () => {
                  let ac: AbortController | undefined;
                  let tid: any;
                  try {
                    ac = new AbortController();
                    tid = setTimeout(() => ac?.abort(), 60000);
                    const isPreAuth = String(factor?.transactionType) === '预授权';
                    const usePreAuth = isPreAuth && preAuthInfo?.approved === true;
                    const rawIds = (selectedPayCardIds.length > 0 ? selectedPayCardIds : selectedCardId ? [selectedCardId] : [])
                      .filter(Boolean)
                      .map(String);
                    const ids = Array.from(new Set(rawIds));
                    const tokenSymbol = String(selectingTokenSymbol ?? '');
                    const txAmountValue = Number.isFinite(orderAmount) && orderAmount > 0 ? orderAmount : Number(factor?.transactionAmount ?? amount ?? 0);

                    const getBalanceValue = async (id: string) => {
                      const k = balanceKey(String(id), tokenSymbol);
                      const cached = balanceByKey[k]?.value;
                      if (Number.isFinite(cached)) return Number(cached);
                      return fetchBalance(String(id), tokenSymbol);
                    };

                    let singleCoverId = '';
                    if (tokenSymbol && txAmountValue > 0) {
                      for (const id of ids) {
                        const v = await getBalanceValue(String(id));
                        if (v >= txAmountValue) {
                          singleCoverId = String(id);
                          break;
                        }
                      }
                    }

                    const finalIds = singleCoverId ? [singleCoverId] : ids;
                    if (singleCoverId) {
                      setSelectedPayCardIds([singleCoverId]);
                      setUseMultiAccountPayment(false);
                    }

                    const useMultiChain =
                      !usePreAuth && useMultiAccountPayment && finalIds.length > 1 && !singleCoverId && !!tokenSymbol && txAmountValue > 0;

                    const primaryAccountNumber = resolvePrimaryAccountNumber(finalIds);
                    const url = usePreAuth
                      ? 'http://172.20.10.6:8088/api/v1/preAuth/preAuth'
                      : useMultiChain
                        ? 'http://172.20.10.6:8088/api/v1/posTransaction/QRcodeConsumeActiveScanMultiChain'
                        : 'http://172.20.10.6:8088/api/v1/posTransaction/QRcodeConsumeActiveScan';

                    const payAccounts = finalIds
                      .map((id) => {
                        const c = cards.find((x) => String(x?.id) === String(id));
                        if (!c) return null;
                        return {
                          cardToken: String((c as any).cardToken ?? ''),
                          userAddress: String((c as any).chainWalletAddress ?? ''),
                          chainType: resolveChainType(c),
                          tokenSymbol,
                        };
                      })
                      .filter(Boolean);
                    const transferInfos = useMultiChain ? buildTransferInfos(finalIds, txAmountValue) : [];
                    const transactionAmount = String(factor?.transactionAmount ?? amount ?? txAmountValue);
                    const body = usePreAuth
                      ? {
                        primaryAccountNumber,
                        transactionAmount,
                        tokenSymbol: tokenSymbol || String(preAuthInfo?.tokenSymbol ?? ''),
                        terminalId: String(factor?.terminalId ?? ''),
                        merchantId: String(factor?.merchantId ?? ''),
                        referenceNumber: String(factor?.referenceNumber ?? ''),
                        payerAddress: String(preAuthInfo?.payerAddress ?? ''),
                        tokenAddress: String(preAuthInfo?.tokenAddress ?? ''),
                        permit2Address: String(preAuthInfo?.permit2Address ?? ''),
                        payAccounts,
                      }
                      : useMultiChain
                        ? {
                          primaryAccountNumber,
                          transactionAmount,
                          tokenSymbol,
                          terminalId: String(factor?.terminalId ?? ''),
                          merchantId: String(factor?.merchantId ?? ''),
                          referenceNumber: String(factor?.referenceNumber ?? ''),
                          transferInfos,
                        }
                        : {
                        primaryAccountNumber,
                        transactionAmount,
                        tokenSymbol,
                        terminalId: String(factor?.terminalId ?? ''),
                        merchantId: String(factor?.merchantId ?? ''),
                        referenceNumber: String(factor?.referenceNumber ?? ''),
                        payAccounts,
                      };
                    const res = await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                      signal: ac.signal,
                    });
                    const json = await res.json();
                    const d = json?.data ?? {};
                    if (json?.statusCode === '00') {
                      const mapped = {
                        txHash: String(d?.txHash ?? ''),
                        status: String(d?.status ?? ''),
                        blockNumber: String(d?.blockNumber ?? ''),
                        timestamp: String(d?.timestamp ?? ''),
                        merchantId: String(d?.merchantId ?? ''),
                        terminalId: String(d?.terminalId ?? ''),
                        referenceNumber: String(d?.referenceNumber ?? ''),
                        transactionAmount: String(d?.transactionAmount ?? ''),
                        totalPay: String((Number(d?.transactionAmount ?? 0) + Number(d?.gasCost ?? 0))),
                      } as any;
                      setTxn(mapped);
                      setPayStatus('success');
                    } else {
                      setPayStatus('timeout');
                    }
                  } catch {
                    setPayStatus('timeout');
                  } finally {
                    if (tid) clearTimeout(tid);
                  }
                })();
              })();
            }}
            style={styles.payBtn}
          >
            <Text style={styles.payBtnText}>支付</Text>
          </TouchableOpacity>
        </View>
      )}

      {payStatus === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      )}
      {payStatus === 'success' && (
        <View style={styles.fullScreenMask}>
          <Text style={styles.successTitle}>支付成功</Text>

          <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>商品价格</Text>
              <Text style={styles.sectionValue}>{productPrice ? `$${productPrice}` : ''}</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Gas费</Text>
              <Text style={styles.sectionValue}>{gasFee ? `$${gasFee}` : ''}</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>实际支付</Text>
              <Text style={[styles.sectionValue]}>
                {totalPay ? `$${totalPay}` : ''}
              </Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>网络类型</Text>
              <Text style={styles.sectionValue}>以太坊</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>链上交易哈希</Text>
              <Text style={styles.sectionValue}>{txn?.txHash ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块号</Text>
              <Text style={styles.sectionValue}>{txn?.blockNumber ?? '-'}</Text>
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>区块时间戳</Text>
              <Text style={styles.sectionValue}>{formatTimestamp(txn?.timestamp)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 30, alignSelf: 'stretch' }]}
            onPress={() => {
              setPayStatus('idle');
              navigation.popToTop();
            }}
          >
            <Text style={styles.payBtnText}>完成</Text>
          </TouchableOpacity>
        </View>
      )}

      {payStatus === 'timeout' && (
        <View style={styles.fullScreenMask}>
          <Text style={styles.failTitle}>支付超时</Text>
          <Text style={styles.waitDesc}>网络异常或区块确认超时，请重试</Text>

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 30, alignSelf: 'stretch' }]}
            onPress={() => {
              setPayStatus('idle');
              navigation.popToTop();
            }}
          >
            <Text style={styles.payBtnText}>返回</Text>
          </TouchableOpacity>
        </View>
      )}


      {/* {successVisible && !detailsVisible && (
        <View style={styles.overlay}>
          <View style={[styles.sheet, styles.successSheet]}>
            <Text style={styles.successTitle}>交易结果</Text>
            {txnLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#e53935" />
                <Text style={styles.sectionValue}>正在获取交易结果…</Text>
              </View>
            )}
            {!!txnError && <Text style={styles.sectionDesc}>错误：{txnError}</Text>}
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>商户号</Text><Text style={styles.sectionValue}>{txn?.merchantId ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>终端号</Text><Text style={styles.sectionValue}>{txn?.terminalId ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>交易金额</Text><Text style={styles.sectionValue}>{txn?.transactionAmount != null ? `$${String(txn?.transactionAmount)}` : '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>订单号</Text><Text style={styles.sectionValue}>{txn?.referenceNumber ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>交易日期、时间</Text><Text style={styles.sectionValue}>{formatTimestamp(txn?.timestamp)}</Text></View>
            </View>

            <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>链上交易hash</Text><Text style={styles.sectionValue}>{txn?.txHash ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>链上交易状态</Text><Text style={styles.sectionValue}>{txn?.status ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>区块号</Text><Text style={styles.sectionValue}>{txn?.blockNumber ?? '-'}</Text></View>
              <View style={styles.sectionRow}><Text style={styles.sectionTitle}>实际支付</Text><Text style={styles.sectionValue}>{txn?.totalPay != null ? `$${String(txn?.totalPay)}` : '-'}</Text></View>
            </View>

            <TouchableOpacity
              onPress={() => {
                navigation.navigate('TransactionDetails', {
                  txn: txn ?? {},
                  address: (factor?.blockchainAddress ?? address),
                  stable: selectedStable,
                  network: '以太坊',
                  productPrice: Number(productPrice || '0'),
                  gasFee,
                  totalPay,
                });
              }}
              style={styles.successDoneBtn}
            >
              <Text style={styles.successDoneText}>交易详情</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSuccessVisible(false);
                setDetailsVisible(false);
                navigation.popToTop();
              }}
              style={[styles.successDoneBtn, { marginTop: 12 }]}
            >
              <Text style={styles.successDoneText}>完成</Text>
            </TouchableOpacity>
          </View>
        </View>
      )} */}

      {/* 交易详情改为全屏页面，半屏详情已移除 */}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  stretchMarginTop8: { alignSelf: 'stretch', marginTop: 8 },
  fullWidthBtn: { marginTop: 30, alignSelf: 'stretch' },
  payBtnLoading: { opacity: 0.6 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    minHeight: '55%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#333',
    lineHeight: 24,
  },
  headerHelp: {
    fontSize: 18,
    color: '#666',
  },
  helpBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  helpText: { fontSize: 18, color: '#666' },
  amountBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  currency: {
    fontSize: 20,
    color: '#333',
    marginRight: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  subAmount: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#222',
    marginBottom: 4,
    fontWeight: '600',
    width: 90,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#666',
  },
  sectionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionRowWrap: {
    alignItems: 'flex-start',
  },
  sectionValue: {
    fontSize: 13,
    color: '#333',
    textAlign: 'right',
    width: '60%',
  },
  valueWrap: {
    width: '80%',
    textAlign: 'left',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addrRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  safeBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e6f4ea', alignItems: 'center', justifyContent: 'center' },
  safeText: { color: '#2e7d32', fontSize: 12, fontWeight: '700' },
  dropdown: { marginTop: 8, flexDirection: 'row', gap: 8 },
  dropdownItem: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 14 },
  dropdownText: { fontSize: 12, color: '#555' },
  dropdownTextActive: { color: '#e53935', fontWeight: '600' },
  gasRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gasInput: { width: 80, height: 32, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 8 },
  tipText: { marginTop: 6, fontSize: 11, color: '#888' },
  infoTip: { marginTop: 8, fontSize: 12, color: '#666' },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  pwdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    position: 'relative',
  },

  pwdBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pwdDot: {
    fontSize: 22,
    fontWeight: '700',
  },

  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 1,
  },

  cardListLimited: { maxHeight: 576 },
  cardListContent: { paddingTop: 8 },
  cardList: { marginTop: 8 },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  cardThumb: { width: 48, height: 30, borderRadius: 6, backgroundColor: '#eee', marginRight: 12 },
  cardMiddle: { flex: 1 },
  cardName: { fontSize: 14, color: '#222', fontWeight: '600' },
  cardBalance: { fontSize: 12, color: '#888', marginTop: 4 },
  selectedBadge: { color: '#e53935', fontSize: 18, fontWeight: '700' },
  unselectedDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#ddd' },
  cardOptions: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  cardOptionActive: {
    borderColor: '#e53935',
    backgroundColor: '#fdecea',
  },
  cardOptionText: { fontSize: 12, color: '#555' },
  cardOptionTextActive: { color: '#e53935', fontWeight: '600' },
  input: {
    marginTop: 12,
    width: '100%',
    height: 44,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  waitTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },

  waitDesc: {
    marginTop: 12,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },

  failTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#e53935',
    textAlign: 'center',
  },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#bbb',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#e33',
    borderColor: '#e33',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 12,
  },
  agreeText: {
    fontSize: 12,
    color: '#555',
  },
  payBtn: {
    marginTop: 16,
    backgroundColor: '#e53935',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: {
    backgroundColor: '#ccc',
  },
  fullScreenMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  payBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  payMethodRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  payMethodText: {
    fontSize: 13,
    color: '#333',
    flexShrink: 1, // 让左边内容被压缩
  },

  tokenText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginLeft: 4,
    flexShrink: 0, // 保证币种永远不被挤掉
  },

  successSheet: {
    alignItems: 'center',
    minHeight: '45%',
  },
  successTitle: { fontSize: 18, fontWeight: '600', color: '#222', marginTop: 8, marginBottom: 12 },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e6f4ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  successIcon: { color: '#2e7d32', fontSize: 28, fontWeight: '700' },
  successAmount: { fontSize: 28, fontWeight: '700', color: '#333', marginTop: 16 },
  successDoneBtn: {
    marginTop: 24,
    backgroundColor: '#e53935',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    alignSelf: 'stretch',
  },
  successDoneText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  box: { marginTop: 8, alignSelf: 'stretch', borderColor: '#eee', borderWidth: 1, borderRadius: 8, padding: 12 },
  boxTitle: { fontSize: 13, color: '#333', marginBottom: 8, fontWeight: '600' },
  boxText: { fontSize: 12, color: '#444' },

});

export default PaymentScreen;

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

const maskCardToken = (token: string) => {
  if (!token || token.length <= 10) return token;
  const head = token.slice(0, 6);
  const tail = token.slice(-4);
  return `${head}****${tail}`;
};

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
  const defaultSelectedRef = useRef<boolean>(false);
  const [lockSheets, setLockSheets] = useState(false);
  const to = (route?.params as any)?.to as string | undefined;
  const scanText = (route?.params as any)?.scanText as string | undefined;
  const [payPassword, setPayPassword] = useState('');
// 支付状态：idle | paying | success | timeout
  const [payStatus, setPayStatus] = useState<'idle' | 'loading' | 'success' | 'timeout'>('idle');
  // 是否是多链支付
  const [isMultiChainPayment, setIsMultiChainPayment] = useState(false);
  // 多链支付结果列表
  const [multiChainTxns, setMultiChainTxns] = useState<any[]>([]);
  // 是否有 orderInfos 数组
  const [hasOrderInfos, setHasOrderInfos] = useState(false);
  // orderInfos 数组长度
  const [orderInfosLength, setOrderInfosLength] = useState(0);
  // 支付方式类型：'stablecoin' | 'bankcard'
  const [paymentMethodType, setPaymentMethodType] = useState<'stablecoin' | 'bankcard'>('stablecoin');
  // 当前选择的币种（用于选择界面显示）
  const [selectingCurrency, setSelectingCurrency] = useState<string>('');
  // 银行卡列表
  const [bankCards, setBankCards] = useState<any[]>([]);
  const [bankCardsLoading, setBankCardsLoading] = useState(false);
  const [bankCardsError, setBankCardsError] = useState('');
  const [selectedBankCardId, setSelectedBankCardId] = useState<string>('');
  // 价格转换相关
  const [convertPrice, setConvertPrice] = useState<string>('');
  const [convertPriceLoading, setConvertPriceLoading] = useState(false);
  const [convertPriceError, setConvertPriceError] = useState('');

  // 原始订单金额（美元）
  const orderAmountUSD = useMemo(() => {
    const v1 = Number(factor?.transactionAmount);
    if (Number.isFinite(v1) && v1 > 0) return v1;
    const v2 = Number(productPrice);
    if (Number.isFinite(v2) && v2 > 0) return v2;
    const v3 = Number(amount);
    if (Number.isFinite(v3) && v3 > 0) return v3;
    return 0;
  }, [factor?.transactionAmount, productPrice, amount]);

  // 转换后的订单金额（币种单位）
  const orderAmount = useMemo(() => {
    // 如果选择了币种且有转换价格，则使用转换后的金额
    // convertPrice 是 1 个币种对应的美元金额，所以需要的币种数量 = 美元金额 / 转换价格
    if (selectingTokenSymbol && convertPrice && orderAmountUSD > 0) {
      const convertRate = Number(convertPrice);
      if (Number.isFinite(convertRate) && convertRate > 0) {
        return orderAmountUSD / convertRate;
      }
    }
    // 否则返回美元金额
    return orderAmountUSD;
  }, [orderAmountUSD, selectingTokenSymbol, convertPrice]);

  const balanceKey = useCallback((cardId: string, tokenSymbol: string) => `${cardId}|${tokenSymbol}`, []);

  // 计算支付账户信息
  const paymentAccounts = useMemo(() => {
    if (!selectingTokenSymbol) return [];
    const base = Array.isArray(selectedPayCardIds) ? selectedPayCardIds : selectedCardId ? [selectedCardId] : [];
    const ids = base.filter(Boolean);
    if (ids.length === 0) return [];
    
    const targetAmount = orderAmount;
    
    // 如果只有一个账户，直接显示全部金额
    if (ids.length === 1) {
      const card = cards.find((c) => String(c?.id) === String(ids[0]));
      if (!card) return [];
      const chain = (card as any)?.raw?.chain ?? (card as any)?.chain ?? {};
      return [{
        cardId: String(ids[0]),
        chainName: String(card?.chainName ?? chain?.chainName ?? ''),
        cardToken: String(card?.cardToken ?? ''),
        tokenSymbol: String(selectingTokenSymbol),
        amount: targetAmount > 0 ? targetAmount : 0,
      }];
    }

    // 多个账户时，根据余额分配金额
    if (!targetAmount || !(targetAmount > 0)) {
      return [];
    }

    let remaining = targetAmount;
    const accounts: Array<{ cardId: string; chainName: string; cardToken: string; tokenSymbol: string; amount: number }> = [];
    
    for (const id of ids) {
      if (!(remaining > 0)) break;
      const card = cards.find((c) => String(c?.id) === String(id));
      if (!card) continue;
      const k = balanceKey(String(id), String(selectingTokenSymbol));
      const bal = balanceByKey[k]?.value ?? 0;
      const available = Number.isFinite(bal) ? bal : 0;
      const take = Math.max(0, Math.min(available, remaining));
      if (take <= 0) continue;
      
      const chain = (card as any)?.raw?.chain ?? (card as any)?.chain ?? {};
      accounts.push({
        cardId: String(id),
        chainName: String(card?.chainName ?? chain?.chainName ?? ''),
        cardToken: String(card?.cardToken ?? ''),
        tokenSymbol: String(selectingTokenSymbol),
        amount: take,
      });
      remaining -= take;
    }

    // 如果还有剩余金额，将剩余金额加到最后一个账户
    if (remaining > 0 && accounts.length > 0) {
      const last = accounts[accounts.length - 1];
      accounts[accounts.length - 1] = {
        ...last,
        amount: last.amount + remaining,
      };
    }

    return accounts;
  }, [selectedPayCardIds, selectedCardId, selectingTokenSymbol, orderAmount, cards, balanceByKey, balanceKey]);

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

  const buildTransferInfos = useCallback(
    (idsOverride?: string[], amountOverride?: number, balancesOverride?: Record<string, number>) => {
      const base = Array.isArray(idsOverride) ? idsOverride : Array.isArray(selectedPayCardIds) ? selectedPayCardIds : [];
      const ids = base.filter(Boolean);
      if (ids.length <= 1) return [];
      if (!selectingTokenSymbol) return [];
      const targetAmount = Number(amountOverride ?? orderAmount);
      if (!targetAmount || !(targetAmount > 0)) return [];

      const formatAmount = (n: number) => {
        const s = Number.isFinite(n) ? n.toFixed(4) : '0.000000';
        return s.replace(/\.?0+$/, '');
      };

      let remaining = targetAmount;
      const infos: Array<{ primaryAccountNumber: string; chainType: string; tokenSymbol: string; amount: string }> = [];
      for (const id of ids) {
        if (!(remaining > 0)) break;
        const card = cards.find((c) => String(c?.id) === String(id));
        if (!card) continue;
        const overrideVal = balancesOverride ? balancesOverride[String(id)] : undefined;
        const k = balanceKey(String(id), String(selectingTokenSymbol));
        const bal = overrideVal != null ? overrideVal : balanceByKey[k]?.value ?? 0;
        const available = Number.isFinite(bal) ? bal : 0;
        const take = Math.max(0, Math.min(available, remaining));
        if (take <= 0) continue;
        const primaryAccountNumber = String((card as any).cardToken ?? '');
        infos.push({
          primaryAccountNumber,
          chainType: resolveChainType(card),
          tokenSymbol: String(selectingTokenSymbol),
          amount: formatAmount(take),
        });
        remaining -= take;
      }

      if (remaining > 0 && infos.length > 0) {
        const last = infos[infos.length - 1];
        const lastAmount = Number(last.amount);
        infos[infos.length - 1] = {
          ...last,
          amount: formatAmount((Number.isFinite(lastAmount) ? lastAmount : 0) + remaining),
        };
      }

      return infos;
    },
    [balanceByKey, balanceKey, cards, orderAmount, resolveChainType, selectedPayCardIds, selectingTokenSymbol]
  );

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

  const fetchBankCards = useCallback(async () => {
    try {
      setBankCardsLoading(true);
      setBankCardsError('');
      // GET 请求使用 query 参数
      const url = `${API_BASE_URL}/posTransaction/queryCards?userId=03572638`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      const cardList = Array.isArray(json?.data) ? json.data : [];
      const mapped = cardList.map((card: any, idx: number) => {
        const primaryAccountNumber = String(card?.primaryAccountNumber ?? '');
        const id = primaryAccountNumber || String(idx);
        const bankName = String(card?.issuingInstitution ?? '');
        const cardType = String(card?.cardType ?? '');
        const userId = String(card?.userId ?? '');
        // 卡类型映射：B 可能是银行卡
        const cardTypeText = cardType === 'B' ? '银行卡' : cardType;
        return { 
          id, 
          cardToken: primaryAccountNumber, 
          bankName, 
          cardType: cardTypeText, 
          cardHolderName: '', // 接口返回中没有持卡人姓名
          userId,
          raw: card 
        };
      });
      setBankCards(mapped);
      if (mapped.length > 0 && !selectedBankCardId) {
        setSelectedBankCardId(mapped[0].id);
      }
    } catch (e: any) {
      setBankCardsError(String(e?.message || e));
    } finally {
      setBankCardsLoading(false);
    }
  }, [selectedBankCardId]);

  // 获取价格转换（美元转币种）
  const fetchConvertPrice = useCallback(async (tokenSymbol: string) => {
    if (!tokenSymbol) {
      setConvertPrice('');
      return;
    }
    try {
      setConvertPriceLoading(true);
      setConvertPriceError('');
      const res = await fetch(`${API_BASE_URL}/chainlink/getConvertPrice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenSymbol }),
      });
      const json = await res.json();
      if (json?.statusCode === '00' && json?.data) {
        const price = String(json.data);
        setConvertPrice(price);
      } else {
        setConvertPriceError(json?.msg || '获取转换价格失败');
        setConvertPrice('');
      }
    } catch (e: any) {
      setConvertPriceError(String(e?.message || e));
      setConvertPrice('');
    } finally {
      setConvertPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccountCardList();
  }, [fetchAccountCardList]);

  useEffect(() => {
    if (selectingCard) {
      fetchAccountCardList();
      // 如果已经有选择的币种，设置到选择界面
      if (selectingTokenSymbol && !selectingCurrency) {
        setSelectingCurrency(selectingTokenSymbol);
      }
      // 如果是多选模式且没有选中任何账户，默认选中第一行
      if (multiSelectMode && selectingCurrency) {
        setSelectedPayCardIds((prev) => {
          if (Array.isArray(prev) && prev.length > 0) {
            return prev; // 如果已经有选中的，保持原样
          }
          // 如果没有选中的，等待 cards 加载完成后设置默认选中
          return prev;
        });
      }
    }
  }, [selectingCard, fetchAccountCardList, selectingTokenSymbol, selectingCurrency, multiSelectMode]);

  // 当 cards 加载完成且是多选模式时，如果 selectedPayCardIds 为空，默认选中第一行
  useEffect(() => {
    if (selectingCard && multiSelectMode && selectingCurrency && cards.length > 0) {
      setSelectedPayCardIds((prev) => {
        if (Array.isArray(prev) && prev.length > 0) {
          defaultSelectedRef.current = true; // 已经有选中的，标记为已设置
          return prev; // 如果已经有选中的，保持原样
        }
        // 如果已经设置过默认选中，不再重复设置
        if (defaultSelectedRef.current) {
          return prev;
        }
        // 默认选中第一行
        const firstCard = cards[0];
        const firstId = String((firstCard as any)?.id ?? '');
        if (firstId) {
          // 检查第一行是否支持当前币种
          const chain = (firstCard as any)?.raw?.chain ?? (firstCard as any)?.chain ?? {};
          const tokens = Array.isArray(chain?.tokens) ? chain.tokens.map((t: any) => String(t)) : 
                         Array.isArray((firstCard as any).tokens) ? (firstCard as any).tokens : [];
          if (tokens.includes(selectingCurrency)) {
            defaultSelectedRef.current = true; // 标记为已设置
            setSelectedCardId(firstId);
            // 获取第一行的余额
            fetchBalance(firstId, String(selectingCurrency));
            return [firstId];
          }
        }
        return prev;
      });
    }
    // 当关闭选择界面时，重置标记
    if (!selectingCard) {
      defaultSelectedRef.current = false;
    }
  }, [selectingCard, multiSelectMode, selectingCurrency, cards, fetchBalance]);

  useEffect(() => {
    // 当切换到银行卡标签且银行卡列表为空时，自动查询
    if (selectingCard && paymentMethodType === 'bankcard' && bankCards.length === 0 && !bankCardsLoading) {
      fetchBankCards();
    }
  }, [selectingCard, paymentMethodType, bankCards.length, bankCardsLoading, fetchBankCards]);

  // 当选择币种时，自动获取转换价格
  useEffect(() => {
    if (selectingTokenSymbol && orderAmountUSD > 0) {
      fetchConvertPrice(selectingTokenSymbol);
    } else {
      setConvertPrice('');
    }
  }, [selectingTokenSymbol, orderAmountUSD, fetchConvertPrice]);

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
    console.log('parseScanText result:', obj, 'scanText:', scanText);
    if (obj && typeof obj === 'object') {
      const newFactor = {
        merchantId: obj.merchantId ?? undefined,
        terminalId: obj.terminalId ?? undefined,
        referenceNumber: obj.referenceNumber ?? undefined,
        transactionAmount: obj.transactionAmount != null ? Number(obj.transactionAmount) : undefined,
        transactionType: obj.transactionType ?? undefined,
      };
      console.log('Setting factor from scanText:', newFactor);
      setFactor((prev: any) => {
        const merged = {
          ...(prev || {}),
          ...newFactor,
          // 确保关键字段不会被 undefined 覆盖
          merchantId: newFactor.merchantId ?? prev?.merchantId,
          terminalId: newFactor.terminalId ?? prev?.terminalId,
          referenceNumber: newFactor.referenceNumber ?? prev?.referenceNumber,
          transactionAmount: newFactor.transactionAmount ?? prev?.transactionAmount,
          transactionType: newFactor.transactionType ?? prev?.transactionType,
        };
        console.log('Merged factor:', merged);
        return merged;
      });
      //1.4不从交易要素获取商品价格
      const amt = obj.transactionAmount != null ? Number(obj.transactionAmount) : 0;
      setProductPrice(amt.toFixed(4) as unknown as number);
      // 预授权检查移至"确认付款"点击后执行
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
      setFactorLoading(true);
      setFactorError('');
      const primaryAccountNumber = resolvePrimaryAccountNumber();
      const url = `http://172.20.10.14:4523/m1/7468733-7203316-defaul/api/v1/posTransaction/queryTransFactor?primaryAccountNumber=${encodeURIComponent(primaryAccountNumber)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      const list: any[] = Array.isArray(json?.data) ? json.data : [];
      if (list.length === 0) {
        // 防御：接口正常但无数据，但不清空已有的 factor 数据（可能来自 scanText）
        // setFactor(null); // 注释掉，保留已有数据
        return;
      }
      const first = list[0];
      setFactor((prev: any) => ({
        ...(prev || {}),
        ...first,
        // 确保从 scanText 解析的关键字段不会被覆盖
        merchantId: first.merchantId ?? prev?.merchantId,
        terminalId: first.terminalId ?? prev?.terminalId,
        referenceNumber: first.referenceNumber ?? prev?.referenceNumber,
      }));
      // setGasFee(data?.gasCost != null ? String(data.gasCost) : '');
      setProductPrice(prev => prev); // 交易金额仍来自 scanText
      // setTotalPay(prev => prev);
    } catch (e: any) {
      setFactorError(String(e?.message || e));
    } finally {
      setFactorLoading(false);
    }
  }, [scanText]);


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
          </View>

          {(factorLoading || cardsLoading) && <Text style={styles.sectionDesc}>正在查询...</Text>}
          

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

          {/* <TouchableOpacity
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

          {(selectingTokenSymbol) && (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>币种</Text>
              <Text style={styles.sectionValue}>{selectingTokenSymbol ?? '-'} </Text>
            </View>
          )} */}

          {selectingTokenSymbol && paymentAccounts.length > 0 && (
            <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
              <TouchableOpacity
                style={styles.sectionRow}
                onPress={() => {
                  setMultiSelectMode(balanceInsufficientHint);
                  setSelectingCard(true);
                }}
              >
                <Text style={styles.sectionTitle}>支付账户</Text>
                <Text style={styles.sectionValue}>
                  {paymentAccounts.length}个账户 {'>'}
                </Text>
              </TouchableOpacity>
              {paymentAccounts.map((account, index) => {
                const formatAmount = (n: number) => {
                  const s = Number.isFinite(n) ? n.toFixed(4) : '0.000000';
                  return s.replace(/\.?0+$/, '');
                };
                return (
                  <View key={account.cardId} style={styles.paymentAccountItem}>
                    <View style={styles.paymentAccountLeft}>
                      <View style={styles.chainIcon} />
                      <View style={styles.paymentAccountInfo}>
                        <Text style={styles.paymentAccountLabel}>
                          稳定币账户 {account.chainName} [{maskCardToken(account.cardToken)}]
                        </Text>
                      </View>
                    </View>
                    {/* <Text style={styles.paymentAccountAmount}>
                      {formatAmount(account.amount)} {account.tokenSymbol}
                    </Text> */}
                    {(() => {
                      // 获取当前账户的余额
                      const k = balanceKey(account.cardId, String(selectingTokenSymbol));
                      const accountBalance = balanceByKey[k]?.value ?? 0;
                      const accountBalanceValue = Number.isFinite(accountBalance) ? accountBalance : 0;
                      
                      // 判断是否是最后一个账户
                      const isLastAccount = index === paymentAccounts.length - 1;
                      
                      // 计算前面账户已分配的金额总和
                      const previousAmounts = paymentAccounts.slice(0, index).reduce((sum, acc) => sum + acc.amount, 0);
                      const remainingAmount = orderAmount - previousAmounts;
                      
                      // 如果账户余额 >= 分配的金额，展示分配的金额
                      // 如果余额不足，最后一个账户展示剩余需要支付的费用
                      let displayAmount = account.amount;
                      
                      // 如果是最后一个账户且余额不足（余额 < 剩余需要支付的费用），显示剩余需要支付的费用
                      if (isLastAccount && accountBalanceValue < remainingAmount) {
                        displayAmount = Math.max(0, remainingAmount);
                      }
                      // 其他情况显示分配的金额（account.amount 已经根据余额计算，不会超过账户余额）
                      
                      const formatAmount = (n: number) => {
                        if (!Number.isFinite(n) || n < 0) return '0.00';
                        return n.toFixed(4);
                      };
                      return (
                        <Text style={[styles.paymentAccountAmount]}>
                         {formatAmount(displayAmount)} {account.tokenSymbol}
                        </Text>
                      );
                    })()}
                  </View>
                );
              })}
              {paymentAccounts.length > 1 && (
                <View style={styles.paymentAccountTotal}>
                  <Text style={styles.paymentAccountTotalLabel}>合计</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.paymentAccountTotalAmount}>
                      {(() => {
                        const total = paymentAccounts.reduce((sum, acc) => sum + acc.amount, 0);
                        const s = Number.isFinite(total) ? total.toFixed(4) : '0.000000';
                        return s.replace(/\.?0+$/, '');
                      })()} {selectingTokenSymbol}
                    </Text>
                  </View>
                </View>
              )}
              {balanceInsufficientHint && (() => {
                // 计算当前账户总余额
                const base = Array.isArray(selectedPayCardIds) ? selectedPayCardIds : selectedCardId ? [selectedCardId] : [];
                const ids = base.filter(Boolean);
                const totalBalance = ids.reduce((sum, id) => {
                  const k = balanceKey(String(id), String(selectingTokenSymbol));
                  const bal = balanceByKey[k]?.value ?? 0;
                  return sum + (Number.isFinite(bal) ? bal : 0);
                }, 0);
                const needed = orderAmount - totalBalance;
                const formatAmount = (n: number) => {
                  if (!Number.isFinite(n) || n < 0) return '0.00';
                  return n.toFixed(2);
                };
                return (
                  <View style={styles.insufficientBalanceBox}>
                    <View style={styles.insufficientBalanceContent}>
                      <Text style={styles.insufficientBalanceIcon}>⚠</Text>
                      <View style={styles.insufficientBalanceText}>
                        <Text style={styles.insufficientBalanceTitle}>余额不足</Text>
                        <Text style={styles.insufficientBalanceDesc}>
                          当前账户余额{formatAmount(totalBalance)} {selectingTokenSymbol}, 还需{formatAmount(needed)} {selectingTokenSymbol}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setMultiSelectMode(true);
                            setSelectingCard(true);
                          }}
                          style={styles.addAccountLink}
                        >
                          <Text style={styles.addAccountLinkText}>+ 添加其他链账户支付</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })()}
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
            disabled={!agreed || balanceInsufficientHint}
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
              (async () => {
                let ac: AbortController | undefined;
                let tid: any;
                try {
                  ac = new AbortController();
                  tid = setTimeout(() => ac?.abort(), 30000);
                  const res = await fetch('http://172.20.10.6:8088/api/v1/posTransaction/QRcodeConsumeActiveScan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      primaryAccountNumber: resolvePrimaryAccountNumber(),
                      transactionAmount: String(factor?.transactionAmount ?? amount ?? ''),
                      terminalId: String(factor?.terminalId ?? ''),
                      merchantId: String(factor?.merchantId ?? ''),
                      referenceNumber: String(factor?.referenceNumber ?? ''),
                    }),
                    signal: ac.signal,
                  });
                  const json = await res.json();
                  console.warn('json', json);
                  const d = json?.data ?? {};
                  const mapped = {
                    txHash: String(d?.txHash ?? ''),
                    status: String(d?.status ?? ''),
                    blockNumber: String(d?.blockNumber ?? ''),
                    timestamp: String(d?.timestamp ?? ''),
                    fromAddress: String(d?.fromAddress ?? ''),
                    toAddress: String(d?.toAddress ?? ''),
                    gasUsed: String(d?.gasUsed ?? ''),
                    gasPrice: String(d?.gasPrice ?? ''),
                    gasCost: String(d?.gasCost ?? ''),
                    inputData: String(d?.inputData ?? ''),
                    functionName: String(d?.functionName ?? ''),
                    events: Array.isArray(d?.events) ? d.events : [],
                    tokenTransfers: Array.isArray(d?.tokenTransfers) ? d.tokenTransfers : [],
                    merchantId: String(d?.merchantId ?? ''),
                    terminalId: String(d?.terminalId ?? ''),
                    referenceNumber: String(d?.referenceNumber ?? ''),
                    transactionAmount: String(d?.transactionAmount ?? ''),
                    statusCode: String(json?.statusCode ?? ''),
                    msg: String(json?.msg ?? ''),
                    totalPay: String((Number(d?.transactionAmount ?? 0) + Number(d?.gasCost ?? 0))),
                  } as any;
                  setTxn(mapped);
                } catch (e: any) {
                  // setTxnError(String(e?.message || e));
                } finally {
                  if (tid) clearTimeout(tid);
                  // setTxnLoading(false);
                }
              })();
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
            style={[styles.payBtn, (!agreed || balanceInsufficientHint) && styles.payBtnDisabled]}
          >
            <Text style={styles.payBtnText}>
              {balanceInsufficientHint 
                ? '余额不足' 
                : String(factor?.transactionType) === '预授权' ? '确认授权' : '确认付款'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {!lockSheets && selectingCard && !selectingToken && !preAuthSheetVisible && !preAuthSuccessVisible && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.paymentModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectingCard(false);
                setMultiSelectMode(false);
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.paymentModalTitle}>选择支付账户</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectingCard(false);
                setMultiSelectMode(false);
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* 支付方式标签页 */}
          <View style={styles.paymentMethodTabs}>
            <TouchableOpacity
              style={[styles.paymentMethodTab, paymentMethodType === 'stablecoin' && styles.paymentMethodTabActive]}
              onPress={() => setPaymentMethodType('stablecoin')}
            >
              <Text style={[styles.paymentMethodTabText, paymentMethodType === 'stablecoin' && styles.paymentMethodTabTextActive]}>
                稳定币账户
              </Text>
              {paymentMethodType === 'stablecoin' && <View style={styles.paymentMethodTabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentMethodTab, paymentMethodType === 'bankcard' && styles.paymentMethodTabActive]}
              onPress={() => {
                setPaymentMethodType('bankcard');
                // 切换到银行卡时，查询银行卡列表
                if (bankCards.length === 0 && !bankCardsLoading) {
                  fetchBankCards();
                }
              }}
            >
              <Text style={[styles.paymentMethodTabText, paymentMethodType === 'bankcard' && styles.paymentMethodTabTextActive]}>
                银行卡
              </Text>
              {paymentMethodType === 'bankcard' && <View style={styles.paymentMethodTabUnderline} />}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.cardListLimited} contentContainerStyle={styles.cardListContent} showsVerticalScrollIndicator>
            {cardsLoading && (
              <View style={styles.stretchMarginTop8}>
                <ActivityIndicator />
              </View>
            )}
            {!!cardsError && <Text style={styles.sectionDesc}>错误：{cardsError}</Text>}

            {paymentMethodType === 'stablecoin' && (
              <>
                {/* 币种选择区域 */}
                <View style={styles.currencySelectionSection}>
                  <Text style={styles.currencySelectionLabel}>选择币种</Text>
                  <View style={styles.currencyButtons}>
                  <TouchableOpacity
                      style={[styles.currencyButton, selectingCurrency === 'USDT' && styles.currencyButtonSelected]}
                      onPress={() => {
                        setSelectingCurrency('USDT');
                        // 更新币种选择
                        setSelectingTokenSymbol('USDT');
                        // 如果已经选择了账户，需要重新获取余额
                        if (selectedCardId || (Array.isArray(selectedPayCardIds) && selectedPayCardIds.length > 0)) {
                          const ids = Array.isArray(selectedPayCardIds) && selectedPayCardIds.length > 0 
                            ? selectedPayCardIds 
                            : selectedCardId ? [selectedCardId] : [];
                          ids.forEach((id) => {
                            fetchBalance(String(id), 'USDT');
                          });
                        }
                      }}
                    >
                      <View style={[styles.currencyIcon, styles.currencyIconUSDT]}>
                        <Text style={styles.currencyIconText}>T</Text>
                      </View>
                      <Text style={[styles.currencyButtonText, selectingCurrency === 'USDT' && styles.currencyButtonTextSelected]}>
                        USDT
                      </Text>
                      {selectingCurrency === 'USDT' && (
                        <Text style={styles.currencyCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.currencyButton, selectingCurrency === 'USDC' && styles.currencyButtonSelected]}
                      onPress={() => {
                        setSelectingCurrency('USDC');
                        // 更新币种选择
                        setSelectingTokenSymbol('USDC');
                        // 如果已经选择了账户，需要重新获取余额
                        if (selectedCardId || (Array.isArray(selectedPayCardIds) && selectedPayCardIds.length > 0)) {
                          const ids = Array.isArray(selectedPayCardIds) && selectedPayCardIds.length > 0 
                            ? selectedPayCardIds 
                            : selectedCardId ? [selectedCardId] : [];
                          ids.forEach((id) => {
                            fetchBalance(String(id), 'USDC');
                          });
                        }
                      }}
                    >
                      <View style={[styles.currencyIcon, styles.currencyIconUSDC]}>
                        <Text style={styles.currencyIconText}>C</Text>
                      </View>
                      <Text style={[styles.currencyButtonText, selectingCurrency === 'USDC' && styles.currencyButtonTextSelected]}>
                        USDC
                      </Text>
                      {selectingCurrency === 'USDC' && (
                        <Text style={styles.currencyCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                
                  </View>
                </View>

                {/* 账户选择区域 */}
                <View style={styles.accountSelectionSection}>
                  <Text style={styles.accountSelectionLabel}>选择账户</Text>
                  {(multiSelectMode && selectingCurrency ? cards.filter((c) => {
                    const chain = (c as any)?.raw?.chain ?? (c as any)?.chain ?? {};
                    const tokens = Array.isArray(chain?.tokens) ? chain.tokens.map((t: any) => String(t)) : 
                                   Array.isArray((c as any).tokens) ? (c as any).tokens : [];
                    return tokens.includes(selectingCurrency);
                  }) : cards).map((c, index) => {
                    const id = String((c as any).id);
                    // 在多选模式下，只使用 selectedPayCardIds 来判断是否选中，不使用 selectedCardId
                    const isInSelectedPayCardIds = Array.isArray(selectedPayCardIds) && selectedPayCardIds.includes(id);
                    // 多选模式下只使用 selectedPayCardIds，非多选模式下使用 selectedCardId
                    const isSelected = multiSelectMode && selectingCurrency 
                      ? isInSelectedPayCardIds
                      : (selectedCardId === id || isInSelectedPayCardIds);
                    const chain = (c as any)?.raw?.chain ?? (c as any)?.chain ?? {};
                    const chainName = String(c?.chainName ?? chain?.chainName ?? '');
                    
                    // 根据链类型选择图标和样式
                    const getChainIconStyle = () => {
                      const chainId = Number(c?.chainId ?? chain?.chainId ?? 0);
                      if (chainId === 1 || chainName.toUpperCase().includes('ETHEREUM')) {
                        return { style: styles.chainIconEthereum, icon: '◆', isDiamond: true };
                      } else if (chainId === 42161 || chainName.toUpperCase().includes('ARBITRUM')) {
                        return { style: styles.chainIconArbitrum, icon: '●', isDiamond: false };
                      } else if (chainName.toUpperCase().includes('POLYGON')) {
                        return { style: styles.chainIconPolygon, icon: '∞', isDiamond: false };
                      }
                      return { style: styles.chainIconDefault, icon: '', isDiamond: false };
                    };

                    const chainIcon = getChainIconStyle();

                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.accountItem, isSelected && styles.accountItemSelected]}
                        onPress={() => {
                          if (multiSelectMode && selectingCurrency) {
                            setSelectedPayCardIds((prev) => {
                              const base = Array.isArray(prev) ? prev : [];
                              const has = base.includes(id);
                              const next = has ? base.filter((x) => x !== id) : [...base, id];
                              if (!has) {
                                fetchBalance(id, String(selectingCurrency));
                              }
                              // 更新 selectedCardId 为当前选中的第一个账户（如果有选中的话）
                              if (next.length > 0) {
                                setSelectedCardId(next[0]);
                              } else {
                                setSelectedCardId('');
                              }
                              return next;
                            });
                          } else {
                            // 如果没有选择币种，提示用户先选择币种
                            if (!selectingCurrency) {
                              Alert.alert('提示', '请先选择币种');
                              return;
                            }
                            setSelectedCardId(id);
                            setSelectedPayCardIds([id]);
                            setSelectingTokenSymbol(selectingCurrency);
                            setSelectingCard(false);
                            setMultiSelectMode(false);
                          }
                        }}
                      >
                        <View style={[styles.accountIcon, chainIcon.style, chainIcon.isDiamond && styles.chainIconDiamond]}>
                          {chainIcon.icon ? (
                            <Text style={[styles.chainIconText, chainIcon.isDiamond && styles.chainIconDiamondText]}>
                              {chainIcon.icon}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.accountInfo}>
                          <Text style={styles.accountTypeText}>稳定币账户</Text>
                          <Text style={styles.accountAddressText}>
                            {chainName} [{maskCardToken(String((c as any).cardToken ?? ''))}]
                          </Text>
                        </View>
                        <Text style={styles.accountArrow}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {paymentMethodType === 'bankcard' && (
              <View style={styles.bankCardSection}>
                {bankCardsLoading && (
                  <View style={styles.stretchMarginTop8}>
                    <ActivityIndicator />
                  </View>
                )}
                {!!bankCardsError && <Text style={styles.sectionDesc}>错误：{bankCardsError}</Text>}
                {!bankCardsLoading && bankCards.length === 0 && !bankCardsError && (
                  <Text style={styles.sectionDesc}>暂无银行卡</Text>
                )}
                {bankCards.map((bankCard) => {
                  const id = String(bankCard.id);
                  const isSelected = selectedBankCardId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.accountItem, isSelected && styles.accountItemSelected]}
                      onPress={() => {
                        setSelectedBankCardId(id);
                        // 选择银行卡后，关闭选择界面
                        setSelectingCard(false);
                        setMultiSelectMode(false);
                        // TODO: 处理银行卡选择逻辑
                      }}
                    >
                      <View style={[styles.accountIcon, styles.bankCardIcon]}>
                        <Text style={styles.bankCardIconText}>
                          {bankCard.bankName ? bankCard.bankName.charAt(0) : '卡'}
                        </Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountTypeText}>
                          银行卡 {bankCard.bankName ? `· ${bankCard.bankName}` : ''}
                        </Text>
                        <Text style={styles.accountAddressText}>
                          {maskCardToken(bankCard.cardToken)}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Text style={styles.accountArrow}>✓</Text>
                      ) : (
                        <Text style={styles.accountArrow}>›</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {multiSelectMode && selectingCurrency && (
            <TouchableOpacity
              style={[styles.payBtn, (!Array.isArray(selectedPayCardIds) || selectedPayCardIds.length === 0) && styles.payBtnDisabled]}
              disabled={!Array.isArray(selectedPayCardIds) || selectedPayCardIds.length === 0}
              onPress={() => {
                const first = Array.isArray(selectedPayCardIds) ? selectedPayCardIds[0] : '';
                if (first) setSelectedCardId(String(first));
                setUseMultiAccountPayment(Array.isArray(selectedPayCardIds) && selectedPayCardIds.length > 1);
                if (selectingCurrency) {
                  setSelectingTokenSymbol(selectingCurrency);
                }
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
                    const balancesById = useMultiChain
                      ? Object.fromEntries(
                        await Promise.all(
                          finalIds.map(async (id) => {
                            const v = await getBalanceValue(String(id));
                            return [String(id), v] as const;
                          })
                        )
                      )
                      : {};
                    const transferInfos = useMultiChain ? buildTransferInfos(finalIds, txAmountValue, balancesById) : [];
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
                      // 判断是否是多链支付：检查返回数据中是否有 orderInfos 数组
                      const orderInfos = d?.orderInfos;
                      const hasOrderInfosValue = Array.isArray(orderInfos) && orderInfos.length > 0;
                      const orderInfosLengthValue = Array.isArray(orderInfos) ? orderInfos.length : 0;
                      
                      // 保存到状态中，供支付成功界面使用
                      setHasOrderInfos(hasOrderInfosValue);
                      setOrderInfosLength(orderInfosLengthValue);
                      
                      console.log('Payment result check:', {
                        hasOrderInfos: hasOrderInfosValue,
                        orderInfosLength: orderInfosLengthValue,
                        orderInfos,
                      });
                      
                      if (hasOrderInfosValue) {
                        // 多链支付返回：data.orderInfos 是数组
                        setIsMultiChainPayment(true);
                        const mappedList = orderInfos.map((item: any) => {
                          // 从 tokenTransfers 中获取币种和金额信息
                          const tokenTransfer = Array.isArray(item?.tokenTransfers) && item.tokenTransfers.length > 0 
                            ? item.tokenTransfers[0] 
                            : null;
                          // 根据 primaryAccountNumber 查找对应的链类型
                          const card = cards.find((c) => String((c as any).cardToken) === String(item?.primaryAccountNumber ?? ''));
                          const chainType = card ? resolveChainType(card) : 'ETHEREUM';
                          return {
                            txHash: String(item?.txHash ?? ''),
                            status: String(item?.status ?? ''),
                            blockNumber: String(item?.blockNumber ?? ''),
                            timestamp: String(item?.timestamp ?? ''),
                            chainType: chainType,
                            primaryAccountNumber: String(item?.primaryAccountNumber ?? ''),
                            amount: String(tokenTransfer?.amount ?? item?.transactionAmount ?? '0'),
                            tokenSymbol: String(tokenTransfer?.tokenSymbol ?? selectingTokenSymbol ?? ''),
                            gasCost: String(item?.gasCost ?? '0'),
                            fromAddress: String(item?.fromAddress ?? ''),
                            toAddress: String(item?.toAddress ?? ''),
                            merchantId: String(item?.merchantId ?? factor?.merchantId ?? ''),
                            terminalId: String(item?.terminalId ?? factor?.terminalId ?? ''),
                            referenceNumber: String(item?.referenceNumber ?? factor?.referenceNumber ?? ''),
                            transactionAmount: String(item?.transactionAmount ?? ''),
                          };
                        });
                        console.log('Multi-chain payment mapped list:', mappedList);
                        setMultiChainTxns(mappedList);
                        // 设置第一个交易作为主要交易信息（用于显示基本信息）
                        if (mappedList.length > 0) {
                          setTxn({
                            ...mappedList[0],
                            merchantId: String(factor?.merchantId ?? ''),
                            terminalId: String(factor?.terminalId ?? ''),
                            referenceNumber: String(factor?.referenceNumber ?? ''),
                            transactionAmount: String(transactionAmount),
                          });
                        }
                        console.log('Set isMultiChainPayment to true, multiChainTxns count:', mappedList.length);
                      } else {
                        // 单链支付
                        setIsMultiChainPayment(false);
                        setMultiChainTxns([]);
                        setHasOrderInfos(false);
                        setOrderInfosLength(0);
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
                      }
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
        <View style={[styles.fullScreenMask, { justifyContent: 'flex-start', paddingTop: 40 }]}>
          <Text style={styles.successTitle}>支付成功</Text>

          <ScrollView style={{ flex: 1, alignSelf: 'stretch', marginTop: 24, maxHeight: '70%' }} showsVerticalScrollIndicator>
            {/* 基本信息 */}
            <View style={{ alignSelf: 'stretch' }}>
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
                <Text style={styles.sectionValue}>
                  {totalPay ? `$${totalPay}` : ''}
                </Text>
              </View>
            </View>

      
            {hasOrderInfos && orderInfosLength > 0 ? (
              <View style={{ marginTop: 20, alignSelf: 'stretch' }}>
                <Text style={[styles.sectionTitle, { marginBottom: 12, fontSize: 16, fontWeight: '700' }]}>
                  多链支付详情
                </Text>
                {multiChainTxns.map((chainTxn, index) => {
                  const card = cards.find((c) => String((c as any).cardToken) === String(chainTxn.primaryAccountNumber));
                  const chainName = card ? String(card?.chainName ?? '') : String(chainTxn.chainType ?? '');
                  return (
                    <View key={index} style={[styles.multiChainItem, { marginBottom: 16 }]}>
                      <View style={styles.multiChainItemHeader}>
                        <Text style={styles.multiChainItemTitle}>
                          交易 {index + 1} - {chainName}
                        </Text>
                      </View>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>账户</Text>
                        <Text style={styles.sectionValue}>
                          {maskCardToken(String(chainTxn.primaryAccountNumber ?? ''))}
                        </Text>
                      </View>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>币种</Text>
                        <Text style={styles.sectionValue}>{chainTxn.tokenSymbol ?? '-'}</Text>
                      </View>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>金额</Text>
                        <Text style={styles.sectionValue}>
                          {chainTxn.amount ? `${chainTxn.amount} ${chainTxn.tokenSymbol ?? ''}` : '-'}
                        </Text>
                      </View>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>交易哈希</Text>
                        <Text style={[styles.sectionValue, { fontSize: 11 }]}>
                          {chainTxn.txHash || '-'}
                        </Text>
                      </View>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>区块号</Text>
                        <Text style={styles.sectionValue}>{chainTxn.blockNumber ?? '-'}</Text>
                      </View>
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>区块时间</Text>
                        <Text style={styles.sectionValue}>{formatTimestamp(chainTxn.timestamp)}</Text>
                      </View>
                      {chainTxn.fromAddress && (
                        <View style={styles.sectionRow}>
                          <Text style={styles.sectionTitle}>发送地址</Text>
                          <Text style={[styles.sectionValue, { fontSize: 11 }]}>
                            {String(chainTxn.fromAddress).slice(0, 10)}...{String(chainTxn.fromAddress).slice(-8)}
                          </Text>
                        </View>
                      )}
                      {chainTxn.toAddress && (
                        <View style={styles.sectionRow}>
                          <Text style={styles.sectionTitle}>接收地址</Text>
                          <Text style={[styles.sectionValue, { fontSize: 11 }]}>
                            {String(chainTxn.toAddress).slice(0, 10)}...{String(chainTxn.toAddress).slice(-8)}
                          </Text>
                        </View>
                      )}
                      {chainTxn.gasCost && Number(chainTxn.gasCost) > 0 && (
                        <View style={styles.sectionRow}>
                          <Text style={styles.sectionTitle}>Gas费</Text>
                          <Text style={styles.sectionValue}>
                            {Number(chainTxn.gasCost).toFixed(4)} {chainTxn.tokenSymbol ?? ''}
                          </Text>
                        </View>
                      )}
                      <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>交易状态</Text>
                        <Text style={[styles.sectionValue, { color: chainTxn.status === 'success' ? '#2e7d32' : '#e53935' }]}>
                          {chainTxn.status === 'success' ? '成功' : chainTxn.status}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              /* 单链支付结果 */
              <View style={{ marginTop: 20, alignSelf: 'stretch' }}>
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
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.payBtn, { marginTop: 20, alignSelf: 'stretch' }]}
            onPress={() => {
              setPayStatus('idle');
              setIsMultiChainPayment(false);
              setMultiChainTxns([]);
              setHasOrderInfos(false);
              setOrderInfosLength(0);
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
    height: '60%',
    maxHeight: '60%',
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
  paymentAccountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  paymentAccountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chainIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
  },
  paymentAccountInfo: {
    flex: 1,
  },
  paymentAccountLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  paymentAccountAmount: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  paymentAccountTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  paymentAccountTotalLabel: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
  },
  paymentAccountTotalAmount: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
  },
  insufficientBalanceBox: {
    marginTop: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE58F',
  },
  insufficientBalanceContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insufficientBalanceIcon: {
    fontSize: 20,
    color: '#FF9800',
    marginRight: 8,
    marginTop: 2,
  },
  insufficientBalanceText: {
    flex: 1,
  },
  insufficientBalanceTitle: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
    marginBottom: 4,
  },
  insufficientBalanceDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  addAccountLink: {
    alignSelf: 'flex-start',
  },
  addAccountLinkText: {
    fontSize: 13,
    color: '#1890FF',
    fontWeight: '500',
  },
  // 支付账户选择模态框样式
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  paymentMethodTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  paymentMethodTab: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  paymentMethodTabActive: {
    // 激活状态样式
  },
  paymentMethodTabText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  paymentMethodTabTextActive: {
    color: '#1890FF',
    fontWeight: '600',
  },
  paymentMethodTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1890FF',
  },
  currencySelectionSection: {
    marginBottom: 24,
  },
  currencySelectionLabel: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
    marginBottom: 12,
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  currencyButtonSelected: {
    backgroundColor: '#E6F4FF',
    borderColor: '#1890FF',
  },
  currencyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  currencyIconUSDC: {
    backgroundColor: '#1890FF',
  },
  currencyIconUSDT: {
    backgroundColor: '#26A17B',
  },
  currencyIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  currencyButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  currencyButtonTextSelected: {
    color: '#1890FF',
    fontWeight: '600',
  },
  currencyCheckmark: {
    fontSize: 16,
    color: '#1890FF',
    fontWeight: '700',
  },
  accountSelectionSection: {
    marginBottom: 24,
  },
  accountSelectionLabel: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
    marginBottom: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  accountItemSelected: {
    backgroundColor: '#E6F4FF',
    borderColor: '#1890FF',
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainIconEthereum: {
    backgroundColor: '#627EEA',
  },
  chainIconDiamond: {
    transform: [{ rotate: '45deg' }],
  },
  chainIconArbitrum: {
    backgroundColor: '#28A0F0',
  },
  chainIconPolygon: {
    backgroundColor: '#8247E5',
  },
  chainIconDefault: {
    backgroundColor: '#f0f0f0',
  },
  chainIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  chainIconDiamondText: {
    transform: [{ rotate: '-45deg' }],
  },
  accountInfo: {
    flex: 1,
  },
  accountTypeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  accountAddressText: {
    fontSize: 12,
    color: '#666',
  },
  accountArrow: {
    fontSize: 20,
    color: '#999',
    marginLeft: 8,
  },
  bankCardSection: {
    paddingVertical: 20,
  },
  bankCardIcon: {
    backgroundColor: '#1890FF',
  },
  bankCardIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  multiChainItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  multiChainItemHeader: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  multiChainItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },

});

export default PaymentScreen;

import { FlashList } from '@shopify/flash-list';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { EmptyState, Loading, PageHeader } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { customerApi, listFrom } from '@/lib/api';
import { formatDateTime, rupees } from '@/lib/product';
import { color, font, shape, space, type } from '@/theme/tokens';

const isCredit = (t: any) => /credit|refund|cashback|add/i.test(String(t.type || t.direction || '')) || Number(t.amount) > 0;

export default function WalletScreen() {
  const { user, refreshUser } = useAuth();
  const [txns, setTxns] = useState<any[] | null>(null);

  useEffect(() => {
    refreshUser();
    customerApi
      .getWalletTransactions()
      .then((r) => {
        const data = r.data?.result;
        setTxns(Array.isArray(data?.transactions) ? data.transactions : listFrom(r.data));
      })
      .catch(() => setTxns([]));
  }, [refreshUser]);

  return (
    <View style={styles.screen}>
      <PageHeader title="Wallet">
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>{rupees(user?.walletBalance ?? 0)}</Text>
        </View>
      </PageHeader>
      {txns === null ? (
        <Loading />
      ) : (
        <FlashList
          data={txns}
          keyExtractor={(t, i) => String(t._id || i)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={txns.length ? <Text style={styles.heading}>Transactions</Text> : null}
          ListEmptyComponent={<EmptyState icon="wallet" title="No transactions yet" message="Refunds and cashback will appear here." />}
          renderItem={({ item }) => {
            const credit = isCredit(item);
            return (
              <View style={styles.txn}>
                <View style={[styles.txnIcon, { backgroundColor: credit ? color.primaryContainer : color.errorContainer }]}>
                  <Icon name={credit ? 'plus' : 'bag'} size={18} color={credit ? color.primary : color.error} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.txnTitle} numberOfLines={2}>
                    {item.description || item.reason || item.type || 'Transaction'}
                  </Text>
                  <Text style={styles.muted}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <Text style={[styles.amount, { color: credit ? color.primary : color.error }]}>
                  {credit ? '+' : '−'}
                  {rupees(Math.abs(Number(item.amount || 0)))}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  balance: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  balanceLabel: { ...type.bodySmall, color: color.onHeaderMuted },
  balanceValue: { fontFamily: font.display, fontSize: 32, color: '#ffffff' },
  list: { padding: space.lg },
  heading: { ...type.titleMedium, color: color.onSurface, marginBottom: space.md },
  txn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: shape.medium,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: color.outlineVariant,
  },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { ...type.labelLarge, color: color.onSurface },
  muted: { ...type.bodySmall, color: color.onSurfaceVariant },
  amount: { fontFamily: font.bodyBold, fontSize: 15 },
});

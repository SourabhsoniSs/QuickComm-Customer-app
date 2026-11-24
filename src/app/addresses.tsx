import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import { Button, Card, Chip, EmptyState, PageHeader, TextField } from '@/components/ui';
import { useDeliveryLocation, type SavedAddress } from '@/context/location';
import { useSnackbar } from '@/context/snackbar';
import { customerApi, errorMessage } from '@/lib/api';
import { color, font, shape, space, type } from '@/theme/tokens';

const EMPTY = { label: 'home', address: '', landmark: '', city: '', state: '', pincode: '' };

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar();
  const { savedAddresses, refreshAddresses, setLocation, currentLocation } = useDeliveryLocation();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<SavedAddress | null>(null);
  const [deleting, setDeleting] = useState(false);

  const raw = () => savedAddresses.map((a) => a.raw);

  const startAdd = () => {
    setEditing(null);
    setForm({
      ...EMPTY,
      address: currentLocation?.name || '',
      city: currentLocation?.city || '',
      state: currentLocation?.state || '',
      pincode: currentLocation?.pincode || '',
    });
    setOpen(true);
  };

  const startEdit = (a: SavedAddress) => {
    setEditing(a);
    setForm({
      label: String(a.raw?.label || 'home').toLowerCase(),
      address: a.raw?.fullAddress || a.address,
      landmark: a.raw?.landmark || '',
      city: a.raw?.city || '',
      state: a.raw?.state || '',
      pincode: a.raw?.pincode || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.address.trim()) return snackbar('Enter the address', 'error');
    setSaving(true);
    const next: any = {
      ...(editing?.raw || {}),
      label: form.label,
      fullAddress: form.address.trim(),
      landmark: form.landmark.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      pincode: form.pincode.trim() || undefined,
    };
    // Coordinates let checkout price delivery by distance (same as the website)
    try {
      const query = [form.address, form.landmark, form.city, form.state, form.pincode].filter(Boolean).join(', ');
      const geo = await customerApi.geocodeAddress(query);
      const loc = geo.data?.result?.location;
      if (Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng)) {
        next.location = { lat: loc.lat, lng: loc.lng };
        if (geo.data?.result?.placeId) next.placeId = geo.data.result.placeId;
      }
    } catch {
      if (!editing && currentLocation && form.address.trim() === currentLocation.name) {
        next.location = { lat: currentLocation.latitude, lng: currentLocation.longitude };
      }
    }
    try {
      const list = raw();
      const idx = editing ? savedAddresses.findIndex((a) => a.id === editing.id) : -1;
      const addresses = idx >= 0 ? list.map((a, i) => (i === idx ? next : a)) : [...list, next];
      await customerApi.updateProfile({ addresses });
      await refreshAddresses();
      setOpen(false);
      snackbar(editing ? 'Address updated' : 'Address saved', 'success');
    } catch (e) {
      snackbar(errorMessage(e, 'Could not save address'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = (a: SavedAddress) => setToDelete(a);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await customerApi.updateProfile({ addresses: raw().filter((_, i) => savedAddresses[i].id !== toDelete.id) });
      await refreshAddresses();
      snackbar('Address deleted');
    } catch (e) {
      snackbar(errorMessage(e, 'Could not delete address'), 'error');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const deliverHere = (a: SavedAddress) => {
    if (!a.location) return snackbar('This address has no map location. Edit and save it again.', 'error');
    setLocation({ name: a.address, city: a.raw?.city, state: a.raw?.state, pincode: a.raw?.pincode, latitude: a.location.lat, longitude: a.location.lng });
    snackbar('Delivery location updated', 'success');
  };

  return (
    <View style={styles.screen}>
      <PageHeader title="Saved addresses" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {savedAddresses.length === 0 ? (
          <EmptyState icon="pin" title="No saved addresses" message="Add an address for faster checkout." />
        ) : (
          savedAddresses.map((a) => (
            <Card key={a.id}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <Icon name={a.label.toLowerCase() === 'work' ? 'bag' : 'home'} size={18} color={color.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.label}>{a.label}</Text>
                  <Text style={styles.address}>{a.address}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable onPress={() => deliverHere(a)} style={styles.action}>
                  <Text style={styles.actionText}>Deliver here</Text>
                </Pressable>
                <Pressable onPress={() => startEdit(a)} style={styles.action}>
                  <Text style={styles.actionText}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => remove(a)} style={styles.action}>
                  <Text style={[styles.actionText, { color: color.error }]}>Delete</Text>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
      <View style={[styles.fabWrap, { bottom: insets.bottom + space.lg }]}>
        <Button label="Add new address" icon="plus" onPress={startAdd} />
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{editing ? 'Edit address' : 'Add address'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <View style={styles.chips}>
              {['home', 'work', 'other'].map((l) => (
                <Chip key={l} label={l[0].toUpperCase() + l.slice(1)} selected={form.label === l} onPress={() => setForm((f) => ({ ...f, label: l }))} />
              ))}
            </View>
            <TextField label="Address" multiline value={form.address} onChangeText={(address) => setForm((f) => ({ ...f, address }))} />
            <TextField label="House no. / Landmark" value={form.landmark} onChangeText={(landmark) => setForm((f) => ({ ...f, landmark }))} />
            <View style={styles.twoCol}>
              <View style={styles.flex}>
                <TextField label="City" value={form.city} onChangeText={(city) => setForm((f) => ({ ...f, city }))} />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Pincode"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={form.pincode}
                  onChangeText={(pincode) => setForm((f) => ({ ...f, pincode: pincode.replace(/\D/g, '') }))}
                />
              </View>
            </View>
            <TextField label="State" value={form.state} onChangeText={(state) => setForm((f) => ({ ...f, state }))} />
            <Button label="Save address" onPress={save} loading={saving} />
          </ScrollView>
        </View>
      </Modal>

      <ConfirmDialog
        visible={Boolean(toDelete)}
        icon="trash"
        title="Delete this address?"
        message={toDelete?.address}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  flex: { flex: 1, minWidth: 0 },
  content: { padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.titleSmall, color: color.onSurface },
  address: { ...type.bodySmall, color: color.onSurfaceVariant, marginTop: 2 },
  actions: { flexDirection: 'row', gap: space.lg, marginTop: space.sm, marginLeft: 48 },
  action: { minHeight: 40, justifyContent: 'center' },
  actionText: { fontFamily: font.bodyBold, fontSize: 13, color: color.primary },
  fabWrap: { position: 'absolute', left: space.lg, right: space.lg },
  scrim: { flex: 1, backgroundColor: color.scrim },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: shape.extraLarge,
    borderTopRightRadius: shape.extraLarge,
    paddingHorizontal: space.xl,
    maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: color.outline, marginVertical: space.md },
  sheetTitle: { ...type.headlineSmall, color: color.onSurface, marginBottom: space.md },
  form: { gap: space.md, paddingBottom: space.lg },
  chips: { flexDirection: 'row', gap: space.sm },
  twoCol: { flexDirection: 'row', gap: space.md },
});

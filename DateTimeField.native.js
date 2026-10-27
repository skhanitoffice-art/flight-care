import React, { useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DateTimeField({
  mode,
  icon,
  placeholder,
  value,
  selectedDate,
  maximumDate,
  locale,
  cancelLabel,
  doneLabel,
  onChangeDate,
  style,
}) {
  const [visible, setVisible] = useState(false);
  const [draftDate, setDraftDate] = useState(selectedDate);
  const openPicker = () => {
    setDraftDate(selectedDate);
    setVisible(true);
  };
  const handleChange = (event, date) => {
    if (event.type === 'dismissed') {
      setVisible(false);
      return;
    }
    if (!date) return;
    if (Platform.OS === 'ios') setDraftDate(date);
    else {
      onChangeDate(date);
      setVisible(false);
    }
  };
  const picker = (
    <DateTimePicker
      value={Platform.OS === 'ios' ? draftDate : selectedDate}
      mode={mode}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      locale={locale}
      is24Hour
      maximumDate={maximumDate}
      onChange={handleChange}
    />
  );

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        style={[styles.field, style]}
        onPress={openPicker}
      >
        <View style={styles.icon}><Text style={styles.iconText}>{icon}</Text></View>
        <Text style={[styles.value, !value && styles.placeholder]}>{value || placeholder}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>
      {Platform.OS === 'android' && visible ? picker : null}
      {Platform.OS === 'ios' && <Modal transparent animationType="slide" visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setVisible(false)} accessibilityLabel={cancelLabel} />
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setVisible(false)} accessibilityRole="button"><Text style={styles.cancel}>{cancelLabel}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { onChangeDate(draftDate); setVisible(false); }} accessibilityRole="button"><Text style={styles.done}>{doneLabel}</Text></TouchableOpacity>
            </View>
            {picker}
          </View>
        </View>
      </Modal>}
    </>
  );
}

const styles = {
  field: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginTop: 0,
    paddingLeft: 18,
    paddingRight: 18,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  icon: { width: 32, height: 32, flexShrink: 0, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconText: { color: '#7C3AED', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  value: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '500' },
  placeholder: { color: '#94A3B8', fontWeight: '400' },
  chevron: { color: '#8B5CF6', fontSize: 18, marginLeft: 8 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 27, 45, 0.42)' },
  backdrop: { ...({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }) },
  pickerCard: { paddingBottom: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5EBF1' },
  cancel: { color: '#607286', fontSize: 16, fontWeight: '600' },
  done: { color: '#7C3AED', fontSize: 16, fontWeight: '800' },
};

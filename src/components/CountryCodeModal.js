import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { COUNTRIES } from '../constants/countries';
import { convertBnDigitsToEn } from '../utils/helpers';

export default function CountryCodeModal({
  visible,
  onClose,
  onSelect,
  selectedCode = '+880',
  lang = 0,
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = convertBnDigitsToEn(search.trim().toLowerCase());
    return COUNTRIES.filter(
      c =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameBn.toLowerCase().includes(q) ||
        c.dial.toLowerCase().includes(q) ||
        c.dial.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            width: '100%',
            maxWidth: 440,
            maxHeight: '85%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
                {lang === 1 ? 'কান্ট্রি কোড নির্বাচন করুন' : 'Select Country Code'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                {lang === 1 ? 'পৃথিবীর সকল দেশের ডায়াল কোড' : 'Dialing codes for all countries'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F1F5F9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748B' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
            <View
              style={{
                height: 44,
                borderWidth: 1.5,
                borderColor: '#CBD5E1',
                borderRadius: 12,
                backgroundColor: '#F8FAFC',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 15, color: '#64748B' }}>🔍</Text>
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#0F172A',
                  padding: 0,
                  outlineStyle: 'none',
                }}
                placeholder={
                  lang === 1 ? 'দেশ বা কোড লিখুন (যেমন: +971, India)...' : 'Search country or code (e.g. +971, India)...'
                }
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={{ fontSize: 14, color: '#94A3B8', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Countries List */}
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 12 }}
            contentContainerStyle={{ paddingVertical: 6 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {filteredCountries.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>🌍</Text>
                <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '600' }}>
                  {lang === 1 ? 'কোনো দেশ খুঁজে পাওয়া যায়নি' : 'No country found'}
                </Text>
              </View>
            ) : (
              filteredCountries.map(country => {
                const normSelected = String(selectedCode || '').trim();
                const isSelected = normSelected === country.dial || normSelected === country.code;
                return (
                  <TouchableOpacity
                    key={`${country.code}-${country.dial}`}
                    activeOpacity={0.7}
                    onPress={() => {
                      const normalizedCountry = {
                        ...country,
                        dial: country.dial,
                        dial_code: country.dial,
                        dialCode: country.dial,
                      };
                      onSelect(normalizedCountry);
                      onClose();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                      borderWidth: isSelected ? 1 : 0,
                      borderColor: '#0284C7',
                      marginBottom: 4,
                      gap: 12,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{country.flag}</Text>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: isSelected ? '800' : '600',
                          color: '#0F172A',
                        }}
                      >
                        {lang === 1 ? country.nameBn : country.nameEn}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                        {lang === 1 ? country.nameEn : country.nameBn} ({country.code})
                      </Text>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: isSelected ? '#0284C7' : '#F1F5F9',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: isSelected ? '#FFFFFF' : '#334155',
                        }}
                      >
                        {country.dial}
                      </Text>
                    </View>

                    {isSelected && (
                      <Text style={{ fontSize: 14, color: '#0284C7', fontWeight: '900' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


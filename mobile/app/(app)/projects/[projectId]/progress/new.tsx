import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDailyProgressApi, createDailyProgressApi } from '@/api/progress-api';
import { DailyProgressItemRef, DailyProgressEntry } from '@/progress/progress-types';

export default function NewDailyProgressScreen() {
  const { projectId, wbsId, wbsCode, wbsName, unit, designQuantity } = useLocalSearchParams<{
    projectId: string;
    wbsId?: string;
    wbsCode?: string;
    wbsName?: string;
    unit?: string;
    designQuantity?: string;
  }>();

  const router = useRouter();

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [entryDate, setEntryDate] = useState(todayStr);
  const [quantityInput, setQuantityInput] = useState('');
  const [note, setNote] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [proposalNote, setProposalNote] = useState('');

  // Item resolution state
  const [availableItems, setAvailableItems] = useState<DailyProgressItemRef[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(wbsId || null);
  const [resolvedTemplateId, setResolvedTemplateId] = useState<string | null>(null);

  const [loadingItems, setLoadingItems] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjectContext() {
      if (!projectId) return;
      setLoadingItems(true);
      try {
        const historyRes = await getDailyProgressApi(projectId, 1, 50);
        const extractedItems: DailyProgressItemRef[] = [];
        const itemIds = new Set<string>();

        historyRes.items.forEach((entry: DailyProgressEntry) => {
          if (entry.item && !itemIds.has(entry.item.id)) {
            itemIds.add(entry.item.id);
            extractedItems.push(entry.item);
          }
        });

        setAvailableItems(extractedItems);

        // If a specific wbsId was passed from tree navigation
        if (wbsId) {
          setSelectedItemId(wbsId);
        } else if (extractedItems.length > 0) {
          setSelectedItemId(extractedItems[0].id);
        }
      } catch (err) {
        console.warn('Could not prefetch daily items:', err);
      } finally {
        setLoadingItems(false);
      }
    }

    loadProjectContext();
  }, [projectId, wbsId]);

  const handleSubmit = async () => {
    setErrorMessage(null);

    // 1. Validate quantity
    const normalizedQtyStr = quantityInput.replace(',', '.').trim();
    if (!normalizedQtyStr) {
      setErrorMessage('Vui lòng nhập khối lượng thi công.');
      return;
    }

    const numQty = parseFloat(normalizedQtyStr);
    if (isNaN(numQty) || numQty < 0) {
      setErrorMessage('Khối lượng ghi nhận phải là số thực lớn hơn hoặc bằng 0.');
      return;
    }

    // 2. Validate entry date
    if (!entryDate || !/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      setErrorMessage('Ngày ghi nhận phải đúng định dạng YYYY-MM-DD (Ví dụ: 2026-08-12).');
      return;
    }

    const targetItemId = selectedItemId || wbsId;
    if (!targetItemId) {
      setErrorMessage('Vui lòng chọn hạng mục công việc ghi nhận.');
      return;
    }

    const targetTemplateId = resolvedTemplateId || 'cmspqa0t40005z8k5x79hifya'; // Fallback to project template ID

    setSubmitting(true);
    try {
      await createDailyProgressApi(projectId, {
        templateId: targetTemplateId,
        itemId: targetItemId,
        entryDate,
        quantity: numQty,
        note: note.trim() || undefined,
        issueNote: issueNote.trim() || undefined,
        proposalNote: proposalNote.trim() || undefined,
      });

      Alert.alert('Thành công', 'Đã ghi nhận tiến độ thi công thành công!', [
        {
          text: 'Đồng ý',
          onPress: () => router.replace(`/projects/${projectId}/progress` as any),
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo bản ghi nhật ký tiến độ.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentWorkName = wbsName || (availableItems.find((i) => i.id === selectedItemId)?.workContent ?? 'Hạng mục thi công');
  const currentWorkCode = wbsCode || (availableItems.find((i) => i.id === selectedItemId)?.code ?? 'HM-WBS');
  const currentUnit = unit || (availableItems.find((i) => i.id === selectedItemId)?.unit ?? 'm³');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Hủy bỏ</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ghi nhận tiến độ ngày</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {/* Target Item Card */}
          <View style={styles.targetCard}>
            <View style={styles.codeTag}>
              <Text style={styles.codeTagText}>{currentWorkCode}</Text>
            </View>
            <Text style={styles.targetTitle}>{currentWorkName}</Text>
            <View style={styles.targetMetaRow}>
              <Text style={styles.targetMetaText}>
                Đơn vị tính: <Text style={styles.metaBold}>{currentUnit}</Text>
              </Text>
              {designQuantity ? (
                <Text style={styles.targetMetaText}>
                  Khối lượng TK: <Text style={styles.metaBold}>{designQuantity} {currentUnit}</Text>
                </Text>
              ) : null}
            </View>
          </View>

          {/* Item Selector if multiple items available */}
          {availableItems.length > 1 && !wbsId && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Chọn hạng mục công việc (*)</Text>
              <View style={styles.itemPickerContainer}>
                {availableItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.itemChip,
                      selectedItemId === item.id && styles.itemChipSelected,
                    ]}
                    onPress={() => setSelectedItemId(item.id)}
                  >
                    <Text
                      style={[
                        styles.itemChipText,
                        selectedItemId === item.id && styles.itemChipTextSelected,
                      ]}
                    >
                      {item.code} - {item.workContent}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Date Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ngày ghi nhận (YYYY-MM-DD) (*)</Text>
            <TextInput
              style={styles.input}
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="2026-08-12"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>

          {/* Quantity Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Khối lượng thi công trong ngày ({currentUnit}) (*)</Text>
            <TextInput
              style={[styles.input, styles.qtyInput]}
              value={quantityInput}
              onChangeText={setQuantityInput}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Note Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ghi chú công việc hiện trường</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Nhập chi tiết vị trí thi công, nhân lực, máy móc..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Issue Note Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ghi chú vướng mắc / Sự cố (nếu có)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={issueNote}
              onChangeText={setIssueNote}
              placeholder="Thời tiết, vật tư chậm, mặt bằng..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Proposal Note Input */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Đề xuất xử lý (nếu có)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={proposalNote}
              onChangeText={setProposalNote}
              placeholder="Đề xuất kiến nghị ban chỉ huy..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Error display */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Gửi báo cáo tiến độ</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  formContent: {
    padding: 16,
  },
  targetCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  codeTag: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  codeTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  targetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    lineHeight: 22,
  },
  targetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  targetMetaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  metaBold: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  qtyInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0284c7',
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 64,
  },
  itemPickerContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  itemChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  itemChipSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  itemChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  itemChipTextSelected: {
    color: '#0369a1',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});

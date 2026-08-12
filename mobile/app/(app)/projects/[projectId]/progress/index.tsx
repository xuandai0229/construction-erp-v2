import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getWbsApi } from '@/api/wbs-api';
import { getDailyProgressApi } from '@/api/progress-api';
import { WbsItem } from '@/wbs/wbs-types';
import { DailyProgressEntry } from '@/progress/progress-types';

export default function ProgressMainScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'WBS' | 'HISTORY'>('WBS');
  const [wbsItems, setWbsItems] = useState<WbsItem[]>([]);
  const [historyEntries, setHistoryEntries] = useState<DailyProgressEntry[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!projectId) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        if (activeTab === 'WBS') {
          const items = await getWbsApi(projectId);
          setWbsItems(items);
          // Expand all parent nodes by default
          const initialExpanded: Record<string, boolean> = {};
          items.forEach((item) => {
            if (!item.parentId) initialExpanded[item.id] = true;
          });
          setExpandedNodes((prev) => ({ ...initialExpanded, ...prev }));
        } else {
          const res = await getDailyProgressApi(projectId, 1, 50);
          setHistoryEntries(res.items);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể tải dữ liệu tiến độ.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId, activeTab]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleCreateProgress = (wbs: WbsItem) => {
    router.push({
      pathname: `/projects/${projectId}/progress/new` as any,
      params: {
        wbsId: wbs.id,
        wbsCode: wbs.code,
        wbsName: wbs.name,
        unit: wbs.unit || '',
        designQuantity: wbs.designQuantity ? String(wbs.designQuantity) : '',
      },
    });
  };

  // Build tree from flat items
  const parentMap: Record<string, WbsItem[]> = {};
  const rootItems: WbsItem[] = [];
  const allParentIds = new Set(wbsItems.map((i: WbsItem) => i.parentId).filter(Boolean));

  wbsItems.forEach((item) => {
    if (!item.parentId) {
      rootItems.push(item);
    } else {
      if (!parentMap[item.parentId]) parentMap[item.parentId] = [];
      parentMap[item.parentId].push(item);
    }
  });

  const renderWbsRow = (item: WbsItem, depth = 0) => {
    const isParent = allParentIds.has(item.id);
    const children = parentMap[item.id] || [];
    const isExpanded = !!expandedNodes[item.id];

    return (
      <View key={item.id} style={styles.wbsItemWrapper}>
        <View
          style={[
            styles.wbsCard,
            { marginLeft: depth * 14 },
            isParent ? styles.wbsParentCard : styles.wbsLeafCard,
          ]}
        >
          <View style={styles.wbsCardHeader}>
            <View style={styles.wbsCodeBadge}>
              <Text style={styles.wbsCodeText}>{item.code}</Text>
            </View>
            <View style={styles.statusTag}>
              <Text style={styles.statusTagText}>
                {item.status === 'IN_PROGRESS'
                  ? 'Đang thực hiện'
                  : item.status === 'COMPLETED'
                  ? 'Hoàn thành'
                  : 'Kế hoạch'}
              </Text>
            </View>
          </View>

          <Text style={styles.wbsName}>{item.name}</Text>

          {item.unit && item.designQuantity !== null && (
            <View style={styles.wbsMetaRow}>
              <Text style={styles.wbsMetaText}>
                Khối lượng thiết kế: <Text style={styles.metaHighlight}>{item.designQuantity} {item.unit}</Text>
              </Text>
              <Text style={styles.wbsMetaText}>
                Tiến độ: <Text style={styles.metaHighlight}>{item.progressPercent}%</Text>
              </Text>
            </View>
          )}

          <View style={styles.wbsCardFooter}>
            {isParent ? (
              <TouchableOpacity
                style={styles.expandToggleBtn}
                onPress={() => toggleExpand(item.id)}
              >
                <Text style={styles.expandToggleText}>
                  {isExpanded ? '▼ Thu gọn danh mục' : `▶ Mở rộng (${children.length} hạng mục con)`}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.recordActionBtn}
                onPress={() => handleCreateProgress(item)}
              >
                <Text style={styles.recordActionText}>+ Nhập tiến độ khối lượng</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isParent && isExpanded && children.map((child) => renderWbsRow(child, depth + 1))}
      </View>
    );
  };

  const renderHistoryItem = ({ item }: { item: DailyProgressEntry }) => {
    const formattedDate = new Date(item.entryDate).toLocaleDateString('vi-VN');
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.historyItemBadge}>
            <Text style={styles.historyItemCode}>{item.item?.code || 'NHẬT KÝ'}</Text>
          </View>
          <Text style={styles.historyDate}>{formattedDate}</Text>
        </View>

        <Text style={styles.historyWorkContent}>{item.item?.workContent || 'Nhật ký khối lượng hiện trường'}</Text>

        <View style={styles.historyQtyBox}>
          <Text style={styles.historyQtyLabel}>Khối lượng ghi nhận:</Text>
          <Text style={styles.historyQtyValue}>
            {item.quantity} {item.item?.unit || ''}
          </Text>
        </View>

        {item.note && (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Ghi chú:</Text>
            <Text style={styles.noteContent}>{item.note}</Text>
          </View>
        )}

        <View style={styles.historyFooter}>
          <Text style={styles.authorText}>
            Người nhập: <Text style={styles.authorName}>{item.createdBy?.name || 'Cán bộ hiện trường'}</Text>
          </Text>
          <View
            style={[
              styles.entryStatusBadge,
              item.status === 'APPROVED'
                ? styles.bgApproved
                : item.status === 'SUBMITTED'
                ? styles.bgSubmitted
                : styles.bgDraft,
            ]}
          >
            <Text
              style={[
                styles.entryStatusText,
                item.status === 'APPROVED'
                  ? styles.textApproved
                  : item.status === 'SUBMITTED'
                  ? styles.textSubmitted
                  : styles.textDraft,
              ]}
            >
              {item.status === 'APPROVED'
                ? 'Đã duyệt'
                : item.status === 'SUBMITTED'
                ? 'Chờ duyệt'
                : 'Bản nháp'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Bảng điều khiển</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tiến độ thi công công trình</Text>
        </View>

        {/* Tab Selection Bar */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'WBS' && styles.activeTabButton]}
            onPress={() => setActiveTab('WBS')}
          >
            <Text style={[styles.tabText, activeTab === 'WBS' && styles.activeTabText]}>
              Cấu trúc công việc (WBS)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'HISTORY' && styles.activeTabButton]}
            onPress={() => setActiveTab('HISTORY')}
          >
            <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.activeTabText]}>
              Nhật ký đã ghi nhận
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Đang nạp dữ liệu tiến độ...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'WBS' ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#0284c7']} />
            }
          >
            {rootItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>Chưa có cấu trúc WBS</Text>
                <Text style={styles.emptySub}>Công trình này chưa khởi tạo cấu trúc hạng mục công việc.</Text>
              </View>
            ) : (
              rootItems.map((item) => renderWbsRow(item, 0))
            )}
          </ScrollView>
        ) : (
          <FlatList
            data={historyEntries}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={['#0284c7']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>Chưa có nhật ký nào</Text>
                <Text style={styles.emptySub}>Chưa có bản ghi tiến độ thi công nào được cập nhật.</Text>
              </View>
            }
          />
        )}
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
  },
  backBtn: {
    marginBottom: 6,
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  wbsItemWrapper: {
    marginBottom: 10,
  },
  wbsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  wbsParentCard: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  wbsLeafCard: {
    backgroundColor: '#ffffff',
  },
  wbsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wbsCodeBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  wbsCodeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTagText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  wbsName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 20,
  },
  wbsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  wbsMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  metaHighlight: {
    fontWeight: '700',
    color: '#0f172a',
  },
  wbsCardFooter: {
    marginTop: 4,
  },
  expandToggleBtn: {
    paddingVertical: 6,
  },
  expandToggleText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
  },
  recordActionBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  recordActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  historyItemCode: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  historyWorkContent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  historyQtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  historyQtyLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 8,
  },
  historyQtyValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284c7',
  },
  noteBox: {
    marginBottom: 10,
  },
  noteLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  noteContent: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  authorText: {
    fontSize: 12,
    color: '#64748b',
  },
  authorName: {
    fontWeight: '600',
    color: '#334155',
  },
  entryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bgApproved: { backgroundColor: '#dcfce7' },
  bgSubmitted: { backgroundColor: '#fef3c7' },
  bgDraft: { backgroundColor: '#f1f5f9' },
  entryStatusText: { fontSize: 11, fontWeight: '700' },
  textApproved: { color: '#166534' },
  textSubmitted: { color: '#92400e' },
  textDraft: { color: '#475569' },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});

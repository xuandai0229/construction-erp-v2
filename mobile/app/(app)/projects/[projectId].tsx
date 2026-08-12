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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProjectDashboardApi } from '../../../src/api/projects-api';
import { ProjectDashboardData } from '../../../src/project/project-types';
import { useProject } from '../../../src/project/project-context';

export default function ProjectHomeScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const { selectedProject, clearProject } = useProject();

  const [dashboardData, setDashboardData] = useState<ProjectDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      if (!projectId) return;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        const data = await getProjectDashboardApi(projectId);
        setDashboardData(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể tải thông tin bảng điều khiển công trình.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleBackToProjects = () => {
    clearProject();
    router.replace('/projects' as any);
  };

  const project = dashboardData?.project || selectedProject;
  const metrics = dashboardData?.metrics;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={handleBackToProjects} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Tất cả công trình</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Đang nạp dữ liệu công trình...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDashboard()}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackToProjects}>
              <Text style={styles.secondaryBtnText}>Quay lại danh sách</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} colors={['#0284c7']} />
            }
          >
            {/* Project Header Banner */}
            <View style={styles.headerCard}>
              <View style={styles.codeTag}>
                <Text style={styles.codeTagText}>{project?.code || 'PROJECT'}</Text>
              </View>
              <Text style={styles.projectTitle}>{project?.name}</Text>
              <Text style={styles.projectStatus}>
                Trạng thái: <Text style={styles.statusHighlight}>{project?.status || 'Đang thi công'}</Text>
              </Text>
            </View>

            {/* Metrics Dashboard Overview */}
            <Text style={styles.sectionTitle}>TỔNG QUAN VẬN HÀNH</Text>

            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { borderLeftColor: '#0284c7' }]}>
                <Text style={styles.metricValue}>{metrics?.totalWbsItems ?? 0}</Text>
                <Text style={styles.metricLabel}>Hạng mục WBS</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
                <Text style={styles.metricValue}>{metrics?.totalDailyLogs ?? 0}</Text>
                <Text style={styles.metricLabel}>Nhật ký thi công</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#f59e0b' }]}>
                <Text style={styles.metricValue}>{metrics?.pendingProposals ?? 0}</Text>
                <Text style={styles.metricLabel}>Đề xuất vật tư chờ duyệt</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
                <Text style={styles.metricValue}>{metrics?.pendingApprovals ?? 0}</Text>
                <Text style={styles.metricLabel}>Tờ trình cần phê duyệt</Text>
              </View>

              <View style={[styles.metricCard, { borderLeftColor: '#ec4899', width: '100%' }]}>
                <Text style={styles.metricValue}>{metrics?.activePersonnel ?? 0}</Text>
                <Text style={styles.metricLabel}>Nhân sự đang có mặt trên công trường</Text>
              </View>
            </View>

            {/* Quick Action Navigation */}
            <Text style={styles.sectionTitle}>NGHIỆP VỤ HIỆN TRƯỜNG</Text>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/projects/${projectId}/progress` as any)}
            >
              <View style={styles.actionCardIconBox}>
                <Text style={styles.actionCardIconText}>📊</Text>
              </View>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>Tiến độ thi công</Text>
                <Text style={styles.actionCardSub}>Xem WBS công trình & ghi nhận nhật ký khối lượng</Text>
              </View>
              <Text style={styles.actionCardArrow}>→</Text>
            </TouchableOpacity>
          </ScrollView>
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
  topNav: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  codeTag: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  codeTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    lineHeight: 24,
  },
  projectStatus: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statusHighlight: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
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
    marginBottom: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionCardIconText: {
    fontSize: 20,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  actionCardSub: {
    fontSize: 12,
    color: '#64748b',
  },
  actionCardArrow: {
    fontSize: 18,
    color: '#0284c7',
    fontWeight: '700',
    marginLeft: 8,
  },
});

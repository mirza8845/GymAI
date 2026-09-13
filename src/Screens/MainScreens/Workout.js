// screens/Statistics.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import FontAwesome6 from "react-native-vector-icons/FontAwesome6";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import LinearGradient from "react-native-linear-gradient";
import { Colors, Fonts } from "../../constants/theme";
import { useSelector } from "react-redux";
import auth from "@react-native-firebase/auth";
import { WorkoutHistoryService } from "../../services/firebaseWorkoutHistory";
import { format } from "date-fns";

const { width } = Dimensions.get("window");

const Workouts = () => {
  const workoutPlan = useSelector((state) => state.workout.workoutPlan);
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [selectedMetric, setSelectedMetric] = useState("strength");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [workoutStats, setWorkoutStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [muscleGroupData, setMuscleGroupData] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState([]);
  const [strengthProgressData, setStrengthProgressData] = useState(null);
  const [periodStats, setPeriodStats] = useState(null);

  const userId = auth().currentUser?.uid;

  // Load workout history data
  const loadWorkoutData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const [history, stats, periodData] = await Promise.all([
        WorkoutHistoryService.getUserWorkoutHistory(userId, 50),
        WorkoutHistoryService.getUserWorkoutStats(userId),
        WorkoutHistoryService.getPeriodStats(userId, selectedPeriod),
      ]);

      setWorkoutHistory(history.workouts || []);
      setWorkoutStats(stats);
      setPeriodStats(periodData);

      // Process data for charts
      processChartData(periodData);
      processMuscleGroupData(stats);
      processPerformanceMetrics(stats);
      processStrengthProgress(history.workouts || []);
    } catch (error) {
      console.log("Error loading workout data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkoutData();
  }, [userId, selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkoutData();
  };

  // Process data for weekly chart
  const processChartData = (periodData) => {
    if (!periodData || !periodData.dailyData) {
      setWeeklyData(null);
      return;
    }

    const labels = periodData.dailyData.map((item) => {
      const date = new Date(item.date);
      if (selectedPeriod === "week") {
        return format(date, "ddd");
      } else if (selectedPeriod === "month") {
        return format(date, "DD");
      } else {
        return format(date, "MMM");
      }
    });

    const data = periodData.dailyData.map((item) => item.workouts || 0);

    setWeeklyData({
      labels: labels.slice(-7), // Show last 7 items
      datasets: [
        {
          data: data.slice(-7),
          color: (opacity = 1) => `rgba(243, 78, 58, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    });
  };

  // Process muscle group data
  const processMuscleGroupData = (stats) => {
    if (!stats || !stats.muscleGroups) {
      setMuscleGroupData([]);
      return;
    }

    const muscleGroups = stats.muscleGroups;
    const colors = [
      "#F34E3A",
      "#F17C3B",
      "#FF9F45",
      "#FFB74D",
      "#FFD95A",
      "#E6B325",
    ];
    let colorIndex = 0;

    const pieData = Object.entries(muscleGroups)
      .filter(([_, percentage]) => percentage > 0)
      .map(([name, percentage]) => ({
        name,
        population: percentage,
        color: colors[colorIndex++ % colors.length],
        legendFontColor: "#fff",
      }));

    setMuscleGroupData(pieData);
  };

  // Process performance metrics
  const processPerformanceMetrics = (stats) => {
    if (!stats) {
      setPerformanceMetrics([]);
      return;
    }

    // Calculate consistency based on last 30 days
    const consistency =
      stats.last7DaysWorkouts > 0
        ? Math.min(100, Math.round((stats.last7DaysWorkouts / 7) * 100))
        : 0;

    // Determine intensity based on average duration
    let intensityValue = "Low";
    let intensityTrend = "↓";
    if (stats.avgWorkoutDuration / 60 > 60) {
      intensityValue = "Very High";
      intensityTrend = "↑↑";
    } else if (stats.avgWorkoutDuration / 60 > 45) {
      intensityValue = "High";
      intensityTrend = "↑";
    } else if (stats.avgWorkoutDuration / 60 > 30) {
      intensityValue = "Medium";
      intensityTrend = "→";
    }

    // Calculate average rest time (placeholder - you might want to calculate this from actual data)
    const avgRestTime = "Not recorded";

    // PR count (placeholder - you might want to track actual PRs)
    const prCount = stats.currentStreak >= 5 ? 1 : 0;

    const metrics = [
      {
        icon: "fire",
        label: "Workout Intensity",
        value: intensityValue,
        color: Colors.primary,
        trend: intensityTrend,
      },
      {
        icon: "clock",
        label: "Avg Rest Time",
        value: avgRestTime,
        color: Colors.info,
        trend: "",
      },
      {
        icon: "repeat",
        label: "Consistency",
        value: `${consistency}%`,
        color: Colors.success,
        trend:
          consistency > 70
            ? "↑ Excellent"
            : consistency > 50
            ? "→ Good"
            : "↓ Needs Work",
      },
      {
        icon: "trophy",
        label: "Current Streak",
        value: `${stats.currentStreak} days`,
        color: Colors.warning,
        trend: stats.currentStreak > 0 ? "🔥" : "Start Today",
      },
    ];

    setPerformanceMetrics(metrics);
  };

  // Process strength progress data
  const processStrengthProgress = (workouts) => {
    if (!workouts || workouts.length === 0) {
      setStrengthProgressData({
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          {
            data: [0, 0, 0, 0],
            color: (opacity = 1) => `rgba(243, 78, 58, ${opacity})`,
          },
        ],
      });
      return;
    }

    // Group workouts by week for the last 4 weeks
    const now = new Date();
    const weeklyTotals = [0, 0, 0, 0]; // Last 4 weeks

    workouts.forEach((workout) => {
      if (workout.completedAt) {
        const workoutDate = workout.completedAt;
        const weeksAgo = Math.floor(
          (now - workoutDate) / (7 * 24 * 60 * 60 * 1000),
        );

        if (weeksAgo >= 0 && weeksAgo < 4) {
          weeklyTotals[weeksAgo] += workout.totalWeight || 0;
        }
      }
    });

    // Reverse to show oldest to newest
    weeklyTotals.reverse();

    setStrengthProgressData({
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      datasets: [
        {
          data: weeklyTotals,
          color: (opacity = 1) => `rgba(243, 78, 58, ${opacity})`,
        },
      ],
    });
  };

  // Get completion percentage from workout plan
  const getCompletionStats = () => {
    if (!workoutPlan)
      return { percentComplete: 0, completedDays: 0, totalDays: 0 };

    const dailyWorkouts = workoutPlan?.daily_workouts || {};
    const days = Object.keys(dailyWorkouts).filter(day => dailyWorkouts[day]?.length > 0);
    const totalDays = days.length;
    const completedDays = new Set(workoutHistory.filter(workout =>
      workout.planId === workoutPlan.planId && workoutPlan.planId && workout.completionStatus === 'completed' && days.includes(workout.day)
    ).map(workout => workout.day)).size;

    const percentComplete =
      totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    return { percentComplete, completedDays, totalDays };
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return "0m";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format weight
  const formatWeight = (weight) => {
    if (!weight) return "0kg";
    return `${Math.round(weight)}kg`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { percentComplete, completedDays, totalDays } = getCompletionStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout Analytics</Text>
          <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {["week", "month", "year"].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={[styles.summaryCard, styles.summaryCardLarge]}
          >
            <View style={styles.summaryCardHeader}>
              <FontAwesome5
                name="chart-line"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.summaryCardTitle}>Overall Progress</Text>
            </View>
            <Text style={styles.summaryCardValue}>{percentComplete}%</Text>
            <Text style={styles.summaryCardSubtext}>
              <Text style={styles.highlight}>{completedDays}</Text> of{" "}
              {totalDays} days completed
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${percentComplete}%` }]}
              />
            </View>
          </LinearGradient>

          <View style={styles.summarySmallRow}>
            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.summaryCard}
            >
              <View style={styles.summaryCardHeader}>
                <FontAwesome5
                  name="dumbbell"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.summaryCardTitle}>Total Weight</Text>
              </View>
              <Text style={styles.summaryCardValue}>
                {workoutStats?.totalWeightLifted
                  ? formatWeight(workoutStats.totalWeightLifted)
                  : "0kg"}
              </Text>
              <Text style={styles.summaryCardSubtext}>Lifted</Text>
            </LinearGradient>

            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.summaryCard}
            >
              <View style={styles.summaryCardHeader}>
                <MaterialCommunityIcons
                  name="fire"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.summaryCardTitle}>Calories</Text>
              </View>
              <Text style={styles.summaryCardValue}>
                {workoutStats?.totalCaloriesBurned || 0}
              </Text>
              <Text style={styles.summaryCardSubtext}>Burned</Text>
            </LinearGradient>
          </View>

          <View style={styles.summarySmallRow}>
            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.summaryCard}
            >
              <View style={styles.summaryCardHeader}>
                <FontAwesome5 name="clock" size={16} color={Colors.primary} />
                <Text style={styles.summaryCardTitle}>Time</Text>
              </View>
              <Text style={styles.summaryCardValue}>
                {workoutStats?.totalDuration
                  ? formatDuration(workoutStats.totalDuration)
                  : "0m"}
              </Text>
              <Text style={styles.summaryCardSubtext}>Total</Text>
            </LinearGradient>

            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.summaryCard}
            >
              <View style={styles.summaryCardHeader}>
                <FontAwesome6
                  name="ranking-star"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.summaryCardTitle}>Streak</Text>
              </View>
              <Text style={styles.summaryCardValue}>
                {workoutStats?.currentStreak || 0}🔥
              </Text>
              <Text style={styles.summaryCardSubtext}>Days</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Workout Frequency Graph */}
        {weeklyData && weeklyData.labels && weeklyData.labels.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedPeriod === "week"
                  ? "Weekly Workouts"
                  : selectedPeriod === "month"
                  ? "Monthly Workouts"
                  : "Workout Frequency"}
              </Text>
            </View>

            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.chartCard}
            >
              <LineChart
                data={weeklyData}
                width={width - 60}
                height={200}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(243, 78, 58, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    `rgba(255, 255, 255, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#F34E3A",
                  },
                }}
                bezier
                style={styles.chart}
              />
            </LinearGradient>
          </View>
        )}

        {/* Muscle Group Distribution */}
        {muscleGroupData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Muscle Group Focus</Text>
            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.chartCard}
            >
              <PieChart
                data={muscleGroupData}
                width={width - 60}
                height={180}
                chartConfig={{
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </LinearGradient>
          </View>
        )}

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            {performanceMetrics.map((metric, index) => (
              <LinearGradient
                key={index}
                colors={["#1C1C1E", "#2C2C2E"]}
                style={styles.metricCard}
              >
                <View style={styles.metricHeader}>
                  <View
                    style={[
                      styles.metricIconContainer,
                      { backgroundColor: `${metric.color}20` },
                    ]}
                  >
                    <FontAwesome5
                      name={metric.icon}
                      size={14}
                      color={metric.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.metricTrend,
                      {
                        color: metric.trend.includes("↑")
                          ? Colors.success
                          : metric.trend.includes("↓")
                          ? Colors.error
                          : Colors.warning,
                      },
                    ]}
                  >
                    {metric.trend}
                  </Text>
                </View>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </LinearGradient>
            ))}
          </View>
        </View>

        {/* Strength Progress Graph */}
        {strengthProgressData && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Strength Progress</Text>
              <View style={styles.metricSelector}>
                {["strength", "endurance", "volume"].map((metric) => (
                  <TouchableOpacity
                    key={metric}
                    style={[
                      styles.metricButton,
                      selectedMetric === metric && styles.metricButtonActive,
                    ]}
                    onPress={() => setSelectedMetric(metric)}
                  >
                    <Text
                      style={[
                        styles.metricButtonText,
                        selectedMetric === metric &&
                          styles.metricButtonTextActive,
                      ]}
                    >
                      {metric.charAt(0).toUpperCase() + metric.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <LinearGradient
              colors={["#1C1C1E", "#2C2C2E"]}
              style={styles.chartCard}
            >
              <LineChart
                data={strengthProgressData}
                width={width - 60}
                height={200}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(243, 78, 58, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    `rgba(255, 255, 255, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#F34E3A",
                  },
                }}
                bezier
                style={styles.chart}
              />
            </LinearGradient>
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() => {
                /* Navigate to full history */
              }}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.historyCard}
          >
            {workoutHistory.slice(0, 3).map((workout, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyDay}>
                  <Text style={styles.historyDayText}>
                    {workout.day || "Workout"}
                  </Text>
                  <Text style={styles.historyDateText}>
                    {workout.date
                      ? format(new Date(workout.date), "MMM DD, YYYY")
                      : ""}
                  </Text>
                </View>
                <View style={styles.historyProgress}>
                  <View style={styles.historyDetails}>
                    <Text style={styles.historyDetailText}>
                      {workout.totalExercises || 0} exercises
                    </Text>
                    <Text style={styles.historyDetailText}>
                      {workout.duration
                        ? formatDuration(workout.duration)
                        : "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {workoutHistory.length === 0 && (
              <View style={styles.emptyHistory}>
                <FontAwesome5
                  name="dumbbell"
                  size={24}
                  color={Colors.textSecondary}
                />
                <Text style={styles.emptyHistoryText}>
                  No workouts completed yet
                </Text>
                <Text style={styles.emptyHistorySubtext}>
                  Complete your first workout to see statistics here
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Bottom Stats */}
        <View style={styles.bottomStats}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.statCard}
          >
            <FontAwesome5 name="repeat" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>
              {workoutStats?.totalWorkouts || 0}
            </Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </LinearGradient>

          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.statCard}
          >
            <FontAwesome5
              name="calendar-check"
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.statNumber}>
              {workoutStats?.workoutDays || 0}
            </Text>
            <Text style={styles.statLabel}>Workout Days</Text>
          </LinearGradient>

          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.statCard}
          >
            <FontAwesome5 name="trophy" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>
              {workoutStats?.totalExercises
                ? Math.round(
                    workoutStats.totalExercises /
                      (workoutStats.totalWorkouts || 1),
                  )
                : 0}
            </Text>
            <Text style={styles.statLabel}>Avg/Workout</Text>
          </LinearGradient>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 14,
    marginTop: 10,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Fonts.Montserrat_Bold,
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.Montserrat_Medium,
    color: Colors.textSecondary,
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodButtonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 12,
  },
  periodButtonTextActive: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Bold,
  },
  summaryGrid: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCardLarge: {
    marginBottom: 10,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
  },
  summarySmallRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  summaryCardTitle: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 12,
    marginLeft: 8,
  },
  summaryCardValue: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Bold,
    fontSize: 28,
    marginBottom: 4,
  },
  summaryCardSubtext: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 12,
    marginBottom: 10,
  },
  highlight: {
    color: Colors.primary,
    fontFamily: Fonts.Montserrat_Bold,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Bold,
    fontSize: 18,
  },
  viewAllText: {
    color: Colors.primary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 12,
  },
  metricSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 2,
  },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metricButtonActive: {
    backgroundColor: Colors.primary,
  },
  metricButtonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 10,
  },
  metricButtonTextActive: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Bold,
  },
  chartCard: {
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: (width - 50) / 2,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  metricIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  metricTrend: {
    fontFamily: Fonts.Montserrat_Bold,
    fontSize: 10,
  },
  metricValue: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Bold,
    fontSize: 22,
    marginBottom: 4,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 12,
  },
  historyCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 150,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  historyDay: {
    flex: 1,
  },
  historyDayText: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Bold,
    fontSize: 14,
    marginBottom: 2,
  },
  historyDateText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 11,
  },
  historyProgress: {
    alignItems: "flex-end",
  },
  historyDetails: {
    alignItems: "flex-end",
  },
  historyDetailText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 11,
    marginBottom: 2,
  },
  emptyHistory: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  emptyHistoryText: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 14,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyHistorySubtext: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Regular,
    fontSize: 12,
    textAlign: "center",
  },
  bottomStats: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  statNumber: {
    color: "#fff",
    fontFamily: Fonts.Montserrat_Bold,
    fontSize: 18,
    marginVertical: 8,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.Montserrat_Medium,
    fontSize: 10,
    textAlign: "center",
  },
  spacer: {
    height: 40,
  },
});

export default Workouts;

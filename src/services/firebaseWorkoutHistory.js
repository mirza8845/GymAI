import { persistExercise, persistWorkout } from "./workoutPersistence";
import { localDateKey } from "../utils/workoutData";
// services/firebaseWorkoutHistory.js
import firestore from "@react-native-firebase/firestore";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
} from "date-fns";

const workoutHistoryCollection = (userId) =>
  firestore().collection("users").doc(userId).collection("workoutHistory");

const exerciseHistoryCollection = (userId) =>
  firestore().collection("users").doc(userId).collection("exerciseHistory");

const exerciseWeightsCollection = (userId) =>
  firestore().collection("users").doc(userId).collection("exerciseWeights");

export const WorkoutHistoryService = {
  logCompletedExercise: persistExercise,
  logCompletedWorkout: persistWorkout,

  calculateIntensity(workoutData) {
    if (!workoutData.duration || workoutData.duration === 0) return 3;

    const intensityScore =
      workoutData.totalExercises / (workoutData.duration / 60); // exercises per minute
    if (intensityScore > 1.5) return 5; // Very High
    if (intensityScore > 1.0) return 4; // High
    if (intensityScore > 0.5) return 3; // Moderate
    if (intensityScore > 0.3) return 2; // Low
    return 1; // Very Low
  },

  // Get user's workout history
  async getUserWorkoutHistory(userId, limit = 50, startAfter = null) {
    try {
      let query = workoutHistoryCollection(userId).orderBy(
        "completedAt",
        "desc",
      );

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      query = query.limit(limit);

      const snapshot = await query.get();

      const workouts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));

      // Get last document for pagination
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      return {
        workouts,
        lastDoc,
        hasMore: snapshot.docs.length === limit,
      };
    } catch (error) {
      console.error("Error fetching workout history:", error);
      throw error;
    }
  },

  // Get user's exercise history
  async getUserExerciseHistory(
    userId,
    exerciseId = null,
    limit = 100,
    startDate = null,
    endDate = null,
  ) {
    try {
      let query = exerciseHistoryCollection(userId).orderBy(
        "completedAt",
        "desc",
      );

      if (exerciseId) {
        query = query.where("exerciseId", "==", exerciseId);
      }

      if (startDate && endDate) {
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();
        query = query
          .where("timestamp", ">=", startTimestamp)
          .where("timestamp", "<=", endTimestamp);
      }

      query = query.limit(limit);

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));
    } catch (error) {
      console.error("Error fetching exercise history:", error);
      throw error;
    }
  },

  // Get today's completed workouts
  async getTodaysWorkouts(userId) {
    try {
      const today = localDateKey();
      const snapshot = await workoutHistoryCollection(userId)
        .where("date", "==", today)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));
    } catch (error) {
      console.error("Error fetching today's workouts:", error);
      throw error;
    }
  },

  // Get workout statistics
  async getUserWorkoutStats(userId) {
    try {
      const [workouts, exercises] = await Promise.all([
        this.getUserWorkoutHistory(userId, 1000),
        this.getUserExerciseHistory(userId, null, 1000),
      ]);

      const workoutList = workouts.workouts || [];
      const exerciseList = exercises;

      // Calculate stats
      const totalWorkouts = workoutList.length;
      const totalExercises = exerciseList.length;

      // Group by date for streak calculation
      const workoutDates = [...new Set(workoutList.map((w) => w.date))].sort();
      const exerciseDates = [
        ...new Set(exerciseList.map((e) => e.date)),
      ].sort();
      const allDates = [...new Set([...workoutDates, ...exerciseDates])].sort();

      // Calculate current streak
      let streak = 0;
      const today = localDateKey();
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      if (allDates.includes(today)) {
        streak = 1;
        let checkDate = yesterday;
        let dayBefore = new Date(Date.now() - 86400000);

        while (allDates.includes(checkDate)) {
          streak++;
          dayBefore = new Date(dayBefore.getTime() - 86400000);
          checkDate = dayBefore.toISOString().split("T")[0];
        }
      }

      // Calculate longest streak
      let longestStreak = 0;
      let currentStreak = 0;
      let prevDate = null;

      allDates.forEach((date) => {
        const currentDate = new Date(date);
        if (
          !prevDate ||
          prevDate.getTime() - currentDate.getTime() <= 86400000
        ) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
        prevDate = currentDate;
      });
      longestStreak = Math.max(longestStreak, currentStreak);

      // Calculate total duration
      const totalDuration = workoutList.reduce(
        (sum, workout) => sum + (workout.duration || 0),
        0,
      );

      // Calculate total weight lifted
      const totalWeightLifted = workoutList.reduce(
        (sum, workout) => sum + (workout.totalWeight || 0),
        0,
      );

      // Calculate total calories burned
      const totalCaloriesBurned = workoutList.reduce(
        (sum, workout) => sum + (workout.caloriesBurned || 0),
        0,
      );

      // Most frequent exercise
      const exerciseFrequency = exerciseList.reduce((acc, ex) => {
        const key = ex.exerciseId || ex.id;
        acc[key] = {
          count: (acc[key]?.count || 0) + 1,
          name: ex.name || "Unknown Exercise",
        };
        return acc;
      }, {});

      const mostFrequent = Object.entries(exerciseFrequency).reduce((a, b) =>
        a[1].count > b[1].count ? a : b,
      );

      // Calculate average workout duration
      const avgWorkoutDuration =
        totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

      // Calculate weekly frequency
      const weeklyFrequency = this.calculateWeeklyFrequency(workoutList);

      // Get last 7 days workout count
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      });

      const last7DaysWorkouts = workoutList.filter((w) =>
        last7Days.includes(w.date),
      ).length;

      // Get muscle group distribution
      const muscleGroups = this.calculateMuscleGroupDistribution(exerciseList);

      return {
        totalWorkouts,
        totalExercises,
        currentStreak: streak,
        longestStreak,
        totalDuration,
        totalWeightLifted,
        totalCaloriesBurned,
        avgWorkoutDuration,
        weeklyFrequency,
        last7DaysWorkouts,
        mostFrequentExercise: mostFrequent
          ? {
              id: mostFrequent[0],
              name: mostFrequent[1].name,
              count: mostFrequent[1].count,
            }
          : null,
        lastWorkoutDate: workoutList[0]?.date || null,
        workoutDays: allDates.length,
        muscleGroups,
      };
    } catch (error) {
      console.error("Error calculating workout stats:", error);
      throw error;
    }
  },

  // Calculate weekly frequency
  calculateWeeklyFrequency(workouts) {
    const dayCount = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    workouts.forEach((workout) => {
      if (workout.completedAt) {
        const date = workout.completedAt;
        const dayName = format(date, "dddd");
        if (dayCount[dayName] !== undefined) {
          dayCount[dayName]++;
        }
      }
    });

    return dayCount;
  },

  // Calculate muscle group distribution
  calculateMuscleGroupDistribution(exercises) {
    const muscleGroups = {
      Chest: 0,
      Back: 0,
      Legs: 0,
      Arms: 0,
      Shoulders: 0,
      Core: 0,
      Other: 0,
    };

    exercises.forEach((exercise) => {
      const target = exercise.target?.toLowerCase() || "";
      const bodyPart = exercise.bodyPart?.toLowerCase() || "";

      if (
        target.includes("chest") ||
        target.includes("pectoral") ||
        bodyPart.includes("chest")
      ) {
        muscleGroups["Chest"]++;
      } else if (
        target.includes("back") ||
        target.includes("lat") ||
        bodyPart.includes("back")
      ) {
        muscleGroups["Back"]++;
      } else if (
        target.includes("leg") ||
        target.includes("quad") ||
        target.includes("glute") ||
        target.includes("hamstring") ||
        bodyPart.includes("leg") ||
        bodyPart.includes("lower")
      ) {
        muscleGroups["Legs"]++;
      } else if (
        target.includes("bicep") ||
        target.includes("tricep") ||
        bodyPart.includes("arm")
      ) {
        muscleGroups["Arms"]++;
      } else if (target.includes("shoulder") || target.includes("deltoid")) {
        muscleGroups["Shoulders"]++;
      } else if (
        target.includes("core") ||
        target.includes("ab") ||
        target.includes("abs") ||
        bodyPart.includes("waist")
      ) {
        muscleGroups["Core"]++;
      } else {
        muscleGroups["Other"]++;
      }
    });

    const total = Object.values(muscleGroups).reduce((a, b) => a + b, 0);

    // Convert to percentages
    const distribution = {};
    Object.entries(muscleGroups).forEach(([group, count]) => {
      distribution[group] = total > 0 ? Math.round((count / total) * 100) : 0;
    });

    return distribution;
  },

  // Get workout statistics for a specific period
  async getPeriodStats(userId, period = "week") {
    try {
      let startDate, endDate;
      const today = new Date();

      if (period === "week") {
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
      } else if (period === "month") {
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
      } else if (period === "year") {
        startDate = subMonths(today, 12);
        endDate = today;
      } else {
        startDate = subDays(today, 7); // Default to last 7 days
        endDate = today;
      }

      const snapshot = await workoutHistoryCollection(userId)
        .where("completedAt", ">=", startDate)
        .where("completedAt", "<=", endDate)
        .get();

      const workouts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));

      // Calculate period stats
      const totalWorkouts = workouts.length;
      const totalDuration = workouts.reduce(
        (sum, w) => sum + (w.duration || 0),
        0,
      );
      const totalWeight = workouts.reduce(
        (sum, w) => sum + (w.totalWeight || 0),
        0,
      );
      const totalCalories = workouts.reduce(
        (sum, w) => sum + (w.caloriesBurned || 0),
        0,
      );

      // Group by day for chart data
      const daysInPeriod = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        daysInPeriod.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      const dailyData = {};

      daysInPeriod.forEach((day) => {
        const dateKey = format(day, "YYYY-MM-DD");
        dailyData[dateKey] = {
          date: dateKey,
          workouts: 0,
          duration: 0,
          calories: 0,
        };
      });

      workouts.forEach((workout) => {
        if (workout.date) {
          if (dailyData[workout.date]) {
            dailyData[workout.date].workouts++;
            dailyData[workout.date].duration += workout.duration || 0;
            dailyData[workout.date].calories += workout.caloriesBurned || 0;
          }
        }
      });

      return {
        period,
        totalWorkouts,
        totalDuration,
        totalWeight,
        totalCalories,
        dailyData: Object.values(dailyData),
        workouts,
      };
    } catch (error) {
      console.error("Error getting period stats:", error);
      throw error;
    }
  },

  // Log exercise weight for progress tracking
  // Log exercise weight for progress tracking
  async logExerciseWeight(
    userId,
    exerciseId,
    exerciseName,
    weight,
    reps,
    date,
  ) {
    try {
      // Validate inputs
      if (!exerciseId || !userId) {
        console.error("Missing exerciseId or userId");
        return { success: false, error: "Missing required parameters" };
      }

      const weightRef = exerciseWeightsCollection(userId).doc(exerciseId);

      const doc = await weightRef.get();

      // Initialize weightData with proper structure
      let weightData = {};

      if (doc.exists) {
        weightData = doc.data();
        // Ensure history array exists
        if (!weightData.history || !Array.isArray(weightData.history)) {
          weightData.history = [];
        }
      } else {
        // Initialize new document
        weightData = {
          exerciseId,
          exerciseName: exerciseName || "Unknown Exercise",
          history: [],
          currentPR: 0,
          repPRs: {},
          lastUpdated: new Date().getTime(),
        };
      }

      const newEntry = {
        weight: Number(weight) || 0,
        reps: Number(reps) || 1,
        date: date || new Date().toISOString(),
        timestamp: new Date().getTime(),
      };

      // Add new entry to history
      weightData.history.push(newEntry);

      // Keep only last 50 entries
      if (weightData.history.length > 50) {
        weightData.history = weightData.history.slice(-50);
      }

      // Calculate PR (personal record) for each rep range
      const prs = {};
      [1, 3, 5, 8, 10, 12].forEach((repRange) => {
        const entriesInRange = weightData.history.filter(
          (e) => e.reps === repRange,
        );
        if (entriesInRange.length > 0) {
          prs[`pr_${repRange}`] = Math.max(
            ...entriesInRange.map((e) => e.weight),
          );
        }
      });

      // Calculate overall PR (any rep range)
      const overallPR =
        weightData.history.length > 0
          ? Math.max(...weightData.history.map((e) => e.weight))
          : 0;

      weightData.currentPR = overallPR;
      weightData.repPRs = prs;
      weightData.lastUpdated = new Date().getTime();
      weightData.lastEntry = newEntry;

      // Ensure exerciseName is always set
      if (!weightData.exerciseName && exerciseName) {
        weightData.exerciseName = exerciseName;
      }

      await weightRef.set(weightData, { merge: true });

      return {
        success: true,
        pr: overallPR,
        repPRs: prs,
        totalEntries: weightData.history.length,
      };
    } catch (error) {
      console.error("Error logging exercise weight:", error);
      console.error("Error details:", {
        userId,
        exerciseId,
        exerciseName,
        weight,
        reps,
        date,
      });
      throw error;
    }
  },
  // Get exercise progress
  async getExerciseProgress(userId, exerciseId) {
    try {
      const doc = await exerciseWeightsCollection(userId).doc(exerciseId).get();

      if (!doc.exists) {
        return {
          history: [],
          currentPR: 0,
          repPRs: {},
          progress: [],
          exerciseName: "Unknown",
        };
      }

      const data = doc.data();
      const history = data.history || [];

      // Sort by date
      history.sort((a, b) => a.timestamp - b.timestamp);

      // Calculate weekly progress (last 8 weeks)
      const weeklyProgress = [];
      const now = new Date();

      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const weekEntries = history.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate >= weekStart && entryDate < weekEnd;
        });

        const weekMax =
          weekEntries.length > 0
            ? Math.max(...weekEntries.map((e) => e.weight))
            : 0;

        weeklyProgress.push({
          week: format(weekStart, "MMM DD"),
          maxWeight: weekMax,
          entries: weekEntries.length,
        });
      }

      // Calculate monthly progress (last 6 months)
      const monthlyProgress = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthEntries = history.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate >= monthStart && entryDate <= monthEnd;
        });

        const monthMax =
          monthEntries.length > 0
            ? Math.max(...monthEntries.map((e) => e.weight))
            : 0;

        monthlyProgress.push({
          month: format(monthStart, "MMM YYYY"),
          maxWeight: monthMax,
          entries: monthEntries.length,
        });
      }

      // Calculate best set (highest weight * reps)
      let bestSet = { weight: 0, reps: 0, volume: 0 };
      history.forEach((entry) => {
        const volume = entry.weight * entry.reps;
        if (volume > bestSet.volume) {
          bestSet = {
            weight: entry.weight,
            reps: entry.reps,
            volume,
            date: entry.date,
          };
        }
      });

      return {
        history,
        currentPR: data.currentPR || 0,
        repPRs: data.repPRs || {},
        progress: weeklyProgress,
        monthlyProgress,
        bestSet,
        exerciseName: data.exerciseName || "Exercise",
        totalEntries: history.length,
        lastUpdate: data.lastUpdated ? new Date(data.lastUpdated) : null,
        lastEntry: data.lastEntry || null,
      };
    } catch (error) {
      console.error("Error getting exercise progress:", error);
      throw error;
    }
  },

  // Delete workout from history
  async deleteWorkout(userId, workoutId) {
    try {
      await workoutHistoryCollection(userId).doc(workoutId).delete();

      // Also delete related exercises
      const exercisesSnapshot = await exerciseHistoryCollection(userId)
        .where("workoutId", "==", workoutId)
        .get();

      const deletePromises = exercisesSnapshot.docs.map((doc) =>
        doc.ref.delete(),
      );
      await Promise.all(deletePromises);

      return { success: true };
    } catch (error) {
      console.error("Error deleting workout:", error);
      throw error;
    }
  },

  // Delete exercise from history
  async deleteExercise(userId, exerciseId) {
    try {
      await exerciseHistoryCollection(userId).doc(exerciseId).delete();
      return { success: true };
    } catch (error) {
      console.error("Error deleting exercise:", error);
      throw error;
    }
  },

  // Update workout notes
  async updateWorkoutNotes(userId, workoutId, notes) {
    try {
      await workoutHistoryCollection(userId).doc(workoutId).update({
        notes,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error updating workout notes:", error);
      throw error;
    }
  },

  // Update exercise data
  async updateExerciseData(userId, exerciseId, data) {
    try {
      await exerciseHistoryCollection(userId)
        .doc(exerciseId)
        .update({
          ...data,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      return { success: true };
    } catch (error) {
      console.error("Error updating exercise data:", error);
      throw error;
    }
  },

  // Search workouts
  async searchWorkouts(userId, query, limit = 20) {
    try {
      // Note: Firestore doesn't support text search natively
      // This is a simple implementation that searches in memory
      const { workouts } = await this.getUserWorkoutHistory(userId, 100);

      const searchResults = workouts
        .filter((workout) => {
          const searchable = [
            workout.day || "",
            workout.notes || "",
            ...(workout.exercises?.map((e) => e.name) || []),
          ]
            .join(" ")
            .toLowerCase();

          return searchable.includes(query.toLowerCase());
        })
        .slice(0, limit);

      return searchResults;
    } catch (error) {
      console.error("Error searching workouts:", error);
      throw error;
    }
  },

  // Get workout summary for a specific date
  async getWorkoutSummary(userId, date) {
    try {
      const dateString =
        typeof date === "string" ? date : format(date, "YYYY-MM-DD");

      const snapshot = await workoutHistoryCollection(userId)
        .where("date", "==", dateString)
        .get();

      const workouts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));

      if (workouts.length === 0) {
        return null;
      }

      // Get all exercises for this date
      const exerciseSnapshot = await exerciseHistoryCollection(userId)
        .where("date", "==", dateString)
        .get();

      const exercises = exerciseSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));

      // Calculate summary
      const totalWorkouts = workouts.length;
      const totalExercises = exercises.length;
      const totalDuration = workouts.reduce(
        (sum, w) => sum + (w.duration || 0),
        0,
      );
      const totalCalories = workouts.reduce(
        (sum, w) => sum + (w.caloriesBurned || 0),
        0,
      );
      const totalWeight = workouts.reduce(
        (sum, w) => sum + (w.totalWeight || 0),
        0,
      );

      // Group exercises by muscle group
      const muscleGroups = {};
      exercises.forEach((exercise) => {
        const group = exercise.target || exercise.bodyPart || "Other";
        muscleGroups[group] = (muscleGroups[group] || 0) + 1;
      });

      return {
        date: dateString,
        workouts,
        exercises,
        summary: {
          totalWorkouts,
          totalExercises,
          totalDuration,
          totalCalories,
          totalWeight,
          muscleGroups,
        },
      };
    } catch (error) {
      console.error("Error getting workout summary:", error);
      throw error;
    }
  },

  // Get calendar data for a specific month
  async getCalendarData(userId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const snapshot = await workoutHistoryCollection(userId)
        .where("completedAt", ">=", startDate)
        .where("completedAt", "<=", endDate)
        .get();

      const workouts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));

      // Create calendar data structure
      const calendarData = {};
      const daysInMonth = endDate.getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateKey = format(date, "YYYY-MM-DD");

        const dayWorkouts = workouts.filter((w) => w.date === dateKey);

        calendarData[dateKey] = {
          date: dateKey,
          hasWorkout: dayWorkouts.length > 0,
          workoutCount: dayWorkouts.length,
          totalDuration: dayWorkouts.reduce(
            (sum, w) => sum + (w.duration || 0),
            0,
          ),
          totalCalories: dayWorkouts.reduce(
            (sum, w) => sum + (w.caloriesBurned || 0),
            0,
          ),
          workouts: dayWorkouts,
        };
      }

      return calendarData;
    } catch (error) {
      console.error("Error getting calendar data:", error);
      throw error;
    }
  },

  // Export workout data (for backup)
  async exportWorkoutData(userId) {
    try {
      const [workouts, exercises] = await Promise.all([
        this.getUserWorkoutHistory(userId, 1000),
        this.getUserExerciseHistory(userId, null, 5000),
      ]);

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          totalWorkouts: workouts.workouts?.length || 0,
          totalExercises: exercises.length,
        },
        workouts: workouts.workouts || [],
        exercises: exercises,
      };

      return exportData;
    } catch (error) {
      console.error("Error exporting workout data:", error);
      throw error;
    }
  },

  // Import workout data (for restore)
  async importWorkoutData(userId, importData) {
    try {
      const batch = firestore().batch();
      const timestamp = firestore.FieldValue.serverTimestamp();

      // Import workouts
      if (importData.workouts && Array.isArray(importData.workouts)) {
        importData.workouts.forEach((workout) => {
          const workoutRef = workoutHistoryCollection(userId).doc(
            workout.id || undefined,
          );
          const workoutData = {
            ...workout,
            userId,
            completedAt: timestamp,
            imported: true,
            importDate: new Date().toISOString(),
          };
          batch.set(workoutRef, workoutData);
        });
      }

      // Import exercises
      if (importData.exercises && Array.isArray(importData.exercises)) {
        importData.exercises.forEach((exercise) => {
          const exerciseRef = exerciseHistoryCollection(userId).doc(
            exercise.id || undefined,
          );
          const exerciseData = {
            ...exercise,
            userId,
            completedAt: timestamp,
            imported: true,
            importDate: new Date().toISOString(),
          };
          batch.set(exerciseRef, exerciseData);
        });
      }

      await batch.commit();
      return {
        success: true,
        importedCount:
          importData.workouts?.length + importData.exercises?.length,
      };
    } catch (error) {
      console.error("Error importing workout data:", error);
      throw error;
    }
  },

  // Clear all workout history (use with caution!)
  async clearWorkoutHistory(userId) {
    try {
      // Delete all workouts
      const workoutsSnapshot = await workoutHistoryCollection(userId).get();
      const workoutDeletes = workoutsSnapshot.docs.map((doc) =>
        doc.ref.delete(),
      );

      // Delete all exercises
      const exercisesSnapshot = await exerciseHistoryCollection(userId).get();
      const exerciseDeletes = exercisesSnapshot.docs.map((doc) =>
        doc.ref.delete(),
      );

      // Delete all exercise weights
      const weightsSnapshot = await exerciseWeightsCollection(userId).get();
      const weightDeletes = weightsSnapshot.docs.map((doc) => doc.ref.delete());

      await Promise.all([
        ...workoutDeletes,
        ...exerciseDeletes,
        ...weightDeletes,
      ]);

      return { success: true };
    } catch (error) {
      console.error("Error clearing workout history:", error);
      throw error;
    }
  },

  // Get workout history filtered by planId
  async getWorkoutHistoryByPlan(userId, planId, limit = 50) {
    try {
      const snapshot = await workoutHistoryCollection(userId)
        .where("planId", "==", planId)
        .orderBy("completedAt", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || null,
      }));
    } catch (error) {
      console.error("Error fetching workout history by plan:", error);
      throw error;
    }
  },

  // Log a skipped workout
  async logSkippedWorkout(userId, workoutData) {
    try {
      const timestamp = firestore.FieldValue.serverTimestamp();
      const workoutRef = workoutHistoryCollection(userId).doc();

      const workoutLog = {
        userId,
        planId: workoutData.planId || null,
        planVersion: workoutData.planVersion || null,
        weekNumber: workoutData.weekNumber || null,
        day: workoutData.day || "Workout",
        exercises: workoutData.exercises || [],
        totalExercises:
          workoutData.totalExercises || workoutData.exercises?.length || 0,
        completedExercises: 0,
        skippedExercises: workoutData.exercises?.length || 0,
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        duration: 0,
        caloriesBurned: 0,
        completionStatus: "skipped",
        completionPercentage: 0,
        notes: workoutData.notes || "Workout skipped",
        completedAt: timestamp,
        type: "full",
        date: workoutData.date || localDateKey(),
        timestamp: new Date().getTime(),
      };

      await workoutRef.set(workoutLog);

      return {
        success: true,
        id: workoutRef.id,
        ...workoutLog,
      };
    } catch (error) {
      console.error("Error logging skipped workout:", error);
      throw error;
    }
  },
};

import { validExerciseDetails } from "../../utils/workoutData";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import AntDesign from "react-native-vector-icons/AntDesign";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { RFPercentage } from "react-native-responsive-fontsize";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import Toast from "react-native-toast-message";
import LinearGradient from "react-native-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { setWorkoutPlan } from "../../redux/Actions";

// Import your service functions - adjust the path as needed
import { searchExercises, getExerciseCategories } from "../../services/generateWorkoutPlan";

const { width } = Dimensions.get('window');
const darkColors = {
  background: "#000000",
  primary: "#F34E3A",
  primaryLight: "#F17C3B",
  surface: "#000000",
  surfaceElevated: "#1A1A1A",
  primaryDark: "#D83A28",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#666768",
  border: "#3C3C3C",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  gradientStart: "#F34E3A",
  gradientEnd: "#FF6B4A",
};

const AddExercise = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { day } = route.params || {};
  const dispatch = useDispatch();
  const workoutPlan = useSelector((state) => state.workout.workoutPlan);

  const [searchQuery, setSearchQuery] = useState("");
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingExercise, setAddingExercise] = useState(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState("All");
  const [selectedEquipment, setSelectedEquipment] = useState("All");
  const [selectedTarget, setSelectedTarget] = useState("All");
  const [showSetsModal, setShowSetsModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-12");
  const [notes, setNotes] = useState("");
  const [restSeconds, setRestSeconds] = useState("60");
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState({
    bodyParts: ["All"],
    equipment: ["All"],
    targets: ["All"]
  });
  const [isSearching, setIsSearching] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("bodyParts"); // 'bodyParts', 'equipment', 'targets'

  // Create a ref for the search timeout
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    loadCategories();
    return () => {
      // Cleanup timeout on unmount
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle search query changes with custom debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 500); // 500ms debounce
    } else if (searchQuery.trim().length === 0 && hasSearched) {
      // Clear search and show empty state immediately
      setExercises([]);
      setIsSearching(false);
      setHasSearched(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedBodyPart !== "All" || selectedEquipment !== "All" || selectedTarget !== "All") {
      handleFilterExercises();
    }
  }, [selectedBodyPart, selectedEquipment, selectedTarget]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await getExerciseCategories();

      console.log("categoriesData.....", categoriesData);
      
      // Group targets by type for better organization
      const groupedTargets = groupTargetsByType(categoriesData.targets || []);
      
      // Format categories with "All" option
      const formattedCategories = {
        bodyParts: ["All", ...(categoriesData.bodyParts || []).filter(item => item && item.trim() !== "")],
        equipment: ["All", ...(categoriesData.equipment || []).filter(item => item && item.trim() !== "")],
        targets: ["All", ...(categoriesData.targets || []).filter(item => item && item.trim() !== "")],
        groupedTargets: groupedTargets
      };
      
      setCategories(formattedCategories);
      setInitialLoadComplete(true);
      
    } catch (error) {
      console.error("Error loading categories:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load exercise categories",
      });
      
      // Set default categories if API fails
      const defaultCategories = {
        bodyParts: ["All", "waist", "upper legs", "chest", "back", "shoulders", "upper arms", "lower arms", "cardio"],
        equipment: ["All", "body weight", "dumbbell", "barbell", "cable", "machine", "band", "kettlebell", "medicine ball"],
        targets: ["All", "abs", "quads", "pectorals", "lats", "deltoids", "biceps", "triceps", "glutes", "hamstrings"]
      };
      setCategories(defaultCategories);
      
    } finally {
      setLoading(false);
    }
  };

  // Group targets by muscle type for better organization
  const groupTargetsByType = (targets) => {
    const groups = {
      arms: ["biceps", "triceps", "forearms", "brachialis"],
      chest: ["pectorals", "chest", "upper chest"],
      back: ["lats", "latissimus dorsi", "upper back", "lower back", "traps", "trapezius", "rhomboids", "rear deltoids"],
      shoulders: ["deltoids", "delts", "shoulders", "rotator cuff"],
      legs: ["quadriceps", "quads", "hamstrings", "glutes", "calves", "soleus", "inner thighs", "adductors", "abductors"],
      core: ["abdominals", "abs", "lower abs", "obliques", "core"],
      fullBody: ["cardiovascular system", "full body"],
      other: ["hands", "wrists", "ankles", "feet", "shins", "groin", "hip flexors", "levator scapulae", "serratus anterior", "spine", "sternocleidomastoid", "ankle stabilizers", "grip muscles", "wrist flexors", "wrist extensors"]
    };

    const result = {};
    
    // Initialize all groups
    Object.keys(groups).forEach(group => {
      result[group] = [];
    });

    // Sort targets into groups
    targets.forEach(target => {
      let added = false;
      const targetLower = target.toLowerCase();
      
      for (const [group, keywords] of Object.entries(groups)) {
        if (keywords.some(keyword => targetLower.includes(keyword.toLowerCase()))) {
          result[group].push(target);
          added = true;
          break;
        }
      }
      
      // If not added to any group, add to "other"
      if (!added) {
        result.other.push(target);
      }
    });

    // Remove empty groups
    Object.keys(result).forEach(group => {
      if (result[group].length === 0) {
        delete result[group];
      }
    });

    return result;
  };

  const handleSearch = async (query) => {
    try {
      setIsSearching(true);
      setLoading(true);
      setHasSearched(true);
      
      console.log("Searching for:", query);
      const results = await searchExercises(query, 30);
      console.log("results.......", results);
      
      // Format the results to match your exercise structure
      const formattedResults = results.map(exercise => formatExerciseData(exercise));
      
      console.log("Search results:", formattedResults.length);
      setExercises(formattedResults);
      
      if (formattedResults.length === 0) {
        Toast.show({
          type: "info",
          text1: "No exercises found",
          text2: "Try a different search term",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      Toast.show({
        type: "error",
        text1: "Search failed",
        text2: "Please check your connection and try again",
      });
      
      // Fallback to sample data
      const sampleExercises = getSampleExercises().filter(ex => 
        ex.name.toLowerCase().includes(query.toLowerCase())
      );
      setExercises(sampleExercises.map(ex => formatExerciseData(ex)));
    } finally {
      setLoading(false);
    }
  };

  const formatExerciseData = (exercise) => {
    const exerciseId = exercise.exerciseId || exercise.id || `ex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: exerciseId,
      name: exercise.name || "Exercise",
      equipment: exercise.equipments?.[0] || exercise.equipment || "body weight",
      bodyPart: exercise.bodyParts?.[0] || exercise.bodyPart || "waist",
      target: exercise.targetMuscles?.[0] || exercise.target || "abs",
      gifUrl: exercise.gifUrl || `https://static.exercisedb.dev/media/${exerciseId}.gif`,
      secondaryMuscles: exercise.secondaryMuscles || [],
      instructions: exercise.instructions || ["Perform with proper form and control"],
    };
  };

  const handleFilterExercises = async () => {
    try {
      // Skip if all filters are "All"
      if (selectedBodyPart === "All" && selectedEquipment === "All" && selectedTarget === "All") {
        setExercises([]);
        setHasSearched(false);
        return;
      }
      
      setIsSearching(false);
      setLoading(true);
      setHasSearched(true);
      
      // Build search query from filters
      let searchTerms = [];
      if (selectedBodyPart !== "All") searchTerms.push(selectedBodyPart);
      if (selectedEquipment !== "All") searchTerms.push(selectedEquipment);
      if (selectedTarget !== "All") searchTerms.push(selectedTarget);
      
      if (searchTerms.length > 0) {
        // Try each filter individually and combine results
        let filteredResults = [];
        
        // Try body part first
        if (selectedBodyPart !== "All") {
          try {
            const bodyPartResults = await searchExercises(selectedBodyPart, 20);
            filteredResults = [...filteredResults, ...bodyPartResults];
          } catch (error) {
            console.log("Body part search failed:", error);
          }
        }
        
        // Try equipment
        if (selectedEquipment !== "All") {
          try {
            const equipmentResults = await searchExercises(selectedEquipment, 20);
            filteredResults = [...filteredResults, ...equipmentResults];
          } catch (error) {
            console.log("Equipment search failed:", error);
          }
        }
        
        // Try target
        if (selectedTarget !== "All") {
          try {
            const targetResults = await searchExercises(selectedTarget, 20);
            filteredResults = [...filteredResults, ...targetResults];
          } catch (error) {
            console.log("Target search failed:", error);
          }
        }
        
        // Remove duplicates and format
        const uniqueResults = Array.from(new Map(filteredResults.map(item => [item.id || item.name, item])).values());
        const formattedResults = uniqueResults.map(ex => formatExerciseData(ex));
        
        // Apply additional filtering if multiple filters are selected
        let finalResults = formattedResults;
        if (selectedBodyPart !== "All" || selectedEquipment !== "All" || selectedTarget !== "All") {
          finalResults = formattedResults.filter(ex => {
            const matchesBodyPart = selectedBodyPart === "All" || 
              ex.bodyPart.toLowerCase().includes(selectedBodyPart.toLowerCase()) ||
              selectedBodyPart.toLowerCase().includes(ex.bodyPart.toLowerCase());
            
            const matchesEquipment = selectedEquipment === "All" || 
              ex.equipment.toLowerCase().includes(selectedEquipment.toLowerCase()) ||
              selectedEquipment.toLowerCase().includes(ex.equipment.toLowerCase());
            
            const matchesTarget = selectedTarget === "All" || 
              ex.target.toLowerCase().includes(selectedTarget.toLowerCase()) ||
              selectedTarget.toLowerCase().includes(ex.target.toLowerCase());
            
            return matchesBodyPart && matchesEquipment && matchesTarget;
          });
        }
        
        setExercises(finalResults.slice(0, 30)); // Limit to 30 results
        
        if (finalResults.length === 0) {
          Toast.show({
            type: "info",
            text1: "No exercises found",
            text2: "Try different filters",
          });
        }
      }
    } catch (error) {
      console.error("Filter error:", error);
      Toast.show({
        type: "error",
        text1: "Filter failed",
        text2: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSampleExercises = () => {
    return [
      {
        id: "0001",
        name: "3/4 sit-up",
        equipment: "body weight",
        bodyPart: "waist",
        target: "abs",
        gifUrl: "https://v2.exercisedb.io/image/6A8yGJnB4eE3dX",
        secondaryMuscles: ["hip flexors"],
        instructions: ["Lie on your back with knees bent", "Perform sit-up to 3/4 position"]
      },
      {
        id: "0002",
        name: "45° side bend",
        equipment: "body weight",
        bodyPart: "waist",
        target: "abs",
        gifUrl: "https://v2.exercisedb.io/image/fBEHQfA1W9kPNU",
        secondaryMuscles: ["obliques"],
        instructions: ["Stand with feet shoulder-width apart", "Bend sideways to 45 degrees"]
      },
      {
        id: "0003",
        name: "bench press",
        equipment: "barbell",
        bodyPart: "chest",
        target: "pectorals",
        gifUrl: "https://static.exercisedb.dev/media/bench-press.gif",
        secondaryMuscles: ["shoulders", "triceps"],
        instructions: ["Lie on bench, grip barbell", "Lower to chest, press up"]
      },
    ];
  };

  const handleAddExercise = async (exercise) => {
    setSelectedExercise(exercise);
    setShowSetsModal(true);
  };

  const confirmAddExercise = async () => {
    if (!validExerciseDetails({sets,reps,restSeconds})) { Toast.show({type:'error',text1:'Check sets, reps and rest time',text2:'Use positive sets/reps and a rest time between 0 and 3600 seconds.'}); return; }
    if (!selectedExercise) return;

    try {
      setAddingExercise(selectedExercise.id);

      const uid = auth().currentUser.uid;
      const docRef = firestore().collection("workouts").doc(uid);
      const doc = await docRef.get();
      if (!doc.exists) throw new Error("Workout plan not found");

      const currentPlan = doc.data().plan;
      const currentExercises = currentPlan.daily_workouts?.[day] || [];

      const newExercise = {
        ...selectedExercise,
        workoutDetails: {
          sets: parseInt(sets) || 3,
          reps: reps || "8-12",
          notes: notes.trim(),
          restSeconds: parseInt(restSeconds) || 60,
        },
      };

      const updatedExercises = [...currentExercises, newExercise];

      await docRef.update({
        [`plan.daily_workouts.${day}`]: updatedExercises,
      });

      const updatedPlan = {
        ...workoutPlan,
        daily_workouts: {
          ...workoutPlan.daily_workouts,
          [day]: updatedExercises,
        },
      };
      dispatch(setWorkoutPlan(updatedPlan));

      Toast.show({
        type: "success",
        text1: "Exercise added",
        text2: `${selectedExercise.name} added to ${day}`,
      });

      setShowSetsModal(false);
      setSelectedExercise(null);
      setSets("3");
      setReps("8-12");
      setNotes("");
      setRestSeconds("60");
      setAddingExercise(null);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error("Error adding exercise:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to add exercise",
      });
      setAddingExercise(null);
    }
  };

  const getEquipmentIcon = (equipment) => {
    if (!equipment) return "dumbbell";

    const eq = equipment.toLowerCase();
    if (eq.includes("barbell")) return "dumbbell";
    if (eq.includes("dumbbell")) return "dumbbell";
    if (eq.includes("machine") || eq.includes("leverage")) return "cog";
    if (eq.includes("cable")) return "link";
    if (eq.includes("body weight") || eq.includes("bodyweight")) return "user";
    if (eq.includes("smith")) return "weight-hanging";
    if (eq.includes("kettlebell")) return "weight";
    if (eq.includes("band") || eq.includes("resistance")) return "resistor";
    if (eq.includes("ball")) return "soccer";
    if (eq.includes("roller")) return "chart-bell-curve";
    if (eq.includes("rope")) return "rope";
    if (eq.includes("tire")) return "car-tire-alert";
    if (eq.includes("bike") || eq.includes("bicycle") || eq.includes("stationary bike")) return "bicycle";
    if (eq.includes("stepmill") || eq.includes("elliptical")) return "run";
    if (eq.includes("weighted")) return "weight-lifter";
    if (eq.includes("hammer")) return "hammer";
    if (eq.includes("sled")) return "sledding";
    if (eq.includes("skierg")) return "ski";
    return "dumbbell";
  };

  const handleFilterChange = (type, value) => {
    switch (type) {
      case 'bodyPart':
        setSelectedBodyPart(value);
        break;
      case 'equipment':
        setSelectedEquipment(value);
        break;
      case 'target':
        setSelectedTarget(value);
        break;
    }
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedBodyPart("All");
    setSelectedEquipment("All");
    setSelectedTarget("All");
    setExercises([]);
    setHasSearched(false);
    setActiveFilterTab("bodyParts");
  };

  const onRefresh = () => {
    setRefreshing(true);
    resetAllFilters();
    loadCategories();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length >= 2) {
      // Clear any pending timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // Trigger search immediately
      handleSearch(searchQuery);
    }
  };

  const formatLabel = (label) => {
    // Capitalize first letter of each word and replace underscores
    return label
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case 'bodyParts':
        return 'body-outline';
      case 'equipment':
        return 'fitness-outline';
      case 'targets':
        return 'star-outline';
      default:
        return 'body-outline';
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedBodyPart !== "All") count++;
    if (selectedEquipment !== "All") count++;
    if (selectedTarget !== "All") count++;
    return count;
  };

  const renderExerciseCard = ({ item: exercise }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => handleAddExercise(exercise)}
      disabled={addingExercise === exercise.id}
    >
      <LinearGradient
        colors={["#1C1C1E", "#2C2C2E"]}
        style={styles.exerciseGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Exercise Image/GIF */}
        {exercise.gifUrl ? (
          <Image
            source={{ uri: exercise.gifUrl }}
            style={styles.exerciseImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons
              name={getEquipmentIcon(exercise.equipment)}
              size={30}
              color={darkColors.textSecondary}
            />
          </View>
        )}

        {/* Exercise Info */}
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {exercise.name}
          </Text>
          
          <View style={styles.exerciseMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name={getEquipmentIcon(exercise.equipment)}
                size={14}
                color={darkColors.textSecondary}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {formatLabel(exercise.equipment)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons
                name="body"
                size={14}
                color={darkColors.textSecondary}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {formatLabel(exercise.target)}
              </Text>
            </View>
          </View>

          <View style={styles.exerciseBodyPart}>
            <Text style={styles.bodyPartText}>{formatLabel(exercise.bodyPart)}</Text>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddExercise(exercise)}
            disabled={addingExercise === exercise.id}
          >
            {addingExercise === exercise.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <AntDesign name="plus" size={14} color="#fff" />
                <Text style={styles.addButtonText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderFilterChip = (type, value, label) => {
    const isActive = 
      (type === 'bodyPart' && selectedBodyPart === value) ||
      (type === 'equipment' && selectedEquipment === value) ||
      (type === 'target' && selectedTarget === value);
    
    return (
      <TouchableOpacity
        key={`${type}-${value}`}
        style={[
          styles.filterChip,
          isActive && styles.filterChipActive,
        ]}
        onPress={() => handleFilterChange(type, value)}
      >
        <Text
          style={[
            styles.filterChipText,
            isActive && styles.filterChipTextActive,
          ]}
          numberOfLines={1}
        >
          {formatLabel(label || value)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFilterSection = () => {
    let items = [];
    
    switch (activeFilterTab) {
      case 'bodyParts':
        items = categories.bodyParts || [];
        break;
      case 'equipment':
        items = categories.equipment || [];
        break;
      case 'targets':
        items = categories.targets || [];
        break;
    }

    const getTypeFromTab = (tab) => {
      switch (tab) {
        case 'bodyParts': return 'bodyPart';
        case 'equipment': return 'equipment';
        case 'targets': return 'target';
        default: return 'bodyPart';
      }
    };

    return (
      <View style={styles.filterContent}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {items.slice(0, 20).map((item) => 
            renderFilterChip(getTypeFromTab(activeFilterTab), item, item)
          )}
        </ScrollView>
        
        {items.length > 20 && (
          <Text style={styles.moreItemsText}>
            +{items.length - 20} more items
          </Text>
        )}
      </View>
    );
  };

  const renderActiveFilters = () => {
    const activeFilters = [];
    
    if (selectedBodyPart !== "All") {
      activeFilters.push(
        <View key="bodyPart" style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>
            {formatLabel(selectedBodyPart)}
          </Text>
          <TouchableOpacity onPress={() => setSelectedBodyPart("All")}>
            <AntDesign name="close" size={12} color={darkColors.textPrimary} />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (selectedEquipment !== "All") {
      activeFilters.push(
        <View key="equipment" style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>
            {formatLabel(selectedEquipment)}
          </Text>
          <TouchableOpacity onPress={() => setSelectedEquipment("All")}>
            <AntDesign name="close" size={12} color={darkColors.textPrimary} />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (selectedTarget !== "All") {
      activeFilters.push(
        <View key="target" style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>
            {formatLabel(selectedTarget)}
          </Text>
          <TouchableOpacity onPress={() => setSelectedTarget("All")}>
            <AntDesign name="close" size={12} color={darkColors.textPrimary} />
          </TouchableOpacity>
        </View>
      );
    }
    
    return activeFilters;
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <AntDesign name="arrowleft" color="#fff" size={RFPercentage(3)} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add Exercise {day}</Text>
          {/* <Text style={styles.headerSubtitle}>{day}</Text> */}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={darkColors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises (min. 2 characters)..."
            placeholderTextColor={darkColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <AntDesign name="closecircle" size={16} color={darkColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilterTab === 'bodyParts' && styles.filterTabActive
          ]}
          onPress={() => setActiveFilterTab('bodyParts')}
        >
          <Ionicons
            name={getTabIcon('bodyParts')}
            size={16}
            color={activeFilterTab === 'bodyParts' ? darkColors.primary : darkColors.textSecondary}
          />
          <Text style={[
            styles.filterTabText,
            activeFilterTab === 'bodyParts' && styles.filterTabTextActive
          ]}>
            Body Parts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilterTab === 'equipment' && styles.filterTabActive
          ]}
          onPress={() => setActiveFilterTab('equipment')}
        >
          <Ionicons
            name={getTabIcon('equipment')}
            size={16}
            color={activeFilterTab === 'equipment' ? darkColors.primary : darkColors.textSecondary}
          />
          <Text style={[
            styles.filterTabText,
            activeFilterTab === 'equipment' && styles.filterTabTextActive
          ]}>
            Equipment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            activeFilterTab === 'targets' && styles.filterTabActive
          ]}
          onPress={() => setActiveFilterTab('targets')}
        >
          <Ionicons
            name={getTabIcon('targets')}
            size={16}
            color={activeFilterTab === 'targets' ? darkColors.primary : darkColors.textSecondary}
          />
          <Text style={[
            styles.filterTabText,
            activeFilterTab === 'targets' && styles.filterTabTextActive
          ]}>
            Target Muscles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activeFiltersScroll}
          >
            {renderActiveFilters()}
          </ScrollView>
          <TouchableOpacity style={styles.clearAllButton} onPress={resetAllFilters}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Content */}
      <View style={styles.filtersContainer}>
        {renderFilterSection()}
      </View>

      {/* Exercises List */}
      <FlatList
        data={exercises}
        renderItem={renderExerciseCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.exercisesContainer,
          exercises.length === 0 && { flexGrow: 1 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[darkColors.primary]}
            tintColor={darkColors.primary}
          />
        }
        ListEmptyComponent={
          !loading && initialLoadComplete ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="magnify"
                size={60}
                color={darkColors.textSecondary}
              />
              <Text style={styles.emptyTitle}>
                {hasSearched ? "No exercises found" : "Find Exercises"}
              </Text>
              <Text style={styles.emptyText}>
                {hasSearched 
                  ? "Try a different search or filters"
                  : "Search by name or use filters above"}
              </Text>
              {!hasSearched && (
                <View style={styles.filterHints}>
                  <Text style={styles.filterHint}>
                    • Use search to find specific exercises
                  </Text>
                  <Text style={styles.filterHint}>
                    • Filter by body part, equipment, or target muscle
                  </Text>
                  <Text style={styles.filterHint}>
                    • Tap on any exercise to add it to your workout
                  </Text>
                </View>
              )}
            </View>
          ) : null
        }
        ListHeaderComponent={
          exercises.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'} found
              </Text>
              <Text style={styles.resultsHint}>
                Tap any exercise to add it to {day}
              </Text>
            </View>
          )
        }
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={darkColors.primary} />
          <Text style={styles.loadingText}>
            {isSearching ? "Searching exercises..." : "Loading..."}
          </Text>
        </View>
      )}

      {/* Sets/Reps Modal */}
      {showSetsModal && selectedExercise && (
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={["#1C1C1E", "#2C2C2E"]}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configure Exercise</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSetsModal(false);
                  setSelectedExercise(null);
                }}
                style={styles.modalCloseButton}
              >
                <AntDesign name="close" size={20} color={darkColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.exerciseModalName}>{selectedExercise.name}</Text>

            <View style={styles.configRow}>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Sets</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.configInput}
                    value={sets}
                    onChangeText={setSets}
                    keyboardType="numeric"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Reps</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.configInput}
                    value={reps}
                    onChangeText={setReps}
                    placeholder="8-12"
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Rest (s)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.configInput}
                    value={restSeconds}
                    onChangeText={setRestSeconds}
                    keyboardType="numeric"
                    maxLength={3}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>

            <View style={styles.notesContainer}>
              <Text style={styles.configLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Focus on form, go heavy..."
                placeholderTextColor={darkColors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmAddExercise}
              disabled={addingExercise === selectedExercise.id}
            >
              <LinearGradient
                colors={[darkColors.primary, darkColors.primaryLight]}
                style={styles.confirmButtonGradient}
              >
                {addingExercise === selectedExercise.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <AntDesign name="plus" size={16} color="#fff" />
                    <Text style={styles.confirmButtonText}>Add to {day}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  headerContainer: {
    flexDirection: "row",
    // alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: RFPercentage(8),
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: darkColors.primary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
  },
  headerSpacer: {
    width: RFPercentage(3),
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: darkColors.background,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: darkColors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: darkColors.textPrimary,
    fontSize: 16,
    fontFamily: "Montserrat-Regular",
    padding: 0,
  },
  filterTabsContainer: {
    flexDirection: "row",
    backgroundColor: darkColors.background,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
    paddingHorizontal: 16,
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabActive: {
    borderBottomColor: darkColors.primary,
  },
  filterTabText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    marginLeft: 6,
  },
  filterTabTextActive: {
    color: darkColors.primary,
    fontFamily: "Montserrat-SemiBold",
  },
  activeFiltersContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: darkColors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(243, 78, 58, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(243, 78, 58, 0.3)",
  },
  activeFilterText: {
    color: darkColors.primary,
    fontSize: 11,
    fontFamily: "Montserrat-Medium",
    marginRight: 6,
  },
  clearAllButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  filtersContainer: {
    backgroundColor: darkColors.background,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
    minHeight: 70,
    maxHeight: 120,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterScroll: {
    flexDirection: "row",
  },
  filterScrollContent: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: darkColors.surfaceElevated,
    borderWidth: 1,
    borderColor: darkColors.border,
    marginRight: 8,
    marginBottom: 4,
  },
  filterChipActive: {
    backgroundColor: darkColors.primary,
    borderColor: darkColors.primary,
  },
  filterChipText: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  moreItemsText: {
    color: darkColors.textMuted,
    fontSize: 10,
    fontFamily: "Montserrat-Regular",
    marginTop: 4,
    textAlign: "center",
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  exercisesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  resultsHeader: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  resultsCount: {
    color: darkColors.textPrimary,
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
    marginBottom: 4,
  },
  resultsHint: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Regular",
  },
  exerciseCard: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  exerciseGradient: {
    padding: 12,
    borderRadius: 16,
  },
  exerciseImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#333",
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginBottom: 8,
    minHeight: 36,
  },
  exerciseMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 4,
  },
  metaText: {
    color: darkColors.textSecondary,
    fontSize: 11,
    fontFamily: "Montserrat-Medium",
    marginLeft: 4,
    maxWidth: 80,
  },
  exerciseBodyPart: {
    backgroundColor: "rgba(243, 78, 58, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  bodyPartText: {
    color: darkColors.primary,
    fontSize: 10,
    fontFamily: "Montserrat-Bold",
    textTransform: "capitalize",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: darkColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Montserrat-Bold",
    marginLeft: 4,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 10,
  },
  loadingText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Medium",
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  filterHints: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  filterHint: {
    color: darkColors.textMuted,
    fontSize: 13,
    fontFamily: "Montserrat-Regular",
    marginBottom: 8,
    lineHeight: 18,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Montserrat-Bold",
  },
  modalCloseButton: {
    padding: 4,
  },
  exerciseModalName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Bold",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  configItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  configLabel: {
    color: darkColors.textSecondary,
    fontSize: 12,
    fontFamily: "Montserrat-Medium",
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: darkColors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
    paddingHorizontal: 12,
  },
  configInput: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat-Medium",
    paddingVertical: 12,
    textAlign: "center",
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesInput: {
    backgroundColor: darkColors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkColors.border,
    padding: 16,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  confirmButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  confirmButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat-Bold",
    marginLeft: 8,
  },
});

export default AddExercise;
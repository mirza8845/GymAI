import axios from "axios";

// ExerciseDB browsing and its local fallback are still used by AddExercise.
// Public plan generation and weekly progression use the dedicated Vercel API.
class ExerciseDBWorkoutGenerator {
  constructor() {
    this.baseUrl = "https://exercisedb-api.vercel.app/api/v1";

    this.cache = new Map();
    this.cacheDuration = 24 * 60 * 60 * 1000;

    this.isGenerating = false;
    this.lastRequestTime = 0;

    // Once ExerciseDB returns a hard API error such as 402,
    // don't keep hammering the API for every muscle group.
    this.apiUnavailableUntil = 0;

    // 5 minutes before trying the API again.
    this.apiRetryAfter = 5 * 60 * 1000;
  }

  /* =========================================================
     LOCAL EXERCISE DATABASE
     ========================================================= */

  getLocalExercises() {
    return [
      // CHEST
      {
        id: "local-chest-1",
        name: "Push-Up",
        bodyPart: "chest",
        equipment: "body weight",
        target: "pectorals",
        instructions: [
          "Start in a high plank position.",
          "Keep your body straight.",
          "Lower your chest toward the floor.",
          "Push back up while maintaining control.",
        ],
      },
      {
        id: "local-chest-2",
        name: "Incline Push-Up",
        bodyPart: "chest",
        equipment: "body weight",
        target: "pectorals",
        instructions: [
          "Place your hands on a stable elevated surface.",
          "Keep your body straight.",
          "Lower your chest toward the surface.",
          "Push back up.",
        ],
      },
      {
        id: "local-chest-3",
        name: "Dumbbell Bench Press",
        bodyPart: "chest",
        equipment: "dumbbell",
        target: "pectorals",
        instructions: [
          "Lie flat on a bench with a dumbbell in each hand.",
          "Start with the dumbbells above your chest.",
          "Lower them with control.",
          "Press them back up.",
        ],
      },
      {
        id: "local-chest-4",
        name: "Dumbbell Fly",
        bodyPart: "chest",
        equipment: "dumbbell",
        target: "pectorals",
        instructions: [
          "Lie on a bench holding dumbbells above your chest.",
          "Keep a slight bend in your elbows.",
          "Lower your arms outward.",
          "Bring the dumbbells back together.",
        ],
      },
      {
        id: "local-chest-5",
        name: "Barbell Bench Press",
        bodyPart: "chest",
        equipment: "barbell",
        target: "pectorals",
        instructions: [
          "Lie on the bench with your feet firmly planted.",
          "Grip the bar slightly wider than shoulder width.",
          "Lower the bar toward your chest.",
          "Press it upward under control.",
        ],
      },

      // BACK
      {
        id: "local-back-1",
        name: "Dumbbell Row",
        bodyPart: "back",
        equipment: "dumbbell",
        target: "lats",
        instructions: [
          "Place one hand on a bench for support.",
          "Hold a dumbbell with the opposite hand.",
          "Pull the dumbbell toward your hip.",
          "Lower it slowly.",
        ],
      },
      {
        id: "local-back-2",
        name: "Barbell Row",
        bodyPart: "back",
        equipment: "barbell",
        target: "upper back",
        instructions: [
          "Stand with feet about hip width apart.",
          "Hinge forward while keeping your back neutral.",
          "Pull the bar toward your torso.",
          "Lower it under control.",
        ],
      },
      {
        id: "local-back-3",
        name: "Pull-Up",
        bodyPart: "back",
        equipment: "body weight",
        target: "lats",
        instructions: [
          "Grip the pull-up bar.",
          "Hang with your arms extended.",
          "Pull your body upward.",
          "Lower yourself with control.",
        ],
      },
      {
        id: "local-back-4",
        name: "Superman",
        bodyPart: "back",
        equipment: "body weight",
        target: "lower back",
        instructions: [
          "Lie face down.",
          "Extend your arms forward.",
          "Lift your arms and legs slightly from the floor.",
          "Hold briefly and lower with control.",
        ],
      },
      {
        id: "local-back-5",
        name: "Cable Row",
        bodyPart: "back",
        equipment: "cable",
        target: "middle back",
        instructions: [
          "Sit upright at the cable station.",
          "Pull the handle toward your torso.",
          "Keep your shoulders controlled.",
          "Return the handle slowly.",
        ],
      },

      // SHOULDERS
      {
        id: "local-shoulder-1",
        name: "Dumbbell Shoulder Press",
        bodyPart: "shoulders",
        equipment: "dumbbell",
        target: "delts",
        instructions: [
          "Hold dumbbells at shoulder height.",
          "Press them overhead.",
          "Keep your core stable.",
          "Lower them slowly.",
        ],
      },
      {
        id: "local-shoulder-2",
        name: "Dumbbell Lateral Raise",
        bodyPart: "shoulders",
        equipment: "dumbbell",
        target: "delts",
        instructions: [
          "Stand holding dumbbells at your sides.",
          "Raise your arms outward.",
          "Stop around shoulder height.",
          "Lower slowly.",
        ],
      },
      {
        id: "local-shoulder-3",
        name: "Front Raise",
        bodyPart: "shoulders",
        equipment: "dumbbell",
        target: "front delts",
        instructions: [
          "Hold dumbbells in front of your thighs.",
          "Raise your arms forward.",
          "Stop around shoulder height.",
          "Lower with control.",
        ],
      },
      {
        id: "local-shoulder-4",
        name: "Pike Push-Up",
        bodyPart: "shoulders",
        equipment: "body weight",
        target: "delts",
        instructions: [
          "Start in a downward-facing position.",
          "Keep your hips elevated.",
          "Bend your elbows and lower your head.",
          "Push yourself back up.",
        ],
      },

      // ARMS
      {
        id: "local-arms-1",
        name: "Dumbbell Bicep Curl",
        bodyPart: "upper arms",
        equipment: "dumbbell",
        target: "biceps",
        instructions: [
          "Hold dumbbells at your sides.",
          "Keep your elbows close to your body.",
          "Curl the dumbbells upward.",
          "Lower slowly.",
        ],
      },
      {
        id: "local-arms-2",
        name: "Hammer Curl",
        bodyPart: "upper arms",
        equipment: "dumbbell",
        target: "biceps",
        instructions: [
          "Hold dumbbells with neutral grips.",
          "Keep your elbows close to your body.",
          "Curl the weights upward.",
          "Lower them slowly.",
        ],
      },
      {
        id: "local-arms-3",
        name: "Tricep Dips",
        bodyPart: "upper arms",
        equipment: "body weight",
        target: "triceps",
        instructions: [
          "Position your hands on stable parallel surfaces.",
          "Lower your body by bending your elbows.",
          "Keep your shoulders controlled.",
          "Push yourself back up.",
        ],
      },
      {
        id: "local-arms-4",
        name: "Dumbbell Overhead Tricep Extension",
        bodyPart: "upper arms",
        equipment: "dumbbell",
        target: "triceps",
        instructions: [
          "Hold one dumbbell overhead.",
          "Bend your elbows to lower it behind your head.",
          "Keep your upper arms stable.",
          "Extend your elbows.",
        ],
      },
      {
        id: "local-arms-5",
        name: "Cable Tricep Pushdown",
        bodyPart: "upper arms",
        equipment: "cable",
        target: "triceps",
        instructions: [
          "Stand facing the cable machine.",
          "Keep your elbows close to your sides.",
          "Push the handle downward.",
          "Return slowly.",
        ],
      },

      // LEGS
      {
        id: "local-legs-1",
        name: "Bodyweight Squat",
        bodyPart: "upper legs",
        equipment: "body weight",
        target: "quads",
        instructions: [
          "Stand with feet about shoulder width apart.",
          "Push your hips back and bend your knees.",
          "Lower into a comfortable squat.",
          "Stand back up.",
        ],
      },
      {
        id: "local-legs-2",
        name: "Dumbbell Goblet Squat",
        bodyPart: "upper legs",
        equipment: "dumbbell",
        target: "quads",
        instructions: [
          "Hold a dumbbell close to your chest.",
          "Squat while keeping your chest upright.",
          "Drive through your feet.",
          "Return to standing.",
        ],
      },
      {
        id: "local-legs-3",
        name: "Barbell Squat",
        bodyPart: "upper legs",
        equipment: "barbell",
        target: "quads",
        instructions: [
          "Position the bar securely across your upper back.",
          "Brace your core.",
          "Squat down with control.",
          "Drive through your feet to stand.",
        ],
      },
      {
        id: "local-legs-4",
        name: "Dumbbell Lunges",
        bodyPart: "upper legs",
        equipment: "dumbbell",
        target: "quads",
        instructions: [
          "Stand holding dumbbells.",
          "Step forward with one leg.",
          "Lower your hips toward the floor.",
          "Push back to the starting position.",
        ],
      },
      {
        id: "local-legs-5",
        name: "Glute Bridge",
        bodyPart: "upper legs",
        equipment: "body weight",
        target: "glutes",
        instructions: [
          "Lie on your back with knees bent.",
          "Place your feet flat on the floor.",
          "Drive your hips upward.",
          "Squeeze your glutes and lower slowly.",
        ],
      },
      {
        id: "local-legs-6",
        name: "Romanian Deadlift",
        bodyPart: "upper legs",
        equipment: "dumbbell",
        target: "hamstrings",
        instructions: [
          "Hold dumbbells in front of your thighs.",
          "Hinge at the hips while keeping your back neutral.",
          "Lower the weights toward your legs.",
          "Drive your hips forward to stand.",
        ],
      },

      // LOWER LEGS
      {
        id: "local-calves-1",
        name: "Standing Calf Raise",
        bodyPart: "lower legs",
        equipment: "body weight",
        target: "calves",
        instructions: [
          "Stand upright.",
          "Raise your heels from the floor.",
          "Pause at the top.",
          "Lower slowly.",
        ],
      },
      {
        id: "local-calves-2",
        name: "Dumbbell Calf Raise",
        bodyPart: "lower legs",
        equipment: "dumbbell",
        target: "calves",
        instructions: [
          "Hold dumbbells at your sides.",
          "Raise your heels.",
          "Pause at the top.",
          "Lower under control.",
        ],
      },

      // CORE
      {
        id: "local-core-1",
        name: "Plank",
        bodyPart: "waist",
        equipment: "body weight",
        target: "abs",
        instructions: [
          "Place your forearms on the floor.",
          "Extend your legs behind you.",
          "Keep your body in a straight line.",
          "Brace your core and hold.",
        ],
      },
      {
        id: "local-core-2",
        name: "Crunch",
        bodyPart: "waist",
        equipment: "body weight",
        target: "abs",
        instructions: [
          "Lie on your back with knees bent.",
          "Place your hands behind or beside your head.",
          "Lift your shoulders from the floor.",
          "Lower slowly.",
        ],
      },
      {
        id: "local-core-3",
        name: "Dead Bug",
        bodyPart: "waist",
        equipment: "body weight",
        target: "abs",
        instructions: [
          "Lie on your back with arms extended upward.",
          "Lift your legs into a tabletop position.",
          "Lower opposite arm and leg.",
          "Return and alternate sides.",
        ],
      },

      // CARDIO
      {
        id: "local-cardio-1",
        name: "Jumping Jacks",
        bodyPart: "cardio",
        equipment: "body weight",
        target: "cardiovascular system",
        instructions: [
          "Stand upright.",
          "Jump while moving your arms and legs outward.",
          "Return to the starting position.",
          "Repeat at a controlled pace.",
        ],
      },
      {
        id: "local-cardio-2",
        name: "High Knees",
        bodyPart: "cardio",
        equipment: "body weight",
        target: "cardiovascular system",
        instructions: [
          "Stand upright.",
          "Drive one knee upward.",
          "Alternate legs quickly.",
          "Keep your core engaged.",
        ],
      },
      {
        id: "local-cardio-3",
        name: "Mountain Climbers",
        bodyPart: "cardio",
        equipment: "body weight",
        target: "cardiovascular system",
        instructions: [
          "Start in a high plank.",
          "Drive one knee toward your chest.",
          "Switch legs.",
          "Continue alternating.",
        ],
      },
    ];
  }

  /* =========================================================
     API / RATE LIMIT
     ========================================================= */

  async throttleRequest() {
    if (this.isGenerating) {
      throw {
        code: "REQUEST_IN_PROGRESS",
        message: "A workout generation is already in progress. Please wait.",
      };
    }

    this.isGenerating = true;

    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < 1000) {
      await new Promise(resolve =>
        setTimeout(resolve, 1000 - elapsed)
      );
    }

    this.lastRequestTime = Date.now();
  }

  markApiUnavailable() {
    this.apiUnavailableUntil = Date.now() + this.apiRetryAfter;
  }

  isApiAvailable() {
    return Date.now() >= this.apiUnavailableUntil;
  }

  async fetchExercises(endpoint, params = {}) {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;

    const cached = this.cache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.timestamp < this.cacheDuration
    ) {
      return cached.data;
    }

    // Do not repeatedly call an API that just told us it is unavailable.
    if (!this.isApiAvailable()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/${endpoint}`;

      console.log(`📡 ExerciseDB request: ${url}`);

      const response = await axios.get(url, {
        params,
        timeout: 12000,
      });

      const responseData = response.data;

      let exercisesArray = [];

      if (Array.isArray(responseData)) {
        exercisesArray = responseData;
      } else if (Array.isArray(responseData?.data)) {
        exercisesArray = responseData.data;
      } else if (Array.isArray(responseData?.results)) {
        exercisesArray = responseData.results;
      }

      this.cache.set(cacheKey, {
        data: exercisesArray,
        timestamp: Date.now(),
      });

      console.log(
        `✅ ExerciseDB returned ${exercisesArray.length} exercises`
      );

      return exercisesArray;
    } catch (error) {
      const status = error?.response?.status;

      console.error(
        `❌ ExerciseDB ${endpoint} failed:`,
        status || error?.code,
        error?.message
      );

      if (status === 402) {
        console.warn(
          "⚠️ ExerciseDB returned 402. Switching to local exercise database."
        );

        this.markApiUnavailable();

        return [];
      }

      if (status === 401 || status === 403) {
        console.warn(
          "⚠️ ExerciseDB authorization/access error. Using local exercises."
        );

        this.markApiUnavailable();

        return [];
      }

      if (status >= 500) {
        this.markApiUnavailable();
        return [];
      }

      if (error?.code === "ECONNABORTED") {
        return [];
      }

      if (!error?.response) {
        return [];
      }

      return [];
    }
  }

  /* =========================================================
     NORMALIZATION
     ========================================================= */

  normalizeGoal(goal) {
    const value = String(goal || "").toLowerCase().trim();

    const map = {
      "muscle gain": "Build Muscle",
      "build muscle": "Build Muscle",
      "gain muscle": "Build Muscle",
      "weight loss": "Lose Weight",
      "lose weight": "Lose Weight",
      "fat loss": "Lose Weight",
      strength: "Strength",
      "get stronger": "Strength",
      endurance: "Endurance",
      stamina: "Endurance",
      toning: "Toning",
      "tone up": "Toning",
      "get toned": "Toning",
    };

    return map[value] || "Build Muscle";
  }

  normalizeExperience(experience) {
    const value = String(experience || "Beginner")
      .toLowerCase()
      .trim();

    if (value.includes("advanced")) return "advanced";
    if (value.includes("intermediate")) return "intermediate";

    return "beginner";
  }

  cleanBodyPartName(bodyPart) {
    const mappings = {
      chest: "chest",
      back: "back",
      shoulders: "shoulders",
      "upper arms": "upper arms",
      "lower arms": "upper arms",
      "upper legs": "upper legs",
      "lower legs": "lower legs",
      waist: "waist",
      cardio: "cardio",
      triceps: "upper arms",
      biceps: "upper arms",
      abs: "waist",
      core: "waist",
      glutes: "upper legs",
      hamstrings: "upper legs",
      quads: "upper legs",
      calves: "lower legs",
      forearms: "upper arms",
    };

    const value = String(bodyPart || "").toLowerCase().trim();

    return mappings[value] || value;
  }

  cleanEquipmentName(equipment) {
    const value = String(equipment || "")
      .toLowerCase()
      .trim();

    const mappings = {
      "body weight": "body weight",
      bodyweight: "body weight",
      "no equipment": "body weight",
      dumbbell: "dumbbell",
      barbell: "barbell",
      kettlebell: "kettlebell",
      cable: "cable",
      "cable machine": "cable",
      machine: "machine",
      band: "band",
      "resistance band": "band",
      "smith machine": "smith machine",
    };

    return mappings[value] || value;
  }

  /* =========================================================
     EQUIPMENT
     ========================================================= */

  getEquipmentFilter(userEquipment) {
    if (!userEquipment) {
      return [];
    }

    let equipmentList = [];

    if (Array.isArray(userEquipment)) {
      equipmentList = userEquipment;
    } else {
      equipmentList = [userEquipment];
    }

    const filters = [];

    equipmentList.forEach(item => {
      const value = String(item || "").trim();

      if (!value) return;

      const lower = value.toLowerCase();

      if (
        lower === "everything" ||
        lower === "full gym" ||
        lower === "fullgym"
      ) {
        return;
      }

      if (
        lower.includes("no equipment") ||
        lower === "bodyweight" ||
        lower === "body weight"
      ) {
        filters.push("body weight");
        return;
      }

      if (lower.includes("dumbbell")) {
        filters.push("dumbbell");
        return;
      }

      if (lower.includes("barbell")) {
        filters.push("barbell");
        return;
      }

      if (
        lower.includes("band") ||
        lower.includes("resistance band")
      ) {
        filters.push("band");
        return;
      }

      if (lower.includes("cable")) {
        filters.push("cable");
        return;
      }

      if (lower.includes("smith")) {
        filters.push("smith machine");
        return;
      }

      if (lower.includes("machine")) {
        filters.push("machine");
      }
    });

    return [...new Set(filters)];
  }

  exerciseMatchesEquipment(exercise, equipmentFilters) {
    if (!equipmentFilters.length) {
      return true;
    }

    const equipment = String(
      exercise.equipment ||
      exercise.equipments?.[0] ||
      ""
    ).toLowerCase();

    return equipmentFilters.some(filter => {
      const normalized = filter.toLowerCase();

      if (normalized === "machine") {
        return (
          equipment.includes("machine") ||
          equipment.includes("leverage")
        );
      }

      return (
        equipment.includes(normalized) ||
        normalized.includes(equipment)
      );
    });
  }

  /* =========================================================
     WORKOUT SPLITS
     ========================================================= */

  getWorkoutTemplate(userData) {
    const goal = this.normalizeGoal(userData.goal);

    const experience = this.normalizeExperience(
      userData.gymExperience
    );

    const days = Math.min(
      7,
      Math.max(
        1,
        parseInt(userData.weeklyWorkoutCommitment, 10) || 3
      )
    );

    const templates = {
      "Build Muscle": {
        focus: "Muscle Growth",
        split: this.getMuscleBuildingSplit(days),
        sets: {
          beginner: 3,
          intermediate: 4,
          advanced: 4,
        },
        reps: {
          beginner: "8-12",
          intermediate: "6-10",
          advanced: "4-8",
        },
        rest: 60,
      },

      "Lose Weight": {
        focus: "Fat Loss",
        split: this.getFatLossSplit(days),
        sets: {
          beginner: 2,
          intermediate: 3,
          advanced: 3,
        },
        reps: {
          beginner: "12-15",
          intermediate: "10-15",
          advanced: "8-12",
        },
        rest: 30,
      },

      Strength: {
        focus: "Strength",
        split: this.getStrengthSplit(days),
        sets: {
          beginner: 3,
          intermediate: 4,
          advanced: 5,
        },
        reps: {
          beginner: "5-8",
          intermediate: "3-6",
          advanced: "1-5",
        },
        rest: 90,
      },

      Endurance: {
        focus: "Endurance",
        split: this.getEnduranceSplit(days),
        sets: {
          beginner: 2,
          intermediate: 3,
          advanced: 3,
        },
        reps: {
          beginner: "15-20",
          intermediate: "12-20",
          advanced: "10-15",
        },
        rest: 30,
      },

      Toning: {
        focus: "Toning",
        split: this.getToningSplit(days),
        sets: {
          beginner: 3,
          intermediate: 3,
          advanced: 4,
        },
        reps: {
          beginner: "12-15",
          intermediate: "10-15",
          advanced: "8-12",
        },
        rest: 45,
      },
    };

    return {
      ...(templates[goal] || templates["Build Muscle"]),
      goal,
      experience,
    };
  }

  getMuscleBuildingSplit(days) {
    const splits = {
      1: ["Full Body"],
      2: ["Upper Body", "Lower Body"],
      3: ["Push", "Pull", "Legs"],
      4: ["Push", "Pull", "Legs", "Upper Body"],
      5: ["Push", "Pull", "Legs", "Upper Body", "Lower Body"],
      6: [
        "Push",
        "Pull",
        "Legs",
        "Push",
        "Pull",
        "Legs",
      ],
      7: [
        "Push",
        "Pull",
        "Legs",
        "Upper Body",
        "Lower Body",
        "Cardio",
        "Rest",
      ],
    };

    return splits[days] || splits[3];
  }

  getFatLossSplit(days) {
    const splits = {
      1: ["Full Body HIIT"],
      2: ["Cardio + Strength", "HIIT Circuit"],
      3: ["HIIT Upper", "HIIT Lower", "Cardio"],
      4: ["Circuit A", "Circuit B", "HIIT", "Cardio"],
      5: [
        "Full Body HIIT",
        "Upper Circuit",
        "Lower Circuit",
        "Cardio",
        "Active Recovery",
      ],
      6: [
        "HIIT",
        "Strength",
        "Cardio",
        "HIIT",
        "Strength",
        "Active Recovery",
      ],
      7: [
        "HIIT",
        "Circuit",
        "Cardio",
        "Strength",
        "Core",
        "Active Recovery",
        "Rest",
      ],
    };

    return splits[days] || splits[3];
  }

  getStrengthSplit(days) {
    const splits = {
      1: ["Full Body Strength"],
      2: ["Upper Strength", "Lower Strength"],
      3: ["Squat Focus", "Bench Focus", "Deadlift Focus"],
      4: [
        "Heavy Upper",
        "Heavy Lower",
        "Accessory Upper",
        "Accessory Lower",
      ],
      5: [
        "Squat",
        "Bench",
        "Deadlift",
        "Overhead Press",
        "Accessory",
      ],
      6: [
        "Heavy Push",
        "Heavy Pull",
        "Heavy Legs",
        "Accessory Push",
        "Accessory Pull",
        "Accessory Legs",
      ],
      7: [
        "Squat",
        "Bench",
        "Deadlift",
        "Overhead Press",
        "Accessory",
        "Mobility",
        "Rest",
      ],
    };

    return splits[days] || splits[3];
  }

  getEnduranceSplit(days) {
    const splits = {
      1: ["Long Cardio"],
      2: ["Cardio + Strength", "Endurance Cardio"],
      3: ["Running", "Cycling", "Cardio"],
      4: [
        "Cardio",
        "Strength Endurance",
        "Cardio",
        "Active Recovery",
      ],
      5: [
        "Running",
        "Cycling",
        "Cardio",
        "Strength",
        "Active Recovery",
      ],
      6: [
        "Long Cardio",
        "Interval Training",
        "Strength",
        "Cardio",
        "Active Recovery",
        "Rest",
      ],
      7: [
        "Running",
        "Cycling",
        "Cardio",
        "Strength",
        "Core",
        "Active Recovery",
        "Rest",
      ],
    };

    return splits[days] || splits[3];
  }

  getToningSplit(days) {
    const splits = {
      1: ["Full Body Tone"],
      2: ["Upper Tone", "Lower Tone"],
      3: ["Push Tone", "Pull Tone", "Legs Tone"],
      4: [
        "Upper Body",
        "Lower Body",
        "Core Focus",
        "Cardio Tone",
      ],
      5: [
        "Chest & Triceps",
        "Back & Biceps",
        "Legs",
        "Shoulders",
        "Core & Cardio",
      ],
      6: [
        "Upper",
        "Lower",
        "Full Body",
        "Cardio",
        "Core",
        "Active Recovery",
      ],
      7: [
        "Upper",
        "Lower",
        "Full Body",
        "Cardio",
        "Core",
        "Active Recovery",
        "Rest",
      ],
    };

    return splits[days] || splits[3];
  }

  /* =========================================================
     MUSCLE MAPPING
     ========================================================= */

  mapWorkoutDayToMuscles(workoutDay) {
    const day = String(workoutDay || "").toLowerCase();

    if (
      day.includes("rest") ||
      day.includes("recovery") ||
      day.includes("mobility")
    ) {
      return [];
    }

    if (day.includes("push")) {
      return ["chest", "shoulders", "upper arms"];
    }

    if (day.includes("pull")) {
      return ["back", "upper arms"];
    }

    if (
      day.includes("leg") ||
      day.includes("squat") ||
      day.includes("lower")
    ) {
      return ["upper legs", "lower legs"];
    }

    if (
      day.includes("upper") ||
      day.includes("bench") ||
      day.includes("overhead")
    ) {
      return ["chest", "back", "shoulders", "upper arms"];
    }

    if (
      day.includes("deadlift")
    ) {
      return ["back", "upper legs"];
    }

    if (
      day.includes("core") ||
      day.includes("ab")
    ) {
      return ["waist"];
    }

    if (
      day.includes("cardio") ||
      day.includes("hiit") ||
      day.includes("running") ||
      day.includes("cycling") ||
      day.includes("circuit")
    ) {
      return ["cardio", "upper legs"];
    }

    if (day.includes("chest")) {
      return ["chest", "upper arms"];
    }

    if (day.includes("back")) {
      return ["back", "upper arms"];
    }

    if (day.includes("shoulder")) {
      return ["shoulders", "upper arms"];
    }

    return ["chest", "back", "upper legs"];
  }

  /* =========================================================
     EXERCISE NORMALIZATION
     ========================================================= */

  normalizeExercise(exercise, fallbackMuscle) {
    if (!exercise) return null;

    const id =
      exercise.exerciseId ||
      exercise.id ||
      exercise._id ||
      `exercise-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    const bodyPart =
      exercise.bodyPart ||
      exercise.bodyParts?.[0] ||
      fallbackMuscle;

    const equipment =
      exercise.equipment ||
      exercise.equipments?.[0] ||
      "body weight";

    const target =
      exercise.target ||
      exercise.targetMuscles?.[0] ||
      fallbackMuscle;

    const instructions =
      Array.isArray(exercise.instructions)
        ? exercise.instructions
        : [
            "Perform the exercise with controlled movement.",
            "Maintain proper form throughout the movement.",
          ];

    return {
      ...exercise,
      id,
      exerciseId: id,
      name: exercise.name || "Exercise",
      bodyPart,
      bodyParts:
        exercise.bodyParts ||
        [bodyPart],
      equipment,
      equipments:
        exercise.equipments ||
        [equipment],
      target,
      targetMuscles:
        exercise.targetMuscles ||
        [target],
      instructions,
      secondaryMuscles:
        exercise.secondaryMuscles || [],
      gifUrl:
        exercise.gifUrl ||
        exercise.gifURL ||
        this.getExerciseGifUrl(id),
    };
  }

  getExerciseGifUrl(id) {
    if (!id || String(id).startsWith("local-")) {
      return null;
    }

    return `https://static.exercisedb.dev/media/${id}.gif`;
  }

  /* =========================================================
     EXERCISE FETCHING
     ========================================================= */

  async getExercisesByBodyPart(bodyPart, limit = 30) {
    const clean = this.cleanBodyPartName(bodyPart);

    const apiExercises = await this.fetchExercises(
      `bodyparts/${encodeURIComponent(clean)}/exercises`,
      { limit }
    );

    return apiExercises.map(ex =>
      this.normalizeExercise(ex, clean)
    );
  }

  async searchExercises(query, limit = 20) {
    const apiExercises = await this.fetchExercises(
      "exercises",
      {
        q: query,
        limit,
      }
    );

    return apiExercises.map(ex =>
      this.normalizeExercise(
        ex,
        this.cleanBodyPartName(query)
      )
    );
  }

  getLocalExercisesByMuscle(muscleGroup) {
    const clean = this.cleanBodyPartName(muscleGroup);

    return this.getLocalExercises()
      .filter(exercise => exercise.bodyPart === clean)
      .map(exercise =>
        this.normalizeExercise(exercise, clean)
      );
  }

  /* =========================================================
     EXPERIENCE FILTER
     ========================================================= */

  filterByExperienceLevel(exercises, experience) {
    if (!Array.isArray(exercises)) {
      return [];
    }

    if (experience !== "beginner") {
      return exercises;
    }

    const advancedKeywords = [
      "barbell snatch",
      "clean and jerk",
      "weighted",
      "plyometric",
      "explosive",
      "one arm",
    ];

    const filtered = exercises.filter(exercise => {
      const name = String(exercise.name || "").toLowerCase();

      return !advancedKeywords.some(keyword =>
        name.includes(keyword)
      );
    });

    // Never destroy the exercise list completely.
    return filtered.length > 0 ? filtered : exercises;
  }

  /* =========================================================
     EXERCISE COUNT
     ========================================================= */

  getExerciseCount(muscleGroup, experience) {
    const counts = {
      chest: {
        beginner: 2,
        intermediate: 3,
        advanced: 3,
      },
      back: {
        beginner: 2,
        intermediate: 3,
        advanced: 3,
      },
      "upper legs": {
        beginner: 3,
        intermediate: 3,
        advanced: 4,
      },
      "lower legs": {
        beginner: 1,
        intermediate: 2,
        advanced: 2,
      },
      shoulders: {
        beginner: 2,
        intermediate: 2,
        advanced: 3,
      },
      "upper arms": {
        beginner: 2,
        intermediate: 2,
        advanced: 3,
      },
      cardio: {
        beginner: 2,
        intermediate: 2,
        advanced: 3,
      },
      waist: {
        beginner: 2,
        intermediate: 2,
        advanced: 3,
      },
    };

    return (
      counts[muscleGroup]?.[experience] ||
      2
    );
  }

  selectRandomExercises(exercises, count) {
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return [];
    }

    const shuffled = [...exercises];

    for (
      let i = shuffled.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    return shuffled.slice(
      0,
      Math.min(count, shuffled.length)
    );
  }

  /* =========================================================
     BUILD ONE WORKOUT DAY
     ========================================================= */

  async selectExercisesForWorkout(
    userData,
    workoutDay
  ) {
    try {
      const template =
        this.getWorkoutTemplate(userData);

      const experience =
        template.experience;

      const muscleGroups =
        this.mapWorkoutDayToMuscles(workoutDay);

      if (!muscleGroups.length) {
        return [];
      }

      const equipmentFilters =
        this.getEquipmentFilter(
          userData.availableEquipment
        );

      const selectedExercises = [];

      for (const muscleGroup of muscleGroups) {
        let exercises = [];

        // -------------------------------------------------
        // 1. Try ExerciseDB
        // -------------------------------------------------

        if (this.isApiAvailable()) {
          exercises =
            await this.getExercisesByBodyPart(
              muscleGroup,
              40
            );
        }

        // -------------------------------------------------
        // 2. Local fallback
        // -------------------------------------------------

        if (!exercises.length) {
          exercises =
            this.getLocalExercisesByMuscle(
              muscleGroup
            );
        }

        if (!exercises.length) {
          continue;
        }

        // -------------------------------------------------
        // 3. Equipment filter
        //
        // If filtering produces zero results, use
        // bodyweight alternatives instead of leaving
        // the workout empty.
        // -------------------------------------------------

        let equipmentFiltered =
          exercises.filter(exercise =>
            this.exerciseMatchesEquipment(
              exercise,
              equipmentFilters
            )
          );

        if (
          equipmentFilters.length > 0 &&
          equipmentFiltered.length === 0
        ) {
          console.warn(
            `No ${muscleGroup} exercises matched equipment. Using bodyweight/local alternatives.`
          );

          equipmentFiltered =
            this.getLocalExercisesByMuscle(
              muscleGroup
            ).filter(exercise =>
              exercise.equipment === "body weight"
            );
        }

        if (equipmentFiltered.length > 0) {
          exercises = equipmentFiltered;
        }

        // -------------------------------------------------
        // 4. Experience filter
        // -------------------------------------------------

        exercises =
          this.filterByExperienceLevel(
            exercises,
            experience
          );

        // -------------------------------------------------
        // 5. Select exercises
        // -------------------------------------------------

        const count =
          this.getExerciseCount(
            muscleGroup,
            experience
          );

        const selected =
          this.selectRandomExercises(
            exercises,
            count
          );

        // -------------------------------------------------
        // 6. Format
        // -------------------------------------------------

        selected.forEach(exercise => {
          selectedExercises.push(
            this.formatExerciseForWorkout(
              exercise,
              template,
              experience,
              muscleGroup
            )
          );
        });
      }

      // Remove duplicate exercise IDs.
      const uniqueExercises = [];
      const seen = new Set();

      for (const exercise of selectedExercises) {
        if (!seen.has(exercise.id)) {
          seen.add(exercise.id);
          uniqueExercises.push(exercise);
        }
      }

      console.log(
        `✅ ${workoutDay}: ${uniqueExercises.length} exercises`
      );

      return uniqueExercises;
    } catch (error) {
      console.error(
        `❌ Error building ${workoutDay}:`,
        error
      );

      return [];
    }
  }

  /* =========================================================
     FORMAT EXERCISE
     ========================================================= */

  formatExerciseForWorkout(
    exercise,
    template,
    experience,
    muscleGroup
  ) {
    const normalized =
      this.normalizeExercise(
        exercise,
        muscleGroup
      );

    return {
      id: normalized.id,
      exerciseId: normalized.exerciseId,
      name: normalized.name,

      bodyPart:
        normalized.bodyPart ||
        muscleGroup,

      bodyParts:
        normalized.bodyParts ||
        [muscleGroup],

      equipment:
        normalized.equipment ||
        "body weight",

      equipments:
        normalized.equipments ||
        ["body weight"],

      target:
        normalized.target ||
        muscleGroup,

      targetMuscles:
        normalized.targetMuscles ||
        [muscleGroup],

      gifUrl:
        normalized.gifUrl || null,

      workoutDetails: {
        sets:
          template.sets[experience] || 3,

        reps:
          template.reps[experience] || "8-12",

        restSeconds:
          template.rest || 60,

        notes:
          `Focus on ${muscleGroup}`,
      },

      instructions:
        normalized.instructions || [
          "Perform with proper form and control.",
        ],

      secondaryMuscles:
        normalized.secondaryMuscles || [],
    };
  }

  /* =========================================================
     PLAN VALIDATION
     ========================================================= */

  validateWorkoutPlan(plan) {
    if (!plan) {
      return {
        valid: false,
        totalExercises: 0,
      };
    }

    const dailyWorkouts =
      plan.daily_workouts || {};

    const days = Object.values(
      dailyWorkouts
    );

    const totalExercises = days.reduce(
      (total, exercises) =>
        total +
        (Array.isArray(exercises)
          ? exercises.length
          : 0),
      0
    );

    const workoutDaysWithExercises =
      days.filter(
        exercises =>
          Array.isArray(exercises) &&
          exercises.length > 0
      ).length;

    return {
      valid:
        totalExercises > 0 &&
        workoutDaysWithExercises > 0,

      totalExercises,
      workoutDaysWithExercises,
    };
  }

  /* =========================================================
     GENERATE COMPLETE PLAN
     ========================================================= */

  async generateWorkoutPlan(userData) {
    try {
      await this.throttleRequest();

      console.log(
        "🏋️ Starting workout plan generation..."
      );

      const weeklyWorkoutCommitment = Math.min(
        7,
        Math.max(
          1,
          parseInt(
            userData.weeklyWorkoutCommitment,
            10
          ) || 3
        )
      );

      const goal =
        this.normalizeGoal(userData.goal);

      const weight =
        this.parseWeight(userData.weight);

      const height =
        this.parseHeight(userData.height);

      const template =
        this.getWorkoutTemplate({
          ...userData,
          goal,
          weeklyWorkoutCommitment,
        });

      const split = template.split;

      const dailyWorkouts = {};
      const weeklySplit = [];

      for (let i = 0; i < 7; i++) {
        const dayNumber = i + 1;

        if (i >= split.length) {
          weeklySplit.push(
            `Day ${dayNumber}: Rest`
          );

          dailyWorkouts[
            `Day ${dayNumber}`
          ] = [];

          continue;
        }

        const dayType = split[i];

        weeklySplit.push(
          `Day ${dayNumber}: ${dayType}`
        );

        console.log(
          `🏋️ Building Day ${dayNumber}: ${dayType}`
        );

        dailyWorkouts[
          `Day ${dayNumber}`
        ] =
          await this.selectExercisesForWorkout(
            userData,
            dayType
          );
      }

      const warmup =
        await this.generateWarmup();

      const cooldown =
        await this.generateCooldown();

      const nutrition =
        this.generateNutritionPlan({
          ...userData,
          weight,
          goal,
        });

      const plan = {
        userProfile:
          this.formatUserProfile(
            userData,
            weight,
            height
          ),

        goal,

        weekly_split:
          weeklySplit,

        daily_workouts:
          dailyWorkouts,

        warmup,

        cooldown,

        workout_guidelines:
          this.generateWorkoutGuidelines(
            template,
            userData
          ),

        recovery:
          this.generateRecoveryPlan(
            userData,
            weight
          ),

        nutrition,

        generatedAt:
          new Date().toISOString(),

        source:
          this.isApiAvailable()
            ? "ExerciseDB + Local Fallback"
            : "Local Exercise Database",
      };

      // -------------------------------------------------
      // IMPORTANT:
      // Never consider an empty plan successful.
      // -------------------------------------------------

      const validation =
        this.validateWorkoutPlan(plan);

      console.log(
        "📊 Workout validation:",
        validation
      );

      if (!validation.valid) {
        throw {
          code: "GENERATION_FAILED",
          message:
            "Unable to generate exercises for your workout plan.",
          details:
            "No exercises were available. Please check your workout preferences and try again.",
        };
      }

      console.log(
        `✅ Workout plan generated with ${validation.totalExercises} exercises.`
      );

      return plan;
    } catch (error) {
      console.error(
        "❌ Workout generation failed:",
        error
      );

      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  /* =========================================================
     DATA PARSING
     ========================================================= */

  parseWeight(weightInput) {
    if (!weightInput) return 70;

    const match = String(weightInput).match(
      /(\d+(?:\.\d+)?)/
    );

    if (match) {
      const weight =
        parseFloat(match[1]);

      if (
        weight >= 30 &&
        weight <= 250
      ) {
        return weight;
      }
    }

    return 70;
  }

  parseHeight(heightInput) {
    if (!heightInput) return 175;

    const match = String(heightInput).match(
      /(\d+(?:\.\d+)?)/
    );

    if (match) {
      const height =
        parseFloat(match[1]);

      // meters
      if (
        height >= 1.2 &&
        height <= 2.5
      ) {
        return Math.round(
          height * 100
        );
      }

      // centimeters
      if (
        height >= 100 &&
        height <= 250
      ) {
        return Math.round(height);
      }
    }

    return 175;
  }

  /* =========================================================
     USER PROFILE
     ========================================================= */

  formatUserProfile(
    userData,
    weight,
    height
  ) {
    return {
      name:
        userData.fullName ||
        "User",

      age:
        userData.age || 25,

      gender:
        userData.gender ||
        "Not specified",

      height:
        `${height} cm`,

      weight:
        `${weight} kg`,

      goal:
        this.normalizeGoal(
          userData.goal
        ),

      experience:
        userData.gymExperience ||
        "Beginner",

      equipment:
        Array.isArray(
          userData.availableEquipment
        )
          ? userData.availableEquipment.join(
              ", "
            )
          : userData.availableEquipment ||
            "Full Gym",

      weekly_workouts:
        userData.weeklyWorkoutCommitment ||
        "3",
    };
  }

  /* =========================================================
     NUTRITION
     ========================================================= */

  generateNutritionPlan(
    userData
  ) {
    const weight =
      this.parseWeight(
        userData.weight
      );

    const goal =
      this.normalizeGoal(
        userData.goal
      );

    const plans = {
      "Build Muscle": {
        calories:
          Math.round(weight * 35),
        protein:
          Math.round(weight * 2.2),
        carbs:
          Math.round(weight * 4),
        fat:
          Math.round(weight),
      },

      "Lose Weight": {
        calories:
          Math.round(weight * 25),
        protein:
          Math.round(weight * 2),
        carbs:
          Math.round(weight * 2),
        fat:
          Math.round(weight * 0.8),
      },

      Strength: {
        calories:
          Math.round(weight * 33),
        protein:
          Math.round(weight * 2.5),
        carbs:
          Math.round(weight * 3),
        fat:
          Math.round(weight * 1.2),
      },

      Endurance: {
        calories:
          Math.round(weight * 40),
        protein:
          Math.round(weight * 1.8),
        carbs:
          Math.round(weight * 6),
        fat:
          Math.round(weight),
      },

      Toning: {
        calories:
          Math.round(weight * 30),
        protein:
          Math.round(weight * 2),
        carbs:
          Math.round(weight * 3),
        fat:
          Math.round(weight * 0.9),
      },
    };

    const plan =
      plans[goal] ||
      plans["Build Muscle"];

    return {
      daily_calories:
        plan.calories,

      protein_g:
        plan.protein,

      carbs_g:
        plan.carbs,

      fat_g:
        plan.fat,

      meal_timing:
        "3 main meals + 2 snacks",

      hydration:
        `${Math.round(
          weight * 0.035
        )}L water daily`,

      focus:
        goal === "Lose Weight"
          ? "Calorie deficit"
          : "Performance-focused nutrition",
    };
  }

  /* =========================================================
     RECOVERY
     ========================================================= */

  generateRecoveryPlan(
    userData,
    weight
  ) {
    const hydration =
      Math.round(
        (weight || 70) * 0.035
      );

    return {
      sleep: {
        target_hours: 7,

        tips: [
          "Keep a consistent sleep schedule.",
          "Avoid screens before bedtime.",
        ],
      },

      hydration: {
        target_liters:
          hydration,

        tips: [
          "Drink water throughout the day.",
          "Hydrate before and after workouts.",
        ],
      },

      active_recovery: [
        "20 minute walk",
        "Light mobility",
        "Foam rolling",
      ],

      rest_days:
        "Rest days support recovery and adaptation.",
    };
  }

  /* =========================================================
     WARMUP / COOLDOWN
     ========================================================= */

  async generateWarmup() {
    return [
      {
        name: "Jumping Jacks",
        duration: "2 min",
        type: "cardio",
      },
      {
        name: "Arm Circles",
        duration: "1 min",
        type: "mobility",
      },
      {
        name: "Leg Swings",
        duration: "1 min",
        type: "mobility",
      },
      {
        name: "Bodyweight Squats",
        duration: "1 min",
        type: "activation",
      },
      {
        name: "Cat-Cow Stretch",
        duration: "1 min",
        type: "mobility",
      },
    ];
  }

  async generateCooldown() {
    return [
      {
        name: "Full Body Stretch",
        duration: "5 min",
        type: "stretching",
      },
      {
        name: "Deep Breathing",
        duration: "2 min",
        type: "recovery",
      },
      {
        name: "Child's Pose",
        duration: "1 min",
        type: "stretching",
      },
    ];
  }

  /* =========================================================
     GUIDELINES
     ========================================================= */

  generateWorkoutGuidelines(
    template,
    userData
  ) {
    return {
      focus:
        template.focus,

      intensity:
        "Leave approximately 2-3 reps in reserve.",

      rest_between_sets:
        `${template.rest} seconds`,

      rest_between_exercises:
        "60-90 seconds",

      progression:
        "Increase resistance gradually when all prescribed reps can be completed with good form.",

      form:
        "Prioritize controlled movement and proper form.",

      frequency:
        `${userData.weeklyWorkoutCommitment || 3} days per week`,

      warmup:
        "Always warm up for 5-10 minutes.",

      cooldown:
        "Cool down and stretch after training.",
    };
  }

  /* =========================================================
     CATEGORY API
     ========================================================= */

  async getAllBodyParts() {
    const apiData =
      await this.fetchExercises(
        "bodyparts"
      );

    if (apiData.length) {
      return apiData
        .map(item =>
          typeof item === "string"
            ? item
            : item?.name
        )
        .filter(Boolean);
    }

    return [
      "chest",
      "back",
      "shoulders",
      "upper arms",
      "upper legs",
      "lower legs",
      "waist",
      "cardio",
    ];
  }

  async getAllEquipment() {
    const apiData =
      await this.fetchExercises(
        "equipments"
      );

    if (apiData.length) {
      return apiData
        .map(item =>
          typeof item === "string"
            ? item
            : item?.name
        )
        .filter(Boolean);
    }

    return [
      "body weight",
      "dumbbell",
      "barbell",
      "cable",
      "band",
    ];
  }

  async getAllTargetMuscles() {
    const apiData =
      await this.fetchExercises(
        "muscles"
      );

    if (apiData.length) {
      return apiData
        .map(item =>
          typeof item === "string"
            ? item
            : item?.name
        )
        .filter(Boolean);
    }

    return [
      "pectorals",
      "lats",
      "delts",
      "biceps",
      "triceps",
      "quads",
      "hamstrings",
      "glutes",
      "calves",
      "abs",
    ];
  }
}

/* =========================================================
   SINGLE GENERATOR INSTANCE
   ========================================================= */

const workoutGenerator =
  new ExerciseDBWorkoutGenerator();

/* =========================================================
   PUBLIC API
   ========================================================= */

/**
 * Generates (and saves) the user's weekly workout plan by calling the
 * GymAI workout backend (Vercel-deployed Express server, see
 * `services/workoutApi.js`). The server reads the user's profile
 * server-side (from `Users/{uid}`, using the authenticated uid) and does
 * every goal/equipment/injury/template/exercise-selection decision there —
 * The local generator is retained with the exercise browsing service.
 *
 * `userData` is accepted (and still typically passed by the caller) for
 * backward compatibility, but its contents are NOT sent to the backend and
 * NOT used to make any generation decision — the server re-reads the
 * user's actual saved profile itself rather than trusting whatever the
 * client currently has in memory. This also means a slightly-stale local
 * `userData` object can no longer produce a plan that doesn't match what's
 * actually saved in Firestore.
 *
 * Error codes thrown are kept identical to before this change
 * (`VALIDATION_ERROR`, `GENERATION_FAILED`, `NETWORK_ERROR`, `TIMEOUT`) so
 * that `WorkoutGenerating.js`'s existing error-handling UI needs no changes.
 */
import {
  callGenerateWorkoutPlan,
  callCheckWeeklyPlan,
} from "./workoutApi";

export const generateExerciseDBWorkoutPlan =
  async userData => {
    try {
      console.log(
        "🚀 Requesting workout generation from the backend..."
      );

      const response = await callGenerateWorkoutPlan();
      const plan = response?.plan;

      if (!plan) {
        throw {
          code: "GENERATION_FAILED",
          message:
            "Workout generation completed without a plan.",
          details:
            "Please try again.",
        };
      }

      console.log("✅ Workout plan ready.");

      return plan;
    } catch (error) {
      console.error(
        "❌ Failed to generate workout:",
        error
      );

      // Map server error codes (e.g. "functions/failed-precondition")
      // onto this module's existing local error-code shape, so callers
      // (WorkoutGenerating.js) don't need to change their error handling.
      const firebaseCode = error?.code;
      if (typeof firebaseCode === "string" && firebaseCode.startsWith("functions/")) {
        const reason = firebaseCode.replace("functions/", "");
        if (reason === "unauthenticated") {
          throw {
            code: "VALIDATION_ERROR",
            message: "Please log in and try again.",
          };
        }
        if (reason === "failed-precondition" || reason === "invalid-argument") {
          throw {
            code: "VALIDATION_ERROR",
            message:
              error.message ||
              "Please review your questionnaire answers and try again.",
          };
        }
        if (reason === "deadline-exceeded" || reason === "unavailable") {
          throw {
            code: "NETWORK_ERROR",
            message: "Cannot reach the workout service. Check your internet.",
          };
        }
        throw {
          code: "GENERATION_FAILED",
          message:
            error.message || "Could not create workout plan.",
          details: "Please try again.",
        };
      }

      if (error?.code) {
        throw error;
      }

      throw {
        code: "GENERATION_FAILED",
        message:
          error?.message ||
          "Failed to generate workout plan.",
        details:
          "Please try again.",
      };
    }
  };

export const getExerciseCategories =
  async () => {
    try {
      const [
        bodyParts,
        equipment,
        targets,
      ] = await Promise.all([
        workoutGenerator.getAllBodyParts(),
        workoutGenerator.getAllEquipment(),
        workoutGenerator.getAllTargetMuscles(),
      ]);

      return {
        bodyParts:
          bodyParts || [],
        equipment:
          equipment || [],
        targets:
          targets || [],
      };
    } catch (error) {
      console.error(
        "Error fetching categories:",
        error
      );

      return {
        bodyParts: [],
        equipment: [],
        targets: [],
      };
    }
  };

export const searchExercises =
  async (query, limit = 10) => {
    if (!query) {
      return [];
    }

    const apiResults =
      await workoutGenerator.searchExercises(
        query,
        limit
      );

    if (apiResults.length) {
      return apiResults;
    }

    return workoutGenerator
      .getLocalExercisesByMuscle(query)
      .slice(0, limit);
  };

export const canGenerateWorkout =
  () => {
    return !workoutGenerator.isGenerating;
  };

export async function checkWeeklyPlan(userId) {
  try {
    return await callCheckWeeklyPlan();
  } catch (error) {
    console.error("Error checking weekly plan:", error);
    throw error;
  }
}
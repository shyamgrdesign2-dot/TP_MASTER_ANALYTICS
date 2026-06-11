import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiCustomModule from "../api/services/ApiCustomModule";

// Async thunk for adding a module
export const addModule = createAsyncThunk(
  "customModules/addModule",
  async ({ userId, modules }, { rejectWithValue }) => {
    try {
      const payload = {
        userId,
        modules,
      };
      const response = await ApiCustomModule.addModule(payload);
      return response; // Assuming the API returns the added module data
    } catch (error) {
      return rejectWithValue(error.response.data); // Handle API errors
    }
  }
);

export const getModules = createAsyncThunk(
  "customModules/getModules",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await ApiCustomModule.getModules(userId);

      return response; // Assuming the API returns the added module data
    } catch (error) {
      return rejectWithValue(error.response.data); // Handle API errors
    }
  }
);

export const getModuleContents = createAsyncThunk(
  "customModules/getModuleContents",
  async (tcmId, { rejectWithValue }) => {
    try {
      const response = await ApiCustomModule.getModuleContents(tcmId);
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch module contents."
      );
    }
  }
);

export const searchModule = createAsyncThunk(
  "modules/searchModuleContents",
  async ({ moduleId, keyword, fieldName }, { rejectWithValue }) => {
    try {
      const response = await ApiCustomModule.searchModule(moduleId, keyword, fieldName);
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to search module contents."
      );
    }
  }
);

export const userPreModulesRX = createAsyncThunk(
  "customModules/userPreModulesRX",
  async (data, { rejectWithValue }) => {
    try {
      const response = await ApiCustomModule.userPreModulesRX(data);
      return response; // Assuming the API returns the added module data
    } catch (error) {
      return rejectWithValue(error.response.data); // Handle API errors
    }
  }
);

export const searchModulesByHospital = createAsyncThunk(
  "customModules/searchModulesByHospital",
  async ({ hospitalId, moduleName, page, limit, departmentId }, { rejectWithValue }) => {
    try {
      const response = await ApiCustomModule.searchModulesByHospital(
        hospitalId,
        moduleName,
        page,
        limit,
        departmentId
      );
      return response; // Returns paginated modules with pagination metadata
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to search modules by hospital."
      );
    }
  }
);

export const migrateModule = createAsyncThunk(
  "customModules/migrateModule",
  async ({ userId, moduleId, migrationData }, { rejectWithValue }) => {
    try {
      const response = await ApiCustomModule.migrateModule(
        userId,
        moduleId,
        migrationData
      );
      return response; // Returns the migrated V2 module
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to migrate module."
      );
    }
  }
);

export const cloneModule = createAsyncThunk(
  "customModules/cloneModule",
  async ({ sourceUserId, sourceModuleId, targetUserId }, { rejectWithValue }) => {
    try {
      const response = await ApiCustomModule.cloneModule(
        sourceUserId,
        sourceModuleId,
        targetUserId
      );
      return response; // Returns the cloned module with new module_id and origin_id
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to clone module."
      );
    }
  }
);

const customModuleSlice = createSlice({
  name: "customModules",
  initialState: {
    customModules: [],
    moduleContents: [],
    searchModuleResults: [],
    latestSearchedModules: {},
    hospitalSearchResults: {
      modules: [],
      pagination: null,
    },
    migrationResult: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearSearchResults(state) {
      state.searchModuleResults = [];
    },
    clearHospitalSearchResults(state) {
      state.hospitalSearchResults = {
        modules: [],
        pagination: null,
      };
    },
    clearMigrationResult(state) {
      state.migrationResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addModule.fulfilled, (state, action) => {
        state.loading = false;
        const sanitizedModules = action.payload.modules.map(
          ({ created_at, updated_at, ...rest }) => rest
        );
        state.customModules = sanitizedModules;
      })
      .addCase(addModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add module.";
      })
      .addCase(getModules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getModules.fulfilled, (state, action) => {
        state.loading = false;
        const sanitizedModules = action.payload.modules.map(
          ({ created_at, updated_at, ...rest }) => rest
        );
        state.customModules = sanitizedModules;
      })
      .addCase(getModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch modules.";
      })
      .addCase(getModuleContents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getModuleContents.fulfilled, (state, action) => {
        state.loading = false;
        state.moduleContents = action.payload.moduleContents || [];
      })
      .addCase(getModuleContents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch module contents.";
      })
      .addCase(searchModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchModule.fulfilled, (state, action) => {
        state.loading = false;
        let uniqueResults = [];

        // Check if this is a field-specific search (V2 modules)
        const { fieldName } = action.meta?.arg || {};
        
        if (fieldName) {
          // For V2 modules with field-specific search, store raw API response
          // Component will extract field-specific values
          state.searchModuleResults = action.payload || [];
        } else {
          // V1 module search (legacy - title/notes based)
          // First try to get results from API response
          if (action.payload?.length) {
            uniqueResults = action.payload
              .flatMap((item) =>
                item.moduleContents
                  .filter((module) => module.content?.title)
                  .map((module) => module.content)
              )
              .reduce((acc, content) => {
                const titleSet = new Set(acc.map((entry) => entry.title));
                if (!titleSet.has(content.title)) {
                  acc.push(content);
                }
                return acc;
              }, []);
          }
          // If API response is empty, search through customModules
          else if (action.meta?.arg?.moduleId) {
            const { moduleId, keyword } = action.meta.arg;
            const targetModule = state.customModules.find(
              (module) => module.module_id === moduleId
            );

            if (targetModule?.templates?.length) {
              uniqueResults = targetModule.templates
                .flatMap((template) =>
                  template.content.filter((item) => {
                    // If keyword is provided, search in both title and notes
                    if (keyword) {
                      const searchTerm = keyword.toLowerCase();
                      return (
                        item.title?.toLowerCase().includes(searchTerm) ||
                        item.notes?.toLowerCase().includes(searchTerm)
                      );
                    }
                    // If no keyword, return all items with titles
                    return item.title;
                  })
                )
                .reduce((acc, content) => {
                  const titleSet = new Set(acc.map((entry) => entry.title));
                  if (!titleSet.has(content.title)) {
                    acc.push(content);
                  }
                  return acc;
                }, []);
            }
          }

          state.searchModuleResults = uniqueResults;

          // Update latest searched modules if moduleId is provided and no keyword
          if (action.meta?.arg?.moduleId && !action.meta?.arg?.keyword) {
            const { moduleId } = action.meta.arg;
            state.latestSearchedModules = {
              ...state.latestSearchedModules,
              [moduleId]: uniqueResults,
            };
          }
        }
      })
      .addCase(searchModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to search module contents.";
      })
      .addCase(searchModulesByHospital.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchModulesByHospital.fulfilled, (state, action) => {
        state.loading = false;
        // Sanitize modules by removing created_at and updated_at
        const sanitizedModules = (action.payload.modules || []).map(
          ({ created_at, updated_at, ...rest }) => rest
        );
        state.hospitalSearchResults = {
          modules: sanitizedModules,
          pagination: action.payload.pagination || null,
        };
      })
      .addCase(searchModulesByHospital.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to search modules by hospital.";
        state.hospitalSearchResults = {
          modules: [],
          pagination: null,
        };
      })
      .addCase(migrateModule.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.migrationResult = null;
      })
      .addCase(migrateModule.fulfilled, (state, action) => {
        state.loading = false;
        // Sanitize the migrated module
        const { created_at, updated_at, ...sanitizedModule } =
          action.payload || {};
        state.migrationResult = sanitizedModule;

        // Update the module in customModules if it exists
        const moduleIndex = state.customModules.findIndex(
          (module) => module.module_id === sanitizedModule.module_id
        );
        if (moduleIndex !== -1) {
          state.customModules[moduleIndex] = sanitizedModule;
        } else {
          // Add the migrated module to the list if it doesn't exist
          state.customModules.push(sanitizedModule);
        }
      })
      .addCase(migrateModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to migrate module.";
        state.migrationResult = null;
      })
      .addCase(cloneModule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cloneModule.fulfilled, (state, action) => {
        state.loading = false;
        // Sanitize the cloned module
        const { created_at, updated_at, ...sanitizedModule } =
          action.payload || {};
        
        // Add the cloned module to customModules
        state.customModules.push(sanitizedModule);
      })
      .addCase(cloneModule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to clone module.";
      });
  },
});

export const {
  clearSearchResults,
  clearHospitalSearchResults,
  clearMigrationResult,
} = customModuleSlice.actions;

export default customModuleSlice.reducer;

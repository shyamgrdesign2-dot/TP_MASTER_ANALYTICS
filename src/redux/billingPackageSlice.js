import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

import ApiBillingPackage from "../api/services/ApiBillingPackage";

const initialState = {
  packages: [],
  loading: false,
  error: null,
};

export const addPackage = createAsyncThunk(
  "billingPackage/addPackage",
  async (packageData) => {
    let result = {};
    result = await ApiBillingPackage.addPackage(packageData);
    // API returns data directly or wrapped in data property
    if (result.data) {
      return result.data;
    } else if (result.id) {
      return result;
    } else {
      throw Error(result.error || result.message || "Failed to add package");
    }
  }
);

export const updatePackage = createAsyncThunk(
  "billingPackage/updatePackage",
  async (packageData) => {
    const result = await ApiBillingPackage.updatePackage(packageData);
    // API returns data directly or wrapped in data property
    if (result.data) {
      return result.data;
    } else if (result.id) {
      return result;
    } else {
      throw Error(result.error || result.message || "Failed to update package");
    }
  }
);

export const deletePackage = createAsyncThunk(
  "billingPackage/deletePackage",
  async (packageId) => {
    const result = await ApiBillingPackage.deletePackage(packageId);
    // DELETE API returns 200/204 on success, or error object on failure
    if (result.status === 200 || result.status === 204 || result.statusCode === 200 || result.statusCode === 204) {
      return { id: packageId };
    } else if (result.statusCode === 404) {
      throw Error(result.message || "Package not found");
    } else {
      throw Error(result.error || result.message || "Failed to delete package");
    }
  }
);

export const getBillingPackages = createAsyncThunk(
  "billingPackage/getBillingPackages",
  async () => {
    let result = {};
    result = await ApiBillingPackage.getBillingPackages();
    // API returns array directly or wrapped in data property
    if (Array.isArray(result.data)) {
      return result.data;
    } else if (Array.isArray(result)) {
      return result;
    } else {
      throw Error(result.error || result.message || "Failed to fetch packages");
    }
  }
);

export const getPackageDetails = createAsyncThunk(
  "billingPackage/getPackageDetails",
  async (packageId) => {
    let result = {};
    result = await ApiBillingPackage.getPackageDetails(packageId);
    // If API doesn't support GET by ID, this will fail gracefully
    // Package selection uses data from list instead
    if (result.data) {
      return result.data;
    } else if (result.id) {
      return result;
    } else {
      throw Error(result.error || result.message || "Failed to fetch package details");
    }
  }
);

const billingPackageSlice = createSlice({
  name: "billingPackage",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(addPackage.pending, (state) => {
        state.loading = true;
      })
      .addCase(addPackage.fulfilled, (state, action) => {
        state.loading = false;
        const packageData = action.payload;
        const packageItem = {
          id: packageData.id,
          name: packageData.name,
          billItemIds: packageData.billItemIds || [],
          billItems: packageData.billItems || [],
          billItemsCount: packageData.billItems?.length || packageData.billItemIds?.length || 0,
        };
        state.packages.unshift(packageItem);
      })
      .addCase(addPackage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(updatePackage.pending, (state) => {
        state.loading = true;
      })
      .addCase(updatePackage.fulfilled, (state, action) => {
        state.loading = false;
        const packageData = action.payload;
        const packageItem = {
          id: packageData.id,
          name: packageData.name,
          billItemIds: packageData.billItemIds || [],
          billItems: packageData.billItems || [],
          billItemsCount: packageData.billItems?.length || packageData.billItemIds?.length || 0,
        };
        const index = state.packages.findIndex(
          (e) => e.id === packageData.id
        );
        if (index !== -1) {
          state.packages[index] = packageItem;
        }
      })
      .addCase(updatePackage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(deletePackage.pending, (state, action) => {
        const updatedData = state.packages.map((e) =>
          e.id === action.meta.arg ? { ...e, loading: true } : e
        );
        state.packages = [...updatedData];
      })
      .addCase(deletePackage.fulfilled, (state, action) => {
        const result = state.packages.filter(
          (item) => item.id !== action.payload.id
        );
        state.packages = [...result];
      })
      .addCase(deletePackage.rejected, (state, action) => {
        const updatedData = state.packages.map((e) =>
          e.id === action.meta.arg ? { ...e, loading: false } : e
        );
        state.packages = [...updatedData];
        state.error = action.error.message;
      })
      .addCase(getBillingPackages.fulfilled, (state, action) => {
        const fetchedPackages = action.payload || [];
        const formattedPackages = fetchedPackages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          billItemIds: pkg.billItemIds || [],
          billItems: pkg.billItems || [],
          billItemsCount: pkg.billItems?.length || pkg.billItemIds?.length || 0,
        }));
        // Merge: Keep existing packages that aren't in fetched list (newly created)
        // and update/add packages from server
        const existingIds = new Set(formattedPackages.map(p => p.id));
        const newPackages = state.packages.filter(p => !existingIds.has(p.id));
        state.packages = [...newPackages, ...formattedPackages];
      })
      .addCase(getBillingPackages.rejected, (state, action) => {
        state.packages = [];
        state.error = action.error.message;
      })
      .addCase(getPackageDetails.fulfilled, (state, action) => {
        // Package details are returned directly, no need to update state
      })
      .addCase(getPackageDetails.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export default billingPackageSlice.reducer;


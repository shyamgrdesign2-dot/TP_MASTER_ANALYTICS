import React, { useState, useMemo, useEffect } from "react";
import { Input, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import ModuleListItem from "./ModuleListItem";
import { getModules, searchModulesByHospital } from "../../redux/customModuleSlice";
import { getDecodedToken } from "../../utils/localStorage";
import config from "../../config";
import "./SelectExistingModuleTab.scss";

/**
 * SelectExistingModuleTab Component
 *
 * Tab content for selecting existing custom modules.
 * Includes search functionality and module list.
 *
 * @param {Function} onAddToRx - Callback when "Add to Rx" is clicked
 * @param {Function} onViewMore - Callback when "View more" is clicked
 * @param {Boolean} drawerOpen - Whether the parent drawer is open (used to reset search on close)
 */
const SelectExistingModuleTab = ({ onAddToRx, onViewMore, drawerOpen }) => {
  const dispatch = useDispatch();
  const { customModules: reduxModules, hospitalSearchResults, loading } = useSelector(
    (state) => state.customModules
  );
  const { userId, profile } = useSelector((state) => state.doctors);
  const [modules, setModules] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const decodedToken = getDecodedToken();
  const hospitalId = decodedToken?.result?.clinic_id;
  const hospital_business_id = decodedToken?.result?.hospital_business_id;
  const isApollo = config.APOLLO_BUSINESS_IDS_CM_V2?.includes(hospital_business_id);

  // Fetch modules by hospital on mount
  useEffect(() => {
    if (hospitalId && userId) {
      // Fetch user's own modules (for upsert operations)
      dispatch(getModules(userId));
      // Fetch all hospital modules (for display)
      dispatch(searchModulesByHospital({
        hospitalId,
        moduleName: "",
        page: 1,
        limit: 100,
        departmentId: profile?.dp_id
      }));
    }
  }, [hospitalId, userId, dispatch]);

  // Reset search query when drawer opens to ensure fresh state
  useEffect(() => {
    if (drawerOpen) {
      setSearchQuery("");
    }
  }, [drawerOpen]);

  // Update local modules when Redux state changes
  useEffect(() => {
    if (hospitalSearchResults?.modules && hospitalSearchResults.modules.length > 0) {
      let filteredModules = hospitalSearchResults.modules;
      // For Apollo users, filter to show only modules created by the logged-in user
      if (isApollo) {
        filteredModules = hospitalSearchResults.modules.filter(
          (module) => {
            return module.userId == userId
          }
        );
      }
      
      setModules(filteredModules);
    } else {
      setModules([]);
    }
  }, [hospitalSearchResults, isApollo, userId]);

  // Handle module deletion - refresh the list
  const handleModuleDeleted = () => {
    // Re-fetch both user's own modules and hospital modules after deletion
    dispatch(getModules(userId));
    dispatch(searchModulesByHospital({
      hospitalId,
      moduleName: searchQuery || "",
      page: 1,
      limit: 100,
      departmentId: profile?.dp_id
    }));
  };

  // Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) {
      return modules || [];
    }

    const query = searchQuery.toLowerCase().trim();
    return (modules || []).filter((module) => {
      // Search by module name
      const nameMatch = module.name?.toLowerCase().includes(query);

      // Search by creator name (check both creator_name and doctor_name)
      const creatorMatch = 
        module.creator_name?.toLowerCase().includes(query) ||
        module.doctor_name?.toLowerCase().includes(query);

      // Search by column labels (for V2 modules)
      // Check both fieldLabel and fieldName
      const columnLabelsMatch = module.namedFields?.some((field) => {
        const fieldLabelMatch = field.fieldLabel?.toLowerCase().includes(query);
        const fieldNameMatch = field.fieldName?.toLowerCase().includes(query);
        return fieldLabelMatch || fieldNameMatch;
      });

      return nameMatch || creatorMatch || columnLabelsMatch;
    });
  }, [modules, searchQuery]);

  return (
    <div className="select-existing-module-tab">
      <div className="select-existing-module-tab__search">
        <div className="select-existing-module-tab__search-wrapper">
          <Input
            placeholder="Search by Module Name/Creator/Column Labels"
            allowClear
            onPressEnter={(e) => setSearchQuery(e.target.value)}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined />}
            className="select-existing-module-tab__search-input"
            value={searchQuery}
          />
        </div>
      </div>

      <div className="select-existing-module-tab__list">
        {loading ? (
          <div className="select-existing-module-tab__loading">
            <Spin size="large" />
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="select-existing-module-tab__empty">
            {searchQuery
              ? "No modules found matching your search."
              : "No custom modules available."}
          </div>
        ) : (
          filteredModules.map((module) => (
            <ModuleListItem
              key={module.module_id}
              module={module}
              onAddToRx={onAddToRx}
              onViewMore={onViewMore}
              onDelete={handleModuleDeleted}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SelectExistingModuleTab;

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AutoComplete, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { searchModule } from "../../redux/customModuleSlice";
import { removeBeforeWhiteSpace } from "../../utils/utils";

/**
 * CustomModuleFieldAutoComplete Component
 *
 * Reusable AutoComplete component for custom module fields with:
 * - Frequently used values from templates
 * - Search API integration (when query > 3 chars)
 * - Template filtering (when query <= 3 chars)
 * - Custom value creation support
 *
 * @param {String} fieldName - Field identifier (e.g., "DietType")
 * @param {String} fieldLabel - Display label (e.g., "Diet Type")
 * @param {String} value - Current field value
 * @param {Function} onChange - Callback when value changes
 * @param {String} moduleId - Module ID for API calls
 * @param {Array} templates - All templates for this module
 * @param {String} placeholder - Placeholder text
 * @param {Boolean} disabled - Disable the input
 * @param {String} className - Additional CSS classes
 * @param {Boolean} autoFocus - Auto focus on mount
 */
const CustomModuleFieldAutoComplete = ({
  fieldName,
  fieldLabel,
  value,
  onChange,
  moduleId,
  templates = [],
  placeholder,
  disabled = false,
  className = "",
  autoFocus = false,
}) => {
  const dispatch = useDispatch();
  const { searchModuleResults, loading } = useSelector(
    (state) => state.customModules
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState([]);

  // Extract frequently used values from templates for this specific field
  const frequentlyUsedValues = useMemo(() => {
    const values = new Set();
    templates.forEach((template) => {
      if (template.content && Array.isArray(template.content)) {
        template.content.forEach((item) => {
          const fieldValue = item[fieldName];
          if (fieldValue && fieldValue.trim()) {
            values.add(fieldValue.trim());
          }
        });
      }
    });
    return Array.from(values);
  }, [templates, fieldName]);

  // Filter templates locally when query <= 3 chars
  const filteredTemplateValues = useMemo(() => {
    if (!searchQuery || searchQuery.length > 3) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const values = new Set();
    
    templates.forEach((template) => {
      if (template.content && Array.isArray(template.content)) {
        template.content.forEach((item) => {
          const fieldValue = item[fieldName];
          if (
            fieldValue &&
            fieldValue.trim() &&
            fieldValue.toLowerCase().includes(query)
          ) {
            values.add(fieldValue.trim());
          }
        });
      }
    });
    
    return Array.from(values);
  }, [templates, fieldName, searchQuery]);

  // Call search API when query > 3 chars
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 3) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchModule({
            moduleId,
            keyword: searchQuery.trim(),
            fieldName,
          })
        );
      }, 1000);
      return () => {
        clearTimeout(timeOutId);
      };
    }
  }, [searchQuery, moduleId, fieldName, dispatch]);

  // Build options from API results or filtered templates
  useEffect(() => {
    const data = [];

    // If no search query, show frequently used
    if (!searchQuery || searchQuery.trim().length === 0) {
      if (frequentlyUsedValues.length > 0) {
        data.push({
          key: -1,
          label: <div className="fw-medium">FREQUENTLY USED</div>,
        });
        frequentlyUsedValues.forEach((val) => {
          data.push({
            key: JSON.stringify({ value: val }),
            value: val,
            label: <div>{val}</div>,
          });
        });
      }
    }
    // If query <= 3 chars, show filtered template values
    else if (searchQuery.trim().length <= 3) {
      filteredTemplateValues.forEach((val) => {
        data.push({
          key: JSON.stringify({ value: val }),
          value: val,
          label: <div>{val}</div>,
        });
      });

      // Add custom value option if not in filtered results
      const queryTrimmed = searchQuery.trim();
      if (
        queryTrimmed &&
        !filteredTemplateValues.some(
          (v) => v.toLowerCase() === queryTrimmed.toLowerCase()
        )
      ) {
        data.push({
          key: JSON.stringify({ value: queryTrimmed, isCustom: true }),
          value: queryTrimmed,
          label: (
            <div>
              {queryTrimmed}
              <i className="icon-Add mx-1 text-primary fs-6"></i>{" "}
              <span className="fw-medium text-decoration-underline text-primary">
                {" "}
                Add Custom
              </span>
            </div>
          ),
        });
      }
    }
    // If query > 3 chars, show API results
    else {
      if (searchModuleResults && Array.isArray(searchModuleResults)) {
        const apiValues = new Set();
        searchModuleResults.forEach((result) => {
          if (result.moduleContents && Array.isArray(result.moduleContents)) {
            result.moduleContents.forEach((moduleContent) => {
              if (
                moduleContent.content &&
                moduleContent.content[fieldName]
              ) {
                const fieldValue = moduleContent.content[fieldName];
                if (fieldValue && fieldValue.trim()) {
                  apiValues.add(fieldValue.trim());
                }
              }
            });
          }
        });

        Array.from(apiValues).forEach((val) => {
          data.push({
            key: JSON.stringify({ value: val }),
            value: val,
            label: <div>{val}</div>,
          });
        });

        // Add custom value option if not in API results
        const queryTrimmed = searchQuery.trim();
        if (
          queryTrimmed &&
          !Array.from(apiValues).some(
            (v) => v.toLowerCase() === queryTrimmed.toLowerCase()
          )
        ) {
          data.push({
            key: JSON.stringify({ value: queryTrimmed, isCustom: true }),
            value: queryTrimmed,
            label: (
              <div>
                {queryTrimmed}
                <i className="icon-Add mx-1 text-primary fs-6"></i>{" "}
                <span className="fw-medium text-decoration-underline text-primary">
                  {" "}
                  Add Custom
                </span>
              </div>
            ),
          });
        }
      }
    }

    setOptions(data);
  }, [
    searchQuery,
    frequentlyUsedValues,
    filteredTemplateValues,
    searchModuleResults,
    fieldName,
  ]);

  const handleChange = useCallback(
    (val) => {
      // Update parent value as user types (for controlled component)
      const trimmedVal = removeBeforeWhiteSpace(val || "");
      onChange(trimmedVal);
      // Update search query for filtering/API calls
      setSearchQuery(trimmedVal);
    },
    [onChange]
  );

  const onSearch = useCallback(
    (query) => {
      // Only update search query for filtering/API calls
      // Value update is handled by onChange
      const trimmedQuery = removeBeforeWhiteSpace(query);
      setSearchQuery(trimmedQuery);
    },
    []
  );

  const onSelect = useCallback(
    (selectedValue, option) => {
      if (option && option.key && option.key !== "-1") {
        try {
          const parsed = JSON.parse(option.key);
          onChange(parsed.value || selectedValue);
        } catch (e) {
          onChange(selectedValue);
        }
      } else {
        onChange(selectedValue);
      }
      setSearchQuery("");
    },
    [onChange]
  );

  return (
    <AutoComplete
      value={value || ""}
      onChange={handleChange}
      onSearch={onSearch}
      onSelect={onSelect}
      options={options}
      className={className}
      bordered={false}
      placeholder={placeholder || `Enter ${fieldLabel}`}
      disabled={disabled}
      defaultActiveFirstOption={true}
      autoFocus={autoFocus}
      notFoundContent={loading ? <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} /> : null}
      popupClassName={!searchQuery && frequentlyUsedValues.length > 0 ? "boxpopup" : ""}
      style={{ height: "58px" }}
    />
  );
};

export default CustomModuleFieldAutoComplete;


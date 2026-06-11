import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Button, Card, Row, Col, Input } from "antd";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import { useSelector, useDispatch } from "react-redux";

import { capitalizeAfterSentence, getClinicName } from "../../utils/utils";

import CashManagerContext from "../../context/CashManagerContext";
import { searchExamination } from "../../redux/surgicalSlice";
import { updateDragDrop } from "../../redux/doctorsSlice";

import LoopingVideo from "../common/LoopingVideo";

import TabSearchHeader from "./TabSearchHeader";

import { SortableContainer, SortableElement } from "react-sortable-hoc";
import { useLocation } from "react-router-dom";
import { GB_APOLLO_DISABLE_FEATURE } from "../../utils/constants";
import { ASSETS } from "../../assets";
const {
  dragChips_2: dragChipsWebm,
  dragChips: dragChipsMp4,
  tagNew,
} = ASSETS.images;

function TabSurgicalSearch({ passIndex, onClose }) {
  const { parentOptionsList, childOptionsList } = useSelector(
    (state) => state.surgical
  );
  const { dragDrop } = useSelector((state) => state.doctors);
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);

  const { state } = useLocation();
  const { patient_data } = state;

  const { surgeriesData, setSurgeriesData,  } =
    useContext(CashManagerContext);

  const [searchChildQuery, setSearchChildQuery] = useState("");
  const [childSearchOptions, setChildSearchOptions] = useState([]);

  const [selectedIndex, setSelectedIndex] = useState(passIndex);

  const isApolloHosBusinessIdAccessableFromGB = useFeatureIsOn(GB_APOLLO_DISABLE_FEATURE);

  //Parent AutoComplete
  useEffect(() => {
    if (searchChildQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchExamination({ searchQuery: searchChildQuery, type: "child" })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    }
  }, [searchChildQuery]);

  useEffect(() => {
    const data = [];
    childOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e}),
        value: e.name,
      });
    });
    if (searchChildQuery.length > 0) {
      searchChildQuery && !isApolloHosBusinessIdAccessableFromGB &&
        data.push({
          key: JSON.stringify({
            change: 1,
            name: searchChildQuery,
          }),
          value: searchChildQuery,
        });
    }
    setChildSearchOptions(data);
  }, [childOptionsList]);

  const onSearchParent = useCallback(
    (query) => {
      setSearchChildQuery(query);
    },
    [searchChildQuery]
  );

  const onSelectParent = useCallback(
    (e) => {
      surgeriesData.push({
        ...e,
        notes: "",
      });
      setSurgeriesData((prev) => [...prev]);
      setSelectedIndex(surgeriesData.length - 1);
      setSearchChildQuery("");
      window.Moengage.track_event("TP_Surgery_added", {
        clinic_name: getClinicName(profile?.hospital_data),
        doctor_id: profile?.doctor_unique_id,
        patient_number: patient_data?.pm_contact_no,
        patient_id: patient_data?.patient_unique_id,
      });
    },
    [surgeriesData, selectedIndex]
  );

  const onRemoveRow = (index) => {
    surgeriesData.splice(index, 1);
    setSurgeriesData((prev) => [...prev]);
    setSelectedIndex(null);
  };

  // Tour Drag & Drop
  const [tourOpen, setTourOpen] = useState(false);
  const tourRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      if (surgeriesData?.length > 1 && !dragDrop?.surgeries) {
        setTourOpen(true);
      }
    }, 400);
  }, [surgeriesData]);

  const onTourHandle = () => {
    setTourOpen(!tourOpen);
    dispatch(updateDragDrop("surgeries"));
  };

  const steps = [
    {
      description: (
        <>
          <div className="fw-medium fs-18 pt-3">
            Reorder chips <img className="img-fluid ms-2" src={tagNew} />
          </div>
          <div className="pt-1">Hold and drag the chips to reorder them.</div>
          <LoopingVideo
            webm={dragChipsWebm}
            mp4={dragChipsMp4}
            className="img-fluid my-2 rounded-2"
            style={{ backgroundColor: "#E2E2EA80" }}
            width={329}
            height={107}
            ariaLabel="Drag to reorder"
          />
        </>
      ),
      target: () => tourRef.current,
      nextButtonProps: {
        children: "Okay",
        onClick: onTourHandle,
      },
    },
  ];

  // Drag & Drop
  const SortableItem = SortableElement(({ item }) => (
    <div
      style={{
        width:
          item.name.length > 12 && item.name.length < 24
            ? `${item.name.length * 10.5}px`
            : item.name.length >= 24
            ? "256px"
            : "150px",
        zIndex: 9999,
      }}
      className={`${
        selectedIndex == item.index && "closable-chips-active"
      } d-flex align-items-center justify-content-between text-truncate closable-chips`}
    >
      <div
        className="text-truncate p-2"
        onClick={() => {
          setSelectedIndex(item.index);
        }}
      >
        <div className="text-truncate">
          {item.name}
          {item.notes ? (
            <div className="text-truncate small">{item.notes}</div>
          ) : (
            <div className="text-truncate small">Add Details</div>
          )}
        </div>
      </div>
      <Button
        type="text"
        className="rounded-0 btn-close-chips"
        onClick={() => onRemoveRow(item.index)}
      >
        <i className="icon-Cross"></i>
      </Button>
    </div>
  ));

  const SortableList = SortableContainer(({ items }) => {
    return (
      <div className="d-flex flex-wrap">
        {items.map((item, index) => (
          <SortableItem
            key={`item-${index}`}
            index={index}
            item={{ ...item, index }}
          />
        ))}
      </div>
    );
  });

  const TABLE_EXAMINATION = useMemo(() => {
    return (
      surgeriesData.length > 0 && (
        <SortableList
          items={surgeriesData}
          onSortEnd={({ oldIndex, newIndex }) => {
            const newExaminationData = [...surgeriesData];
            const [movedItem] = newExaminationData.splice(oldIndex, 1);
            newExaminationData.splice(newIndex, 0, movedItem);
            setSurgeriesData(newExaminationData);
          }}
          axis="xy"
          pressDelay={100}
        />
      )
    );
  }, [surgeriesData, selectedIndex]);

  const onChangeInputNoteChild = useCallback(
    (e) => {
      surgeriesData[selectedIndex].notes = e.target.value;
      setSurgeriesData((prev) => [...prev]);
    },
    [selectedIndex, surgeriesData]
  );

  //Child Componet
  const CHILD_DRAWER_DATA = useMemo(() => {
    return (
      selectedIndex != null &&
      surgeriesData[selectedIndex] !== undefined && (
        <>
          <div className="h-100">
            <div className="selectedchip-header d-flex flex-column justify-content-center title px-20">
              <span className="text-truncate-twolines">
                {selectedIndex != null &&
                  surgeriesData[selectedIndex].name}
              </span>
            </div>
            <div className="p-4">
              <label className="title-common">Add Details</label>
              <Input.TextArea
                value={
                  selectedIndex != null && surgeriesData[selectedIndex].notes
                }
                placeholder="Enter any specific details here"
                className="textareaPlaceholder"
                rows={3}
                onChange={onChangeInputNoteChild}
              />
            </div>
          </div>
        </>
      )
    );
  }, [selectedIndex, surgeriesData]);

  return (
    <>
      <Card bordered={false} className="search-modalCard h-100">
        <TabSearchHeader
          placeholder="Search Surgeries/Procedures"
          searchQuery={searchChildQuery}
          onSearchParent={onSearchParent}
          disabled={surgeriesData.length > 0 ? false : true}
          onClose={onClose}
        />
        <div className="modalcard-body">
          <Row gutter={0} className="h-100">
            <Col md={14}>
              <div className="bg-white h-100 p-14">
                {surgeriesData.length > 0 && !searchChildQuery && (
                  <>
                    <div className="title2">Added</div>
                    <div className="d-flex flex-wrap">
                      <span ref={tourRef} className="pt-3">
                        {TABLE_EXAMINATION}
                      </span>
                      {/* <Tour placement="rightTop" closeIcon={false} open={tourOpen} steps={steps} onClose={onTourHandle} /> */}
                    </div>
                  </>
                )}
                <div>
                  <div className="title2">
                    {searchChildQuery.length > 0 ? 
                      "Search Results"
                      : ""}
                  </div>
                  <div className="mt-3">
                    {searchChildQuery.length > 0
                      ? childSearchOptions.length > 0 &&
                        childSearchOptions
                          .filter(
                            (e) =>
                              ![
                                ...surgeriesData.map(
                                  (e1) => e1.name
                                ),
                              ].includes(e.value)
                          )
                          .map((item, i) => {
                            return i === childSearchOptions.length - 1 ? (
                              <Button
                                key={i}
                                type="text"
                                className="btn btn-primary2 chips-custom mb-14 chips-addCustom chips-height"
                                onClick={() =>
                                  onSelectParent({ ...JSON.parse(item.key) })
                                }
                              >
                                "{item.value}"{" "}
                                <i className="icon-Add mx-2 fs-6"></i>{" "}
                                <a className="fw-medium text-decoration-underline text-primary">
                                  {" "}
                                  Add Custom
                                </a>
                              </Button>
                            ) : (
                              <Button
                                key={i}
                                type="text"
                                style={{
                                  width: item.value.length > 26 && "250px",
                                }}
                                className={`${
                                  item.value.length > 26 && "chips-custom-break"
                                } btn btn-primary2 chips-custom mb-14 me-14`}
                                onClick={() =>
                                  onSelectParent({ ...JSON.parse(item.key) })
                                }
                              >
                                {item.value}
                              </Button>
                            );
                          })
                      : parentOptionsList.length > 0 &&
                        parentOptionsList
                          .filter(
                            (e) =>
                              ![
                                ...surgeriesData.map(
                                  (e1) => e1.name
                                ),
                              ].includes(e.name)
                          )
                          .map((item, i) => {
                            return (
                              <Button
                                key={i}
                                type="text"
                                style={{
                                  width:
                                    item.name.length > 26 &&
                                    "250px",
                                }}
                                className={`${
                                  item.name.length > 26 &&
                                  "chips-custom-break"
                                } btn btn-primary2 chips-custom mb-14 me-14`}
                                onClick={() =>
                                  onSelectParent({
                                    ...item,
                                  })
                                }
                              >
                                {item.name}
                              </Button>
                            );
                          })}
                  </div>
                </div>
              </div>
            </Col>
            <Col md={10}>{CHILD_DRAWER_DATA}</Col>
          </Row>
        </div>
      </Card>
    </>
  );
}

export default React.memo(TabSurgicalSearch);

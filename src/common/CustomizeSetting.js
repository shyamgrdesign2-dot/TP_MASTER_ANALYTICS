import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Table, Switch, Row, Col, Button, Card, Popover, Modal, Dropdown, Menu, message } from 'antd';
import { MenuOutlined, MoreOutlined } from '@ant-design/icons';
import { DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy, } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { errorMessage, getClinicName } from "../utils/utils";

import CashManagerContext from "../context/CashManagerContext";

import { useSelector, useDispatch } from "react-redux";
import { customizedPad, listVideo } from "../redux/doctorsSlice";

import VideoModal from './VideoModal';
import { useAccess } from '../pages/vaccination/useAccess';
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { GB_CARE_PLAN, GB_ISCRIBE, INVESTIGATION_MODULE_ID, INVESTIGATION_TITLE } from '../utils/constants';

import { addModule, getModules } from '../redux/customModuleSlice';
import { savePrintsettings } from '../redux/doctorsSlice';
import EditCustomModuleDrawer from '../components/customModulesV2/EditCustomModuleDrawer';
import CommonModal from './CommonModal';
import { ASSETS } from "../assets";
import { env } from "../EnvironmentConfig";
const {
  tutorialIcon: tutorial,
  playCover2: playcover2,
  tubeIcon: playIcons,
  fullIcon: fullicon,
  customModule: customModuleIcon,
  editIconBlue: editIcon,
  deleteIconBlue: deleteIcon,
  alerticon: alertIcon,
} = ASSETS.images;

const CustomRow = ({ children, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });
  const style = {
    ...props.style,
    transform: CSS.Transform.toString(
      transform && {
        ...transform,
        scaleY: 1,
      },
    ),
    transition,
    ...(isDragging
      ? {
        position: 'relative',
        zIndex: 9999,
      }
      : {}),
  };
  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if (child.key === 'sort') {
          return React.cloneElement(child, {
            children: (
              <MenuOutlined
                ref={setActivatorNodeRef}
                style={{
                  touchAction: 'none',
                  cursor: 'move',
                }}
                {...listeners}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

function CustomizeSetting({ handleDrawerCustomize, isVaccinationEnabled, isGrowthChartEnabled, page, isTabRx }) {

  const { setSymptomsData, setExaminationData, setDiagnosisData, setAdviceData, setInvestigationData, setMedicationData, setVitalsData, setMedicalHistoryData, setPrivateNotesData, setFollowUpDate, setAdditionalNote } = useContext(CashManagerContext);
  const { loading, customizedPadLeftList, customizedPadRightList, videoList, profile, userId, defaultPrintSettings } = useSelector((state) => state.doctors);
  const dispatch = useDispatch();
  const [dataSourceLeft, setDataSourceLeft] = useState([]);
  const [dataSourceRight, setDataSourceRight] = useState([]);

  const [popOverVideo, setPopOverVideo] = useState(false);
  const [videoLink, setVideoLink] = useState(null);
  const { isGynaecHistoryAccessable } = useAccess();
  const {customModules, hospitalSearchResults} = useSelector((state) => state.customModules);
  const isCarePlanEnabled = useFeatureIsOn(GB_CARE_PLAN);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedModuleForEdit, setSelectedModuleForEdit] = useState(null);
  const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  useEffect(() => {
    if (customizedPadLeftList.length > 0) {
      let updatedData = customizedPadLeftList
      // Hide Care Plan completely when GB flag is OFF
      .filter(e => e.tmdpm_id === 22 ? isCarePlanEnabled : true)
      .filter(e => e.tmdpm_id === 7 && e.tmdpm_status === 0 ? isVaccinationEnabled : e.tmdpm_id === 16 && e.tmdpm_status === 0 ? isGrowthChartEnabled : e.tmdpm_id === 17 && e.tmdpm_status === 0 ? isGynaecHistoryAccessable : true).map((e, i) => {
        return { ...e };
      });
      updatedData = updatedData.filter((item) => item?.tmdpm_id !== 20);
      const hasVaccination = updatedData.some((item) => item?.tmdpm_id === 7);
      if (!hasVaccination) {
        updatedData.push({
          tmdpm_id: 7,
          tmdpm_type: "L",
          tmdpm_name: "Vaccination",
          tmdpm_short_name: "Vaccination",
          tmdpm_status: 1,
          tmdpm_icon_url:
            `${env.php_base_url}/img/microservices/left/vaccination.svg`,
        });
      }
      setDataSourceLeft(updatedData);
    }
    dispatch(listVideo());
  }, [handleDrawerCustomize]);

  useEffect(() => {
    if (customizedPadRightList.length > 0) {
      const updatedData = customizedPadRightList.map((e) => ({ ...e }));
      setDataSourceRight(updatedData);
    }
    
  }, [handleDrawerCustomize]);

  // Update module names in dataSourceRight when customModules change
  useEffect(() => {
    if (customModules && customModules.length > 0 && dataSourceRight.length > 0) {
      setDataSourceRight((prev) =>
        prev.map((item) => {
          if (item.is_custom_module) {
            const updatedModule = customModules.find(
              (m) => m.module_id === item.tmdpm_id
            );
            if (updatedModule && updatedModule.name !== item.tmdpm_name) {
              return {
                ...item,
                tmdpm_name: updatedModule.name,
              };
            }
          }
          return item;
        })
      );
    }
  }, [customModules]);

  //LEFT SIDE OF ELEMETNS
  const columnsLeft = [
    {
      title: 'LEFT SIDE OF ELEMETNS',
      key: 'sort',
      colSpan: 2,
      align: 'left',
      width: 50,
      dataIndex: 'sort',
    },
    {
      title: '',
      colSpan: 0,
      dataIndex: 'tmdpm_name',
      key: 'tmdpm_name',
      render: (text, record) => <div className='align-items-center d-flex'><img src={record.tmdpm_icon_url} className='me-3' style={{ marginLeft: -12 }} />{(isGynaecHistoryAccessable && record.tmdpm_name === "Medical History") ? "Gynec History" : record.tmdpm_name}</div>
    },
    {
      title: 'ENABLE/DISABLE',
      dataIndex: 'tmdpm_status',
      key: 'tmdpm_status',
      render: (text, record) => <div className={`${page !== "normal-rx-page" ? "text-left" : ""}`}><Switch defaultChecked onChange={(checked) => onChangeLeft(checked, record)} checked={text ? false : true} /></div>,
    },
  ];

  const onChangeLeft = (checked, record) => {
    const index = dataSourceLeft.findIndex(e => e.tmdpm_id == record.tmdpm_id)
    if (index !== -1) {
      dataSourceLeft[index].tmdpm_status = checked ? 0 : 1
      setDataSourceLeft((prev) => [...prev]);
    }
  };

  const onDragEndLeft = ({ active, over }) => {
    if (active.id !== over?.id) {
      setDataSourceLeft((previous) => {
        const activeIndex = previous.findIndex((i) => i.tmdpm_id === active.id);
        const overIndex = previous.findIndex((i) => i.tmdpm_id === over?.id);
        return arrayMove(previous, activeIndex, overIndex);
      });
    }
  };

  // Get module definition and check if it's disabled
  const getModuleDefinition = (moduleId) => {
    return customModules?.find((m) => m.module_id === moduleId) || null;
  };

  const isModuleDisabled = (record) => {
    if (!record.is_custom_module) return false;
    const moduleDef = getModuleDefinition(record.tmdpm_id);
    if (!moduleDef) return false;
    const selfModule = !moduleDef?.origin_id;
    return moduleDef.hasBeenUsed || moduleDef.hasBeenCloned || !selfModule ;
  };

  // Handle remove module from Rx pad
  const handleRemoveFromRxPad = async (record) => {
    try {
      message.loading({
        content: "Removing module from Rx pad...",
        key: "removeFromRx",
      });

      const updatedRightList = dataSourceRight.filter(
        (item) => item.tmdpm_id !== record.tmdpm_id
      );

      const sendData = {
        data: {
          default: false,
          reset: false,
          left: dataSourceLeft,
          right: updatedRightList,
        },
      };

      await dispatch(customizedPad(sendData)).unwrap();
      setDataSourceRight(updatedRightList);

      message.success({
        content: `"${record.tmdpm_name}" removed from Rx pad successfully`,
        key: "removeFromRx",
        duration: 3,
      });
    } catch (error) {
      console.error("Error removing module from Rx pad:", error);
      message.error({
        content: error?.message || "Failed to remove module from Rx pad. Please try again.",
        key: "removeFromRx",
        duration: 3,
      });
    }
  };

  // Handle edit module
  const handleEditModule = (record) => {
    const moduleDef = getModuleDefinition(record.tmdpm_id);
    if (moduleDef) {
      setSelectedModuleForEdit(moduleDef);
      setEditDrawerOpen(true);
    }
  };

  // Handle delete module confirmation
  const handleDeleteModuleClick = (record) => {
    setModuleToDelete(record);
    setIsDeleteConfirmationModalOpen(true);
  };

  // Handle delete module
  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    try {
      message.loading({ content: "Deleting module...", key: "deleteModule" });

      const moduleDef = getModuleDefinition(moduleToDelete.tmdpm_id);
      if (!moduleDef) {
        message.error({ content: "Module not found", key: "deleteModule", duration: 3 });
        setIsDeleteConfirmationModalOpen(false);
        setModuleToDelete(null);
        return;
      }

      // Step 1: Remove module from user modules
      const modules = customModules.filter(
        (cm) => cm.module_id !== moduleToDelete.tmdpm_id
      );
      const action = await dispatch(addModule({ userId, modules }));

      if (action.meta.requestStatus === "fulfilled") {
        // Step 2: Remove from print settings
        if (defaultPrintSettings?.prescription?.case_option) {
          const caseOptions = defaultPrintSettings.prescription.case_option;

          const updatedCaseOptions = caseOptions.filter(
            (option) =>
              !(option.id === moduleToDelete.tmdpm_id && option.is_custom_module)
          );

          const rxPrescription = {
            ...defaultPrintSettings.prescription,
            case_option: updatedCaseOptions,
          };

          const printSettingsData = {
            ...defaultPrintSettings,
            prescription: JSON.stringify(rxPrescription),
            header_footer: JSON.stringify(defaultPrintSettings.header_footer),
            page_format: JSON.stringify(defaultPrintSettings.page_format),
          };

          await dispatch(savePrintsettings(printSettingsData)).unwrap();
        }

        // Step 3: Remove from customized pad
        const updatedRightPad = dataSourceRight.filter(
          (item) => item.tmdpm_id !== moduleToDelete.tmdpm_id
        );

        const sendData = {
          data: {
            default: false,
            reset: false,
            left: customizedPadLeftList,
            right: updatedRightPad,
          },
        };
        
        await dispatch(customizedPad(sendData)).unwrap();

        setDataSourceRight(updatedRightPad);

        // Refresh modules list
        if (userId) {
          await dispatch(getModules(userId));
        }

        setIsDeleteConfirmationModalOpen(false);
        setModuleToDelete(null);

        message.success({
          content: `Module "${moduleToDelete.tmdpm_name}" deleted successfully`,
          key: "deleteModule",
          duration: 3,
        });
      } else {
        message.error({
          content: "Failed to delete module",
          key: "deleteModule",
          duration: 3,
        });
      }
    } catch (error) {
      console.error("Error deleting module:", error);
      message.error({
        content: "Failed to delete module. Please try again.",
        key: "deleteModule",
        duration: 3,
      });
    }
  };

  const handleDeleteConfirmationModal = () => {
    setIsDeleteConfirmationModalOpen(false);
    setModuleToDelete(null);
  };

  // Create dropdown menu for custom modules
  const createMoreMenu = (record) => {
    const disabled = isModuleDisabled(record);
    return (
      <Menu>
        <Menu.Item
          key="remove"
          onClick={() => handleRemoveFromRxPad(record)}
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#4a4a4a",
            padding: "8px 12px",
          }}
        >
          <i className="icon-exit color-blue" style={{ margin: "0 4px 3px 0" }}></i>
          Remove From Rx Pad
        </Menu.Item>
        <Menu.Item
          key="edit"
          onClick={disabled ? undefined : () => handleEditModule(record)}
          disabled={disabled}
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: disabled ? "#a2a2a8" : "#4a4a4a",
            padding: "8px 12px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <img
            src={editIcon}
            width={18}
            height={18}
            alt="edit"
            style={{ margin: "0 8px 3px 0" }}
          />
          Edit Module
        </Menu.Item>
        <Menu.Item
          key="delete"
          onClick={disabled ? undefined : () => handleDeleteModuleClick(record)}
          disabled={disabled}
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: disabled ? "#a2a2a8" : "#ff4d4f",
            padding: "8px 12px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <img
            src={deleteIcon}
            width={18}
            height={18}
            alt="delete"
            style={{ margin: "0 8px 3px 0" }}
          />
          Delete Module
        </Menu.Item>
      </Menu>
    );
  };

  //RIGHT SIDE OF ELEMETNS
  const columnsRight = [
    {
      title: 'RIGHT SIDE OF ELEMETNS',
      key: 'sort',
      colSpan: 2,
      width: 50,
      align: 'left',
      dataIndex: 'sort',
    },
    {
      title: '',
      colSpan: 0,
      dataIndex: 'tmdpm_name',
      key: 'tmdpm_name',
      render: (text, record) => <div className='align-items-center d-flex'><img src={record.is_custom_module ? customModuleIcon : record.tmdpm_icon_url} className='me-3' style={{ marginLeft: -12 }} />{record?.tmdpm_id === INVESTIGATION_MODULE_ID ? INVESTIGATION_TITLE : record.tmdpm_name}</div>
    },
    {
      title: 'ENABLE/DISABLE',
      dataIndex: 'tmdpm_status',
      key: 'tmdpm_status',
      width: 160,
      align: 'right',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Switch defaultChecked onChange={(checked) => onChangeRight(checked, record)} checked={text ? false : true} />
            {record.is_custom_module ? (
              <Dropdown
                overlay={createMoreMenu(record)}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={
                    <MoreOutlined
                      style={{
                        fontSize: "18px",
                        color: "#4a4a4a",
                        fontWeight: "bold",
                        cursor: "pointer"
                      }}
                    />
                  }
                  className="more-options-btn"
                  style={{ padding: '4px 0', minWidth: 'auto', height: 'auto', marginLeft: '8px' }}
                />
              </Dropdown>
            ) : (
              <div style={{ width: '26px', height: '26px', marginLeft: '12px' }}></div>
            )}
          </div>
        </div>
      ),
    },
  ];

  const onChangeRight = (checked, record) => {
    const index = dataSourceRight.findIndex(e => e.tmdpm_id == record.tmdpm_id)
    if (index !== -1) {
      dataSourceRight[index].tmdpm_status = checked ? 0 : 1
      setDataSourceRight((prev) => { return [...prev] });
    }
  };

  const onDragEndRight = ({ active, over }) => {
    if (active.id !== over?.id) {
      setDataSourceRight((previous) => {
        const activeIndex = previous.findIndex((i) => i.tmdpm_id === active.id);
        const overIndex = previous.findIndex((i) => i.tmdpm_id === over?.id);
        return arrayMove(previous, activeIndex, overIndex);
      });
    }
  };

  async function onCustomizePadClick() {
    if (dataSourceLeft.length == 0) {
      errorMessage('Something went wrong! please try again later')
    } else if (dataSourceRight.length == 0) {
      errorMessage('Something went wrong! please try again later')
    } else if (dataSourceLeft.length > 0 && dataSourceLeft.filter((e) => !e.tmdpm_status).length <= 0) {
      errorMessage('Please enable at least one left side of elemetns')
    } else if (dataSourceRight.length > 0 && dataSourceRight.filter((e) => !e.tmdpm_status).length <= 0) {
      errorMessage('Please enable at least one right side of elemetns')
    } else {
      var sendData = {
        data: {
          default: false,
          reset: false,
          left: dataSourceLeft,
          right: dataSourceRight,
        }
      }
      const action = await dispatch(customizedPad(sendData))
      if (action.meta.requestStatus === "fulfilled") {
        const left = action.payload.left
        const right = action.payload.right
        if (right.findIndex(e => e.tmdpm_id === 5 && e.tmdpm_status === 0) === -1) {
          setSymptomsData([])
        }
        if (right.findIndex(e => e.tmdpm_id === 10 && e.tmdpm_status === 0) === -1) {
          setExaminationData([])
        }
        if (right.findIndex(e => e.tmdpm_id === 11 && e.tmdpm_status === 0) === -1) {
          setDiagnosisData([])
        }
        if (right.findIndex(e => e.tmdpm_id === 12 && e.tmdpm_status === 0) === -1) {
          setMedicationData([])
        }
        if (right.findIndex(e => e.tmdpm_id === 13 && e.tmdpm_status === 0) === -1) {
          setAdviceData([])
        }
        if (right.findIndex(e => e.tmdpm_id === 14 && e.tmdpm_status === 0) === -1) {
          setInvestigationData([])
        }
        if (right.findIndex(e => e.tmdpm_id === 15 && e.tmdpm_status === 0) === -1) {
          setFollowUpDate(null)
          setAdditionalNote('')
        }
        if (left.findIndex(e => e.tmdpm_id === 1 && e.tmdpm_status === 0) === -1) {
          setVitalsData([])
        }
        if (left.findIndex(e => e.tmdpm_id === 3 && e.tmdpm_status === 0) === -1) {
          setMedicalHistoryData([])
        }
        if (left.findIndex(e => e.tmdpm_id === 8 && e.tmdpm_status === 0) === -1) {
          setMedicalHistoryData([])
        }
        handleDrawerCustomize()
      } else {
        errorMessage(action.error)
      }
    }
  }

  async function onDefaultPadClick() {
    errorMessage('Action in progress..')
    var sendData = {
      data: {
        default: true,
        reset: false
      }
    }
    const action = await dispatch(customizedPad(sendData))
    if (action.meta.requestStatus === "fulfilled") {
      const left = action.payload.left
      const right = action.payload.right
      if (right.findIndex(e => e.tmdpm_id === 5 && e.tmdpm_status === 0) === -1) {
        setSymptomsData([])
      }
      if (right.findIndex(e => e.tmdpm_id === 10 && e.tmdpm_status === 0) === -1) {
        setExaminationData([])
      }
      if (right.findIndex(e => e.tmdpm_id === 11 && e.tmdpm_status === 0) === -1) {
        setDiagnosisData([])
      }
      if (right.findIndex(e => e.tmdpm_id === 12 && e.tmdpm_status === 0) === -1) {
        setMedicationData([])
      }
      if (right.findIndex(e => e.tmdpm_id === 13 && e.tmdpm_status === 0) === -1) {
        setAdviceData([])
      }
      if (right.findIndex(e => e.tmdpm_id === 14 && e.tmdpm_status === 0) === -1) {
        setInvestigationData([])
      }
      if (right.findIndex(e => e.tmdpm_id === 15 && e.tmdpm_status === 0) === -1) {
        setFollowUpDate(null)
        setAdditionalNote('')
      }
      if (left.findIndex(e => e.tmdpm_id === 1 && e.tmdpm_status === 0) === -1) {
        setVitalsData([])
      }
      if (left.findIndex(e => e.tmdpm_id === 3 && e.tmdpm_status === 0) === -1) {
        setMedicalHistoryData([])
      }
      if (left.findIndex(e => e.tmdpm_id === 8 && e.tmdpm_status === 0) === -1) {
        setMedicalHistoryData([])
      }
      errorMessage('Action successfully')
      handleDrawerCustomize()
    } else {
      errorMessage(action.error)
    }
  }

  // Delete Confirmation Modal
  const DELETE_CONFIRMATION_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isDeleteConfirmationModalOpen}
        modalWidth={610}
        title={"Are you sure you want to delete?"}
        onCancel={handleDeleteConfirmationModal}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>
                  Deleting this "<b>{moduleToDelete?.tmdpm_id === INVESTIGATION_MODULE_ID ? INVESTIGATION_TITLE : moduleToDelete?.tmdpm_name}</b>" module will permanently
                  remove all saved templates and data associated with it. This
                  action cannot be undone.
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    handleDeleteModule();
                  }}
                  className="me-4 text-decoration-underline btn p-0"
                  style={{ color: "#ff4d4f", cursor: "pointer" }}
                >
                  Yes, Delete
                </div>
                <Button
                  onClick={handleDeleteConfirmationModal}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isDeleteConfirmationModalOpen, moduleToDelete, handleDeleteConfirmationModal, handleDeleteModule]);

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button className="btn btn-delete-prescription p-0"
              onClick={showHideVideoListPopover}>
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList[0]?.video?.map((item1, i1) => {
            return (
              <div key={i1} className={`d-flex ${i1 !== videoList[0]?.video.length - 1 && 'pb-3 mb-15 border-bottom'}`}>
                <div className="tutorial-play me-14">
                  <button type="button"
                    onClick={() => {
                      setVideoLink(item1)
                      const clinic_name = getClinicName(profile?.hospital_data);
                      window.Moengage.track_event("TP_Tutorial_Viewed", {
                        clinic_name,
                        tutorial_type: videoList[0]?.category,
                      });
                    }}
                  >
                    <img src={playIcons} />
                  </button>
                  <span className='tutorial-thumb'><img src={item1.thumbnail} /></span>
                </div>
                <div>
                  <h3 className="title-common text-welcome">{item1?.tmv_title}</h3>
                  <div className="fs-12 fontroboto fw-normal text-main">{item1?.tmv_description}</div>
                </div>
              </div>
            )
          })}
        </div>
      </>
      // <>
      //   <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
      //     <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
      //       <div className="title-common">Video Tutorial</div>
      //       <Button className="btn btn-delete-prescription p-0"
      //         onClick={showHideVideoListPopover}>
      //         <i className="icon-Cross" />
      //       </Button>
      //     </div>
      //     {videoList[0]?.video?.map((item1, i1) => {
      //       return (
      //         <div key={i1} className="d-flex flex-column mb-3">
      //           <div className="tutorial-play">
      //             <button type="button" onClick={() => setVideoLink(item1)}><img src={playIcons} /></button>
      //             <span><img className='w-100 rounded-3' src={item1.thumbnail} /></span>
      //           </div>
      //           <div className='mt-2'>
      //             <div className="fs-12 fontpoppins fw-medium text-main">{item1?.tmv_description}</div>
      //           </div>
      //         </div>
      //       )
      //     })}
      //   </div>
      // </>
    );
  }, [popOverVideo]);

  return (
    <div>
      <Card bordered={false} className="search-modalCard">
        <div className='modalCard-header align-items-center justify-content-between d-flex'>
          <div className='align-items-center d-flex w-100'>
            <Button type="text" className='btn btn-delete-prescription px-3 focus-none h-100' onClick={handleDrawerCustomize}>
              <i className='icon-Cross fs-3'></i>
            </Button>
            <div className="modal-title text-truncate-twolines">{'Customize Your Pad'}</div>
          </div>
          <div className='d-flex align-items-center justify-content-end w-100'>

            {isTabRx && (
              <button className='btn d-flex align-items-center btn-text me-14' onClick={onDefaultPadClick}>
                <span>Default Settings</span>
              </button>
            )}

            <Popover
              open={popOverVideo}
              onOpenChange={showHideVideoListPopover}
              content={VIDEO_CONTENT}
              trigger="click"
              overlayClassName="pop-430 pp-0 videoTutorial"
              placement="bottom"
            >
              <button className={`btn d-flex align-items-center btn-text tutorial ${isTabRx ? "me-14" : "me-10"}`}>
                <span className={`text-decoration-none rounded-5 bg-white shadow2 ${isTabRx ? "" : "pe-3"}`}>
                  <img height={42} src={tutorial} alt="" />
                  {!isTabRx && "Tutorial"}
                </span>
              </button>
            </Popover>

            {!isTabRx && (
              <button className='btn d-flex align-items-center btn-text me-14' onClick={onDefaultPadClick}>
                <span>Default Settings</span>
              </button>
            )}
            <Button type='button' className="btn-41 btn px-4 btn-primary3 me-4" onClick={onCustomizePadClick} loading={loading}>
              Save
            </Button>
          </div>
        </div>
      </Card>

      <Row className='p-4'>
        <Col lg={page === "normal-rx-page" ? 12 : 24} sm={page === "normal-rx-page" ? 12 : 24} className='pe-3'>
          <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEndLeft}>
            <SortableContext
              // rowKey array
              items={dataSourceLeft.map((i) => i.tmdpm_id)}
              strategy={verticalListSortingStrategy}
            >
              <Table
                className='customize-table'
                pagination={false}
                components={{
                  body: {
                    row: CustomRow,
                  },
                }}
                rowKey="tmdpm_id"
                columns={columnsLeft}
                dataSource={dataSourceLeft}
              />
            </SortableContext>
          </DndContext>
        </Col>
        { page === "normal-rx-page" &&
          <Col lg={12} sm={12} className='ps-3'>
            <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEndRight}>
              <SortableContext
                // rowKey array
                items={dataSourceRight.map((i) => i.tmdpm_id)}
                strategy={verticalListSortingStrategy}
              >
                <Table
                  className='customize-table'
                  pagination={false}
                  components={{
                    body: {
                      row: CustomRow,
                    },
                  }}
                  rowKey="tmdpm_id"
                  columns={columnsRight}
                  dataSource={dataSourceRight}
                />
              </SortableContext>
            </DndContext>
          </Col>
        }
      </Row>

      {videoLink && (
        <VideoModal
          videoLink={videoLink}
          onCancel={() => setVideoLink(null)}
        />
      )}

      {editDrawerOpen && selectedModuleForEdit && (
        <EditCustomModuleDrawer
          open={editDrawerOpen}
          onClose={async () => {
            setEditDrawerOpen(false);
            setSelectedModuleForEdit(null);
            // Refresh modules after edit
            if (userId) {
              await dispatch(getModules(userId));
            }
          }}
          module={selectedModuleForEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {DELETE_CONFIRMATION_MODAL}
    </div>
  );
};
export default React.memo(CustomizeSetting);

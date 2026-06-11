import { Button, Drawer } from "antd";
import { useState, useEffect, useCallback } from "react";
import LabParametersList from "./LabParametersList";

import { Card } from "react-bootstrap";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import axios from 'axios';
import { env } from "../EnvironmentConfig";
import LabParams from "../components/LabParams";
import ViewLabParam from "../components/ViewLabParams";
import { ASSETS } from "../assets";
const labParamsImg = ASSETS.images.lab;

const VisitLabParameters = ( {patient_unique_id, doc_id, onSave}) => {
  const [labParamsData, setLabParamsData] = useState([]);
  const [viewlabparamsDrawer, setViewlabparamsDrawer] = useState(false);
  const [addlabparamsDrawer, setAddlabparamsDrawer] = useState(false);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);

  const [token, setToken] = useState(null);
  const baseUrl = env.lab_params_api_url;

  const getLabParams = async () => {
    try {
        const cleanedToken = token.replace(/['"]+/g, '');
        const response = await axios.get(`${baseUrl}/api/v1/lab-parameters/results/${patient_unique_id}`, {
            headers: {
                'Authorization': `Bearer ${cleanedToken}`,
            },
        });
        setLabParamsData(response.data?.data?.results || []);
    } catch (error) {
        console.error("Error fetching lab params:", error);
    }
  };

  const handleViewLabParamsDrawer = useCallback(
    () => {
        setViewlabparamsDrawer(!viewlabparamsDrawer)
    },
    [viewlabparamsDrawer]    
  );

  const handleAddLabParamsDrawer = () => {
        setAddlabparamsDrawer(!addlabparamsDrawer)
  }

  const showHideBackModal = () => {
    setIsBackModalOpen(!isBackModalOpen);
  };

  // Function to close "View Lab Params" and open "Add Lab Params"
  const handleSwitchToAddLabParams = () => {
    setViewlabparamsDrawer(false);
    setAddlabparamsDrawer(true);
  };

  // Function to update lab params data in parent component when saved
  const handleLabParamsUpdate = (newLabParams) => {
    getLabParams();
  };

  useEffect(() => {
    const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
    if (token) {
      setToken(token);
    }
  }, []);

  useEffect(() => {
    if(token){
      getLabParams()
    }
  },[token])

  return (
    <div>
      {labParamsData?.length > 0 ? (
        <div className="appointment-wrap PatientDetailswrap m-0">
          <Card
            style={{
              overflow: "hidden",
            }}
          >
            <Card.Header className="bg-white py-3">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <img
                    src={labParamsImg}
                    alt="lab-parameters"
                    className="me-3"
                  />
                  Lab Results
                </div>
                <Button
                  className="btn btn-input d-flex align-items-center gap-1"
                  onClick={handleViewLabParamsDrawer}
                >
                  <span style={{ textDecoration: "underline" }}>View All</span>
                  <i
                    className="icon-right iconrotatehistory90"
                    style={{
                      display: "block",
                      transform: `rotate(180deg)`,
                      marginTop: "-1px",
                    }}
                  />
                </Button>
              </div>
            </Card.Header>
            <LabParametersList labParamsData={labParamsData}/>
          </Card>

          { addlabparamsDrawer &&
            <Drawer
                closeIcon={false}
                width={880}
                // className="modalWidth-700"
                placement="right"
                open={addlabparamsDrawer}
                onClose={showHideBackModal}
            >
                <LabParams handleAddLabParamsDrawer={handleAddLabParamsDrawer} patient_unique_id={patient_unique_id} onSave={handleLabParamsUpdate} isBackModalOpen={isBackModalOpen} showHideBackModal={showHideBackModal}/>
            </Drawer>
          }
          { viewlabparamsDrawer &&
            <Drawer
                closeIcon={false}
                width="auto"
                className="modalWidth-700"
                placement="right"
                open={viewlabparamsDrawer}
                onClose={handleViewLabParamsDrawer}
            >
                <ViewLabParam handleViewLabParamsDrawer={handleViewLabParamsDrawer} labParamsData={labParamsData}  handleSwitchToAddLabParams={handleSwitchToAddLabParams}/>
            </Drawer>
          }
        </div>
      ) : null}
    </div>
  );
};

export default VisitLabParameters;

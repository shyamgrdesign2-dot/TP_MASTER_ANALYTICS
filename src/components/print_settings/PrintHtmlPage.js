import React, { useContext, useMemo } from "react";
import { Flex, Col } from "antd";
import moment from "moment";
import { useSelector } from "react-redux";

import PrintSettingsContext from "../../context/PrintSettingsContext";

import { isNumeric } from "../../utils/utils";

import "../../styles/print.scss";

const showDateFormat = "DD MMM, YY";

function PrintHtmlPage() {
  const {
    printSettings,
    fileHeader,
    fileFooter,
    fileLogo,
    fileWatermark,
    fileSignature,
  } = useContext(PrintSettingsContext);

  const { frequencyList, timingList } = useSelector((state) => state.doctors);

  var caseManagerData = {
    tcm_id: 132368,
    showConsultationDateTime: "08 Mar 2024, 04:07 pm",
    follow_up_date: "",
    visit_advice: "",
    total_consultation: 188,
    next_tcm_id: null,
    prev_tcm_id: 132367,
    print_url:
      "https://pms-upgrade.azurewebsites.net/case_manager/pdf_casemanager_send.php?pdf_id=MTMyMzY4&p_id=U1QtMTAxOQ==&pu_id=NDA3OTIzNjg1MQ==&lg=MQ==",
    print_rx_url:
      "https://pms-upgrade.azurewebsites.net/case_manager/pdf_prescription_send.php?pdf_id=MTMyMzY4&p_id=U1QtMTAxOQ==&pu_id=NDA3OTIzNjg1MQ==&lg=MQ==",
    symptoms: [
      {
        symptom_name: "Complaints 01",
        unique_id: "a0a0cc71-8831-4683-851e-e71e67230b3f",
        change: 0,
        since: "1 Week",
        severity: "moderate",
        note: "Hello",
      },
      {
        symptom_name: "Complaints 02",
        unique_id: "cabed42e-c2c5-4dc4-9cb2-5e1c238953c5",
        change: 0,
        since: "",
        severity: "severe",
        note: "",
      },
      {
        symptom_name: "Complaints 03",
        unique_id: "30eaf575-1adc-4ec6-9c1a-75cbf5ebe290",
        change: 0,
        since: "4 Week",
        severity: "",
        note: "",
      },
    ],
    examination: [
      {
        examination_name: "Examination 01",
        note: "Hello",
        unique_id: "f07c8217-2d6d-4e9e-90bf-07b956c023ce",
        change: 0,
      },
      {
        examination_name: "Examination 02",
        note: "",
        unique_id: "d26ad5a8-b808-40e1-96f6-705488879381",
        change: 0,
      },
    ],
    surgeries: [],
    diagnosis: [
      {
        unique_id: "b1b1a8ab-0cba-4e3e-bc3e-e6915405b9a3",
        tds_id: 1328,
        tds_name:
          "Unspecified mental disorder due to known physiological condition",
        since: "1 Week",
        status: "suspected",
        note: "Hello",
      },
      {
        unique_id: "696ab155-26ff-4d86-a7a8-248c155d572f",
        tds_id: 1329,
        tds_name: "Stereotyped movement disorders",
        since: "",
        status: "confirmed",
        note: "",
      },
      {
        unique_id: "7c3e659b-5de9-49e5-9760-ef47a1a6bbb4",
        tds_id: 1330,
        tds_name: "Disruptive, impulse-control and conduct disorders",
        since: "4 Day",
        status: "",
        note: "",
      },
    ],
    advice: [
      {
        advice_name: "Low fat in diet",
        unique_id: "a6232d6a-7319-48a2-8ee6-8d6519035a0b",
        change: 0,
      },
      {
        advice_name: "Wash eyes frequently",
        unique_id: "1bc089ee-cc64-4905-9b99-3e35bd800ca0",
        change: 0,
      },
    ],
    investigation: [
      {
        investigation_name: "ROMA (Ovarian Malignancy Risk Algorithm) Test",
        note: "Hello",
        unique_id: "168373b5-0aa4-48b0-9591-2dc471b5f250",
        change: 0,
      },
      {
        investigation_name: "Allergy: Vanilla",
        note: "",
        unique_id: "9381b81c-6df7-439e-a5a5-1fa3ae6d7ebc",
        change: 0,
      },
    ],
    doctor_data: {
      doctor_name: "Jigish Pansaniya",
      um_qualifications: "mca",
      gmc_no: "JP-2021/25",
      dp_name: "Psychiatry",
      editCase: false,
    },
    patient_data: {
      patinet_id: "ST-1019",
      patinet_name: "Neel Patel",
      patinet_dob: "01/01/1970",
      patinet_age: 54,
      patinet_gender: "Male",
      patinet_contact_no: "88888",
      patinet_email: "",
      patinet_address: "",
      patinet_blood_group: "",
      patinet_secondary_name: "",
      patinet_secondary_contact: "",
      patinet_reference_id: null,
      patinet_ht_wt: "182/80",
      patinet_consultation_type: null,
      patinet_consultaion_date: "2024-03-18 09:58:22",
      patinet_edd_date: null,
      patinet_date_time: "2024-03-18 13:53:56",
    },
    vitals: [
      {
        date: "2024-03-08",
        dev_unique_id: "51702",
        tcv_id: "28167",
        temp: "50",
        pres: "60",
        resp_rate: "70",
        blood_press: "80/90",
        spo2: "10",
        tcbc_id: 8592,
        height: "190",
        weight: "60",
        bmi: "16.62",
        bmr: "1522.50",
        bsa: "1.78",
      },
      {
        date: "2024-03-07",
        dev_unique_id: "41206",
        tcv_id: "28168",
        temp: "30",
        pres: "20",
        resp_rate: "421",
        blood_press: "60/51",
        spo2: "56",
        tcbc_id: 8593,
        height: "182",
        weight: "80",
        bmi: "24.15",
        bmr: "1672.50",
        bsa: "2.01",
      },
    ],
    medicine: [
      {
        tmm_id: 226173,
        tmm_medicine_name: "Adoxin OZ Suspension",
        tmm_generic: "Ofloxacin (50mg) + Ornidazole (125mg)",
        tmm_company: "Rhydburg Pharmaceuticals Ltd",
        tmm_type: "",
        tmm_days: 2,
        tmm_duration_type: "day(s)",
        tmm_dosage: "2",
        tmm_unit: "1",
        tcm_tmm_freq_morning: 0,
        tcm_tmm_freq_afternoon: 0,
        tcm_tmm_freq_evening: 0,
        tcm_tmm_freq_night: 0,
        tmm_time: 1,
        tmm_remarks: "Hello",
        tmm_freq_type: 5,
        tmf_block: 1,
        tcm_tmr_type: "M",
        display_qty: 20,
        medicineUnit: [
          {
            tmu_id: 1,
            tmu_title: "Amplues",
          },
          {
            tmu_id: 2,
            tmu_title: "Tablets",
          },
          {
            tmu_id: 3,
            tmu_title: "mg",
          },
          {
            tmu_id: 4,
            tmu_title: "ml",
          },
          {
            tmu_id: 5,
            tmu_title: "units",
          },
          {
            tmu_id: 6,
            tmu_title: "Capsule",
          },
          {
            tmu_id: 7,
            tmu_title: "Fingertips",
          },
          {
            tmu_id: 8,
            tmu_title: "Pea sized",
          },
          {
            tmu_id: 9,
            tmu_title: "gms",
          },
          {
            tmu_id: 10,
            tmu_title: "palm sized",
          },
          {
            tmu_id: 11,
            tmu_title: "tsp",
          },
          {
            tmu_id: 12,
            tmu_title: "tbps",
          },
          {
            tmu_id: 13,
            tmu_title: "Kits",
          },
          {
            tmu_id: 14,
            tmu_title: "Drops",
          },
          {
            tmu_id: 15,
            tmu_title: "Sprays",
          },
          {
            tmu_id: 16,
            tmu_title: "Sachets",
          },
          {
            tmu_id: 17,
            tmu_title: "Cup",
          },
          {
            tmu_id: 18,
            tmu_title: "Scoops",
          },
          {
            tmu_id: 19,
            tmu_title: "Suppositories",
          },
          {
            tmu_id: 20,
            tmu_title: "Soaps",
          },
          {
            tmu_id: 21,
            tmu_title: "Bottles",
          },
          {
            tmu_id: 22,
            tmu_title: "patches",
          },
          {
            tmu_id: 23,
            tmu_title: "Respules",
          },
          {
            tmu_id: 24,
            tmu_title: "Puffs",
          },
          {
            tmu_id: 25,
            tmu_title: "mcg",
          },
          {
            tmu_id: 26,
            tmu_title: "Cups",
          },
          {
            tmu_id: 27,
            tmu_title: "tbsp",
          },
        ],
      },
      {
        tmm_id: 150741,
        tmm_medicine_name: "Nurotas G 300mg/500mcg Capsule",
        tmm_generic: "Gabapentin (300mg) + Methylcobalamin (500mcg)",
        tmm_company: "Vintas Pharmaceuticals Pvt. Ltd.",
        tmm_type: "",
        tmm_days: 3,
        tmm_duration_type: "day(s)",
        tmm_dosage: "4",
        tmm_unit: "2",
        tcm_tmm_freq_morning: 1,
        tcm_tmm_freq_afternoon: 2,
        tcm_tmm_freq_evening: 1,
        tcm_tmm_freq_night: 2,
        tmm_time: 3,
        tmm_remarks: "",
        tmm_freq_type: 0,
        tmf_block: 0,
        tcm_tmr_type: "M",
        display_qty: 18,
        medicineUnit: [
          {
            tmu_id: 1,
            tmu_title: "Amplues",
          },
          {
            tmu_id: 2,
            tmu_title: "Tablets",
          },
          {
            tmu_id: 3,
            tmu_title: "mg",
          },
          {
            tmu_id: 4,
            tmu_title: "ml",
          },
          {
            tmu_id: 5,
            tmu_title: "units",
          },
          {
            tmu_id: 6,
            tmu_title: "Capsule",
          },
          {
            tmu_id: 7,
            tmu_title: "Fingertips",
          },
          {
            tmu_id: 8,
            tmu_title: "Pea sized",
          },
          {
            tmu_id: 9,
            tmu_title: "gms",
          },
          {
            tmu_id: 10,
            tmu_title: "palm sized",
          },
          {
            tmu_id: 11,
            tmu_title: "tsp",
          },
          {
            tmu_id: 12,
            tmu_title: "tbps",
          },
          {
            tmu_id: 13,
            tmu_title: "Kits",
          },
          {
            tmu_id: 14,
            tmu_title: "Drops",
          },
          {
            tmu_id: 15,
            tmu_title: "Sprays",
          },
          {
            tmu_id: 16,
            tmu_title: "Sachets",
          },
          {
            tmu_id: 17,
            tmu_title: "Cup",
          },
          {
            tmu_id: 18,
            tmu_title: "Scoops",
          },
          {
            tmu_id: 19,
            tmu_title: "Suppositories",
          },
          {
            tmu_id: 20,
            tmu_title: "Soaps",
          },
          {
            tmu_id: 21,
            tmu_title: "Bottles",
          },
          {
            tmu_id: 22,
            tmu_title: "patches",
          },
          {
            tmu_id: 23,
            tmu_title: "Respules",
          },
          {
            tmu_id: 24,
            tmu_title: "Puffs",
          },
          {
            tmu_id: 25,
            tmu_title: "mcg",
          },
          {
            tmu_id: 26,
            tmu_title: "Cups",
          },
          {
            tmu_id: 27,
            tmu_title: "tbsp",
          },
        ],
      },
    ],
    consultation_date: "2024-03-08 16:07:24",
  };

  const initialRows = [
    {
      key: "1",
      name: `Temperature (Frh)`,
    },
    {
      key: "2",
      name: `Pulse (/min)`,
    },
    {
      key: "3",
      name: `Resp. Rate (/min)`,
    },
    {
      key: "4",
      name: `Systolic (mmHg)`,
    },
    {
      key: "5",
      name: `Diastolic (mmHg)`,
    },
    {
      key: "6",
      name: `SPO2 (%)`,
    },
    {
      key: "7",
      name: `General RBS (mg/dl)`,
    },
     {
      key: "8",
      name: `FIB4`,
    },
    {
      key: "9",
      name: `Waist Circumference (cms)`,
    },
    {
      key: "10",
      name: `OFC (cms)`,
    },
    {
      key: "11",
      name: `Height (cms)`,
    },
    {
      key: "12",
      name: `Weight (kgs)`,
    },
    {
      key: "13",
      name: `BMI (kg/m²)`,
    },
    {
      key: "14",
      name: `BMR (kcals)`,
    },
    {
      key: "15",
      name: `BSA (m²)`,
    },
  ];

  const initialColumns = [
    {
      title: "Name",
    },
  ];

  // Extract unique dates from the JSON array
  const uniqueDates =
    caseManagerData.vitals.length > 0
      ? [...caseManagerData.vitals.map((item) => item.date)]
      : [];

  // Initialize columns for each unique date
  const dateColumns = uniqueDates.map((date, index) => ({
    title: moment(date).format(showDateFormat),
  }));

  const columns = [...initialColumns, ...dateColumns];

  caseManagerData.vitals.length > 0 &&
    caseManagerData.vitals.map((item, index) => {
      initialRows[0][index] = item.temp ? item.temp : "-";
      initialRows[1][index] = item.pres ? item.pres : "-";
      initialRows[2][index] = item.resp_rate ? item.resp_rate : "-";
      initialRows[3][index] = item.blood_press
        ? item.blood_press.split("/")[0]
          ? item.blood_press.split("/")[0]
          : "-"
        : "-";
      initialRows[4][index] = item.blood_press
        ? item.blood_press.split("/")[1]
          ? item.blood_press.split("/")[1]
          : "-"
        : "-";
      initialRows[5][index] = item.spo2 ? item.spo2 : "-";
      initialRows[6][index] = item.general_rbs ? item.general_rbs : "-";
      initialRows[7][index] = item.fib4 ? item.fib4 : "-";
      initialRows[8][index] = item.waist_circumference ? item.waist_circumference : "-";
      initialRows[9][index] = item.ofc ? item.ofc : "-";
      initialRows[10][index] = item.height ? item.height : "-";
      initialRows[11][index] = item.weight ? item.weight : "-";
      initialRows[12][index] = item.bmi ? parseFloat(item.bmi).toFixed(2) : "-";
      initialRows[13][index] = item.bmr ? parseFloat(item.bmr).toFixed(2) : "-";
      initialRows[14][index] = item.bsa ? parseFloat(item.bsa).toFixed(2) : "-";
     
    });

  const patientDataShow = (id) => {
    var value = "";
    if (id == 1) {
      value = `${caseManagerData?.patient_data?.patinet_name} ${caseManagerData?.patient_data?.patinet_id}`;
    } else if (id == 2) {
      value = `${caseManagerData?.patient_data?.patinet_date_time
        ? caseManagerData?.patient_data?.patinet_date_time
        : ""
        }`;
    } else if (id == 3) {
      value = `${caseManagerData?.patient_data?.patinet_age}Years, ${caseManagerData?.patient_data?.patinet_gender}`;
    } else if (id == 4) {
      value = `${caseManagerData?.patient_data?.patinet_contact_no
        ? caseManagerData?.patient_data?.patinet_contact_no
        : ""
        }`;
    } else if (id == 5) {
      value = `${caseManagerData?.patient_data?.patinet_ht_wt
        ? caseManagerData?.patient_data?.patinet_ht_wt
        : ""
        }`;
    } else if (id == 6) {
      value = `${caseManagerData?.patient_data?.patinet_blood_group
        ? caseManagerData?.patient_data?.patinet_blood_group
        : ""
        }`;
    } else if (id == 7) {
      value = `${caseManagerData?.patient_data?.patinet_address
        ? caseManagerData?.patient_data?.patinet_address
        : ""
        }`;
    } else if (id == 8) {
      value = `${caseManagerData?.patient_data?.patinet_consultation_type
        ? caseManagerData?.patient_data?.patinet_consultation_type
        : ""
        }`;
    } else if (id == 9) {
      value = "";
    } else if (id == 10) {
      value = `${caseManagerData?.patient_data?.patinet_email}`;
    } else if (id == 11) {
      value = `${caseManagerData?.patient_data?.patinet_reference_id}`;
    }
    
    return value;
  };

  return (
    <div className="printCommon">
      {/* Header */}
      <div className="page-header">
        <div className="pb-1">
          {/* For Upload Image Header */}
          {/* <img className="img-fluid" src={PrintHeaderImage} alt="Header" /> */}

          {/* Print RX on your letter header */}
          {/* <div style={{marginLeft: 50, marginRight: 50, marginTop: 50, marginBottom: 50}}></div> */}

          {/* For custom Header */}
          {/* <div className="text-primary fw-bold fontroboto text-uppercase" style={{ fontSize: 24 }}>
                        Care Clinic
                    </div>
                    <div className="fontroboto" style={{ fontSize: 14 }}>
                        Hyderabad, India • 07894561230 • contact@careclinic.com
                    </div> */}
          {printSettings?.letterhead_format === 0 ? (
            <div className="d-flex">
              {printSettings?.header_footer?.header?.doctor_info?.enable ===
                "Y" &&
                printSettings?.header_footer?.header?.clinic_info?.enable ===
                "Y" ? (
                <>
                  <div style={{ flex: 1 }}>
                    <div
                      className="text-secondary-custom fw-bold fontroboto mb-2"
                      style={{ fontSize: 18 }}
                    >
                      {printSettings?.header_footer?.header?.doctor_info
                        ?.place === "L"
                        ? printSettings?.header_footer?.header?.doctor_info
                          ?.header
                        : printSettings?.header_footer?.header?.clinic_info
                          ?.header}
                    </div>
                    <div
                      className="fontroboto fw-medium"
                      style={{ whiteSpace: "pre-line", fontSize: 14 }}
                    >
                      {printSettings?.header_footer?.header?.doctor_info
                        ?.place === "L"
                        ? printSettings?.header_footer?.header?.doctor_info
                          ?.subheader
                        : printSettings?.header_footer?.header?.clinic_info
                          ?.subheader}
                    </div>
                  </div>
                  {printSettings?.logo_enable === "Y" && (
                    <div>
                      {fileLogo && fileLogo?.imageShow && (
                        <img
                          style={{
                            width: 100,
                            height: 100,
                            objectFit: "contain",
                          }}
                          src={fileLogo?.showFile}
                        />
                      )}
                    </div>
                  )}
                  <div style={{ flex: 1 }} className="text-end">
                    <div
                      className="text-secondary-custom fw-bold fontroboto mb-2"
                      style={{ fontSize: 18 }}
                    >
                      {printSettings?.header_footer?.header?.doctor_info
                        ?.place === "R"
                        ? printSettings?.header_footer?.header?.doctor_info
                          ?.header
                        : printSettings?.header_footer?.header?.clinic_info
                          ?.header}
                    </div>
                    <div
                      className="fontroboto fw-medium"
                      style={{ whiteSpace: "pre-line", fontSize: 14 }}
                    >
                      {printSettings?.header_footer?.header?.doctor_info
                        ?.place === "R"
                        ? printSettings?.header_footer?.header?.doctor_info
                          ?.subheader
                        : printSettings?.header_footer?.header?.clinic_info
                          ?.subheader}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {printSettings?.logo_enable === "Y" && (
                    <div>
                      {fileLogo && fileLogo?.imageShow && (
                        <img
                          style={{
                            width: 100,
                            height: 100,
                            objectFit: "contain",
                          }}
                          src={fileLogo?.showFile}
                        />
                      )}
                    </div>
                  )}
                  {printSettings?.header_footer?.header?.doctor_info?.enable ===
                    "Y" ? (
                    <div
                      style={{ flex: 1 }}
                      className={`${printSettings?.header_footer?.header?.doctor_info
                        ?.place === "L"
                        ? ""
                        : "text-end"
                        }`}
                    >
                      <div
                        className="text-secondary-custom fw-bold fontroboto mb-2"
                        style={{ fontSize: 18 }}
                      >
                        {printSettings?.header_footer?.header?.doctor_info
                          ?.enable === "Y"
                          ? printSettings?.header_footer?.header?.doctor_info
                            ?.header
                          : printSettings?.header_footer?.header?.clinic_info
                            ?.header}
                      </div>
                      <div
                        className="fontroboto fw-medium"
                        style={{ whiteSpace: "pre-line", fontSize: 14 }}
                      >
                        {printSettings?.header_footer?.header?.doctor_info
                          ?.enable === "Y"
                          ? printSettings?.header_footer?.header?.doctor_info
                            ?.subheader
                          : printSettings?.header_footer?.header?.clinic_info
                            ?.subheader}
                      </div>
                    </div>
                  ) : (
                    printSettings?.header_footer?.header?.clinic_info
                      ?.enable === "Y" && (
                      <div
                        style={{ flex: 1 }}
                        className={`${printSettings?.header_footer?.header?.clinic_info
                          ?.place === "L"
                          ? ""
                          : "text-end"
                          }`}
                      >
                        <div
                          className="text-secondary-custom fw-bold fontroboto mb-2"
                          style={{ fontSize: 18 }}
                        >
                          {printSettings?.header_footer?.header?.doctor_info
                            ?.enable === "Y"
                            ? printSettings?.header_footer?.header?.doctor_info
                              ?.header
                            : printSettings?.header_footer?.header?.clinic_info
                              ?.header}
                        </div>
                        <div
                          className="fontroboto fw-medium"
                          style={{ whiteSpace: "pre-line", fontSize: 14 }}
                        >
                          {printSettings?.header_footer?.header?.doctor_info
                            ?.enable === "Y"
                            ? printSettings?.header_footer?.header?.doctor_info
                              ?.subheader
                            : printSettings?.header_footer?.header?.clinic_info
                              ?.subheader}
                        </div>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          ) : (
            fileHeader &&
            fileHeader?.imageShow && (
              <img
                style={{ width: "100%", objectFit: "contain" }}
                src={fileHeader?.showFile}
              />
            )
          )}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <td>
              <div className="page-header-space"></div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="page">
                <div className="print-custom-header contentPrint border-top border-bottom">
                  {/* Patient Details */}
                  <div className="border-dark border-bottom patient-details-print">
                    <Flex justify="space-between">
                      <Col flex={7}>
                        {printSettings?.header_footer?.patient_info
                          .filter((e) => e.enable === "Y")
                          .map((item, i) => {
                            return (
                              i % 2 === 0 && (
                                <div key={i} className="details-name">
                                  <span>{item.title}:</span>{" "}
                                  &nbsp;
                                  <span>{patientDataShow(item.id)}</span>
                                </div>
                              )
                            );
                          })}
                      </Col>
                      <Col flex={3}>
                        {printSettings?.header_footer?.patient_info
                          .filter((e) => e.enable === "Y")
                          .map((item, i) => {
                            return (
                              i % 2 === 1 && (
                                <div key={i} className="details-name">
                                  <span>
                                    {item.title}:{" "}
                                  </span>
                                  &nbsp;
                                  <span>{patientDataShow(item.id)}</span>
                                </div>
                              )
                            );
                          })}
                      </Col>
                    </Flex>
                  </div>

                  {/* Inline|List View|Table */}
                  <div
                    className="position-relative print-middle"
                    style={{ zIndex: 0 }}
                  >
                    {printSettings?.water_mark_enable === "Y" &&
                      fileWatermark &&
                      fileWatermark?.imageShow && (
                        <img
                          className="translate-middle watermark-inprint"
                          style={{
                            left: "50%",
                            top: "50%",
                            zIndex: -1,
                            opacity: 0.1,
                            width: 192,
                            height: 192,
                            objectFit: "contain",
                          }}
                          src={fileWatermark?.showFile}
                        />
                      )}
                    <div>
                      {caseManagerData.vitals.length > 0 &&
                        printSettings?.prescription?.case_option[6]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[6]?.format ===
                          "inline" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Vitals & Body Composition:&nbsp;
                            </label>
                            {caseManagerData.vitals.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`lh-18 ${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-bold">
                                    {item.date}&nbsp;
                                  </label>
                                  <>
                                    {`- ${Object.values(
                                      Object.fromEntries(
                                        Object.entries(
                                          (({
                                            temp,
                                            pres,
                                            resp_rate,
                                            blood_press,
                                            spo2,
                                            height,
                                            weight,
                                            fib4,
                                            waist_circumference,
                                            bmi,
                                            bmr,
                                            bsa,
                                          }) => ({
                                            temp: temp
                                              ? `Temperature (${temp}Frh)`
                                              : "",
                                            pres: pres
                                              ? `Pulse (${pres}/min)`
                                              : "",
                                            resp_rate: resp_rate
                                              ? `Resp. Rate (${resp_rate}/min)`
                                              : "",
                                            systolic: blood_press
                                              ? blood_press.split("/")[0]
                                                ? `Systolic (${blood_press.split("/")[0]
                                                }mmHg)`
                                                : ""
                                              : "",
                                            diastolic: blood_press
                                              ? blood_press.split("/")[1]
                                                ? `Diastolic (${blood_press.split("/")[1]
                                                }mmHg)`
                                                : ""
                                              : "",
                                            spo2: spo2 ? `SPO2 (${spo2}%)` : "",
                                            height: height
                                              ? `Height (${height}cms)`
                                              : "",
                                            weight: weight
                                              ? `Weight (${weight}kgs)`
                                              : "",
                                            fib4: fib4 ? `FIB4 (${fib4})` : "",
                                            waist_circumference: waist_circumference
                                              ? `Waist Circumference (${waist_circumference}cms)`
                                              : "",
                                            bmi: bmi
                                              ? `BMI (${parseFloat(bmi).toFixed(
                                                2
                                              )}kg/m²)`
                                              : "",
                                            bmr: bmr
                                              ? `BMR (${parseFloat(bmr).toFixed(
                                                2
                                              )}kcals)`
                                              : "",
                                            bsa: bsa
                                              ? `BSA (${parseFloat(bsa).toFixed(
                                                2
                                              )}m²)`
                                              : "",
                                          }))(caseManagerData.vitals[i])
                                        ).filter(([_, v]) => v)
                                      )
                                    ).join(", ")}`}
                                    {caseManagerData.vitals.length - 1 != i
                                      ? ","
                                      : ""}
                                    &nbsp;
                                  </>
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[6]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Vitals & Body Composition:&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.vitals.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold"
                                    >
                                      {item.date}&nbsp;
                                    </label>
                                    <>
                                      {`- ${Object.values(
                                        Object.fromEntries(
                                          Object.entries(
                                            (({
                                              temp,
                                              pres,
                                              resp_rate,
                                              blood_press,
                                              spo2,
                                              height,
                                              weight,
                                              fib4,
                                              waist_circumference,
                                              bmi,
                                              bmr,
                                              bsa,
                                            }) => ({
                                              temp: temp
                                                ? `Temperature (${temp}Frh)`
                                                : "",
                                              pres: pres
                                                ? `Pulse (${pres}/min)`
                                                : "",
                                              resp_rate: resp_rate
                                                ? `Resp. Rate (${resp_rate}/min)`
                                                : "",
                                              systolic: blood_press
                                                ? blood_press.split("/")[0]
                                                  ? `Systolic (${blood_press.split("/")[0]
                                                  }mmHg)`
                                                  : ""
                                                : "",
                                              diastolic: blood_press
                                                ? blood_press.split("/")[1]
                                                  ? `Diastolic (${blood_press.split("/")[1]
                                                  }mmHg)`
                                                  : ""
                                                : "",
                                              spo2: spo2
                                                ? `SPO2 (${spo2}%)`
                                                : "",
                                              height: height
                                                ? `Height (${height}cms)`
                                                : "",
                                              weight: weight
                                                ? `Weight (${weight}kgs)`
                                                : "",
                                              fib4: fib4 ? `FIB4 (${fib4})` : "",
                                              waist_circumference: waist_circumference
                                                ? `Waist Circumference (${waist_circumference}cms)`
                                                : "",
                                              bmi: bmi
                                                ? `BMI (${parseFloat(
                                                  bmi
                                                ).toFixed(2)}kg/m²)`
                                                : "",
                                              bmr: bmr
                                                ? `BMR (${parseFloat(
                                                  bmr
                                                ).toFixed(2)}kcals)`
                                                : "",
                                              bsa: bsa
                                                ? `BSA (${parseFloat(
                                                  bsa
                                                ).toFixed(2)}m²)`
                                                : "",
                                            }))(caseManagerData.vitals[i])
                                          ).filter(([_, v]) => v)
                                        )
                                      ).join(", ")}`}
                                      <br />
                                    </>
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Vitals & Body Composition:&nbsp;
                            </label>
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                            >
                              <tr>
                                {columns.map((item, i) => {
                                  return (
                                    <th
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.title}
                                    </th>
                                  );
                                })}
                              </tr>
                              {initialRows.map((item, i) => {
                                return (
                                  <tr key={i}>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.name}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item["0"]}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item["1"]}
                                    </td>
                                  </tr>
                                );
                              })}
                            </table>
                          </div>
                        ))}

                      {caseManagerData.symptoms.length > 0 &&
                        printSettings?.prescription?.case_option[0]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[0]?.format ===
                          "inline" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Symptoms:&nbsp;
                            </label>
                            {caseManagerData.symptoms.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-bold">
                                    {item.symptom_name}&nbsp;
                                  </label>
                                  {item.since || item.severity || item.note ? (
                                    <>
                                      {`(${Object.values(
                                        Object.fromEntries(
                                          Object.entries(
                                            (({ since, severity, note }) => ({
                                              since,
                                              severity,
                                              note,
                                            }))(caseManagerData.symptoms[i])
                                          ).filter(([_, v]) => v)
                                        )
                                      ).join(", ")})`}
                                      {caseManagerData.symptoms.length - 1 != i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  ) : (
                                    <>
                                      {caseManagerData.symptoms.length - 1 != i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[0]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Symptoms:&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.symptoms.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold"
                                    >
                                      {item.symptom_name}&nbsp;
                                    </label>
                                    {(item.since ||
                                      item.severity ||
                                      item.note) && (
                                        <>
                                          {`(${Object.values(
                                            Object.fromEntries(
                                              Object.entries(
                                                (({ since, severity, note }) => ({
                                                  since,
                                                  severity,
                                                  note,
                                                }))(caseManagerData.symptoms[i])
                                              ).filter(([_, v]) => v)
                                            )
                                          ).join(", ")})`}
                                          <br />
                                        </>
                                      )}
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Symptoms:&nbsp;
                            </label>
                            {(() => {
                              const allStringFormat = caseManagerData.symptoms.every(item => {
                                if (item.isStringFormat) return true;
                                const hasStructuredData = (item.since && item.since !== '') || (item.severity && item.severity !== '') || (item.note && item.note !== '');
                                return !hasStructuredData;
                              });
                              return (
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                                  style={{ border: '1px solid #171725', borderCollapse: 'collapse' }}
                            >
                                  {!allStringFormat && (
                              <tr>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NAME
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  SINCE
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  SEVERITY
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NOTE
                                </th>
                              </tr>
                                  )}
                                  {caseManagerData.symptoms.map((item, i) => (
                                  <tr key={i}>
                                      {allStringFormat ? (
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                          colSpan="4"
                                        >
                                          {item.symptom_name}
                                        </td>
                                      ) : (
                                        <>
                                          <td
                                            className={`${printSettings.page_format.font_family}`}
                                            style={{
                                              fontSize:
                                                printSettings.page_format.font_size,
                                            }}
                                    >
                                      {item.symptom_name}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.since ? item.since : "-"}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.severity ? item.severity : "-"}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.note ? item.note : "-"}
                                    </td>
                                        </>
                                      )}
                                  </tr>
                                  ))}
                            </table>
                              );
                            })()}
                          </div>
                        ))}

                      {caseManagerData.examination.length > 0 &&
                        printSettings?.prescription?.case_option[1]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[1]?.format ===
                          "inline" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Examinations:&nbsp;
                            </label>
                            {caseManagerData.examination.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-bold">
                                    {item.examination_name}&nbsp;
                                  </label>
                                  {item.note ? (
                                    <>
                                      {`(${Object.values(
                                        Object.fromEntries(
                                          Object.entries(
                                            (({ note }) => ({ note }))(
                                              caseManagerData.examination[i]
                                            )
                                          ).filter(([_, v]) => v)
                                        )
                                      ).join(", ")})`}
                                      {caseManagerData.examination.length - 1 !=
                                        i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  ) : (
                                    <>
                                      {caseManagerData.examination.length - 1 !=
                                        i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[1]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Examinations:&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.examination.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold"
                                    >
                                      {item.examination_name}&nbsp;
                                    </label>
                                    {item.note && (
                                      <>
                                        {`(${Object.values(
                                          Object.fromEntries(
                                            Object.entries(
                                              (({ note }) => ({ note }))(
                                                caseManagerData.examination[i]
                                              )
                                            ).filter(([_, v]) => v)
                                          )
                                        ).join(", ")})`}
                                        <br />
                                      </>
                                    )}
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Examinations:&nbsp;
                            </label>
                            {(() => {
                              const allStringFormat = caseManagerData.examination.every(item => {
                                const hasStructuredData = (item.note && item.note !== '');
                                return !hasStructuredData;
                              });
                              return (
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                                  style={{ border: '1px solid #171725', borderCollapse: 'collapse' }}
                            >
                                  {!allStringFormat && (
                              <tr>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NAME
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NOTE
                                </th>
                              </tr>
                                  )}
                                  {caseManagerData.examination.map((item, i) => (
                                  <tr key={i}>
                                      {allStringFormat ? (
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                          colSpan="2"
                                        >
                                          {item.examination_name}
                                        </td>
                                      ) : (
                                        <>
                                          <td
                                            className={`${printSettings.page_format.font_family}`}
                                            style={{
                                              fontSize:
                                                printSettings.page_format.font_size,
                                            }}
                                    >
                                      {item.examination_name}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.note ? item.note : "-"}
                                    </td>
                                        </>
                                      )}
                                  </tr>
                                  ))}
                            </table>
                              );
                            })()}
                          </div>
                        ))}

                      {caseManagerData.surgeries.length > 0 &&
                        printSettings?.prescription?.case_option[1]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[1]?.format ===
                          "inline" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Surgeries/Procedures:&nbsp;
                            </label>
                            {caseManagerData.surgeries.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-bold">
                                    {item.name}&nbsp;
                                  </label>
                                  {item.notes ? (
                                    <>
                                      {`(${Object.values(
                                        Object.fromEntries(
                                          Object.entries(
                                            (({ notes }) => ({ notes }))(
                                              caseManagerData.surgeries[i]
                                            )
                                          ).filter(([_, v]) => v)
                                        )
                                      ).join(", ")})`}
                                      {caseManagerData.surgeries.length - 1 !=
                                        i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  ) : (
                                    <>
                                      {caseManagerData.surgeries.length - 1 !=
                                        i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[1]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Surgeries/Procedures:&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.surgeries.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold"
                                    >
                                      {item.name}&nbsp;
                                    </label>
                                    {item.notes && (
                                      <>
                                        {`(${Object.values(
                                          Object.fromEntries(
                                            Object.entries(
                                              (({ notes }) => ({ notes }))(
                                                caseManagerData.surgeries[i]
                                              )
                                            ).filter(([_, v]) => v)
                                          )
                                        ).join(", ")})`}
                                        <br />
                                      </>
                                    )}
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Surgeries/Procedures:&nbsp;
                            </label>
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                            >
                              <tr>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NAME
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NOTE
                                </th>
                              </tr>
                              {caseManagerData.surgeries.map((item, i) => {
                                return (
                                  <tr key={i}>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.name}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.notes ? item.notes : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </table>
                          </div>
                        ))}

                      {caseManagerData.diagnosis.length > 0 &&
                        printSettings?.prescription?.case_option[2]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[2]?.format ===
                          "inline" ? (
                          <div className="mb-15 lh-18">
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Diagnosis:&nbsp;
                            </label>
                            {caseManagerData.diagnosis.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-bold">
                                    {item.tds_name}&nbsp;
                                  </label>
                                  {item.since || item.status || item.note ? (
                                    <>
                                      {`(${Object.values(
                                        Object.fromEntries(
                                          Object.entries(
                                            (({ since, status, note }) => ({
                                              since,
                                              status,
                                              note,
                                            }))(caseManagerData.diagnosis[i])
                                          ).filter(([_, v]) => v)
                                        )
                                      ).join(", ")})`}
                                      {caseManagerData.diagnosis.length - 1 != i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  ) : (
                                    <>
                                      {caseManagerData.diagnosis.length - 1 != i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[2]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Diagnosis:&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.diagnosis.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold"
                                    >
                                      {item.tds_name}&nbsp;
                                    </label>
                                    {(item.since ||
                                      item.status ||
                                      item.note) && (
                                        <>
                                          {`(${Object.values(
                                            Object.fromEntries(
                                              Object.entries(
                                                (({ since, status, note }) => ({
                                                  since,
                                                  status,
                                                  note,
                                                }))(caseManagerData.diagnosis[i])
                                              ).filter(([_, v]) => v)
                                            )
                                          ).join(", ")})`}
                                          <br />
                                        </>
                                      )}
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Diagnosis:&nbsp;
                            </label>
                            {(() => {
                              const allStringFormat = caseManagerData.diagnosis.every(item => {
                                if (item.isStringFormat) return true;
                                const hasStructuredData = (item.since && item.since !== '') || (item.status && item.status !== '') || (item.note && item.note !== '');
                                return !hasStructuredData;
                              });
                              return (
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                                  style={{ border: '1px solid #171725', borderCollapse: 'collapse' }}
                            >
                                  {!allStringFormat && (
                              <tr>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NAME
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  SINCE
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  STATUS
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NOTE
                                </th>
                              </tr>
                                  )}
                                  {caseManagerData.diagnosis.map((item, i) => (
                                  <tr key={i}>
                                      {allStringFormat ? (
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                          colSpan="4"
                                        >
                                          {item.tds_name}
                                        </td>
                                      ) : (
                                        <>
                                          <td
                                            className={`${printSettings.page_format.font_family}`}
                                            style={{
                                              fontSize:
                                                printSettings.page_format.font_size,
                                            }}
                                    >
                                      {item.tds_name}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.since ? item.since : "-"}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.status ? item.status : "-"}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.note ? item.note : "-"}
                                    </td>
                                        </>
                                      )}
                                  </tr>
                                  ))}
                            </table>
                              );
                            })()}
                          </div>
                        ))}

                      {caseManagerData.medicine.length > 0 &&
                        printSettings?.prescription?.case_option[3]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[3]?.format ===
                          "inline" ? (
                          <div className="mb-15 lh-18">
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Medication (Rx):&nbsp;
                            </label>
                            {caseManagerData.medicine.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-bold">
                                    {item.tmm_medicine_name},{item.tmm_generic}
                                    &nbsp;
                                  </label>
                                  <>
                                    {`(${Object.values(
                                      Object.fromEntries(
                                        Object.entries(
                                          (({
                                            tmf_block,
                                            tcm_tmm_freq_morning,
                                            tcm_tmm_freq_afternoon,
                                            tcm_tmm_freq_evening,
                                            tcm_tmm_freq_night,
                                            tmm_freq_type,
                                            tmm_time,
                                            tmm_days,
                                            tmm_duration_type,
                                            display_qty,
                                            tmm_remarks,
                                          }) => ({
                                            modiFrequency:
                                              tmf_block === 0 ||
                                                tmf_block === ""
                                                ? `${tcm_tmm_freq_morning
                                                  ? tcm_tmm_freq_morning
                                                  : 0
                                                }-${tcm_tmm_freq_afternoon
                                                  ? tcm_tmm_freq_afternoon
                                                  : 0
                                                }-${tcm_tmm_freq_evening
                                                  ? tcm_tmm_freq_evening
                                                  : 0
                                                }-${tcm_tmm_freq_night
                                                  ? tcm_tmm_freq_night
                                                  : 0
                                                }`
                                                : `- (${frequencyList.find(
                                                  (x) =>
                                                    x.tmf_id ===
                                                    tmm_freq_type
                                                ) !== undefined
                                                  ? frequencyList.find(
                                                    (x) =>
                                                      x.tmf_id ===
                                                      tmm_freq_type
                                                  ).tmf_title
                                                  : ""
                                                })`,

                                            modiTiming:
                                              timingList.find(
                                                (x) => x.tmt_id === tmm_time
                                              ) !== undefined
                                                ? timingList.find(
                                                  (x) => x.tmt_id === tmm_time
                                                ).tmt_title
                                                : "",

                                            modiDuration: isNumeric(tmm_days)
                                              ? `${tmm_days} - ${tmm_duration_type}`
                                              : "-",

                                            modiDisplayQty: display_qty
                                              ? display_qty.toFixed(2)
                                              : "",

                                            tmm_remarks,
                                          }))(caseManagerData.medicine[i])
                                        ).filter(([_, v]) => v)
                                      )
                                    ).join(", ")})`}
                                    {caseManagerData.medicine.length - 1 != i
                                      ? ","
                                      : ""}
                                    &nbsp;
                                  </>
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[3]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Medication (Rx):&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.medicine.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold"
                                    >
                                      {item.tmm_medicine_name},
                                      {item.tmm_generic}&nbsp;
                                    </label>
                                    <>
                                      {`(${Object.values(
                                        Object.fromEntries(
                                          Object.entries(
                                            (({
                                              tmf_block,
                                              tcm_tmm_freq_morning,
                                              tcm_tmm_freq_afternoon,
                                              tcm_tmm_freq_evening,
                                              tcm_tmm_freq_night,
                                              tmm_freq_type,
                                              tmm_time,
                                              tmm_days,
                                              tmm_duration_type,
                                              display_qty,
                                              tmm_remarks,
                                            }) => ({
                                              modiFrequency:
                                                tmf_block === 0 ||
                                                  tmf_block === ""
                                                  ? `${tcm_tmm_freq_morning
                                                    ? tcm_tmm_freq_morning
                                                    : 0
                                                  }-${tcm_tmm_freq_afternoon
                                                    ? tcm_tmm_freq_afternoon
                                                    : 0
                                                  }-${tcm_tmm_freq_evening
                                                    ? tcm_tmm_freq_evening
                                                    : 0
                                                  }-${tcm_tmm_freq_night
                                                    ? tcm_tmm_freq_night
                                                    : 0
                                                  }`
                                                  : `- (${frequencyList.find(
                                                    (x) =>
                                                      x.tmf_id ===
                                                      tmm_freq_type
                                                  ) !== undefined
                                                    ? frequencyList.find(
                                                      (x) =>
                                                        x.tmf_id ===
                                                        tmm_freq_type
                                                    ).tmf_title
                                                    : ""
                                                  })`,

                                              modiTiming:
                                                timingList.find(
                                                  (x) => x.tmt_id === tmm_time
                                                ) !== undefined
                                                  ? timingList.find(
                                                    (x) =>
                                                      x.tmt_id === tmm_time
                                                  ).tmt_title
                                                  : "",

                                              modiDuration: isNumeric(tmm_days)
                                                ? `${tmm_days} - ${tmm_duration_type}`
                                                : "-",

                                              modiDisplayQty: display_qty
                                                ? display_qty.toFixed(2)
                                                : "",

                                              tmm_remarks,
                                            }))(caseManagerData.medicine[i])
                                          ).filter(([_, v]) => v)
                                        )
                                      ).join(", ")})`}
                                      <br />
                                    </>
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Medication (Rx):&nbsp;
                            </label>
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                            >
                              <tr>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  RX
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NAME
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  FREQUENCY
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  DURATION
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  QTY.
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NOTE
                                </th>
                              </tr>
                              {caseManagerData.medicine.map((item, i) => {
                                return (
                                  <tr key={i}>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {i + 1}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      <strong>{item.tmm_medicine_name}</strong>
                                      <br />
                                      {item.tmm_generic || item.corrected_name || item.metadata?.tmm_generic || ''}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.tmf_block === 0 ||
                                        item.tmf_block === ""
                                        ? `${item.tcm_tmm_freq_morning
                                          ? item.tcm_tmm_freq_morning
                                          : 0
                                        }-${item.tcm_tmm_freq_afternoon
                                          ? item.tcm_tmm_freq_afternoon
                                          : 0
                                        }-${item.tcm_tmm_freq_evening
                                          ? item.tcm_tmm_freq_evening
                                          : 0
                                        }-${item.tcm_tmm_freq_night
                                          ? item.tcm_tmm_freq_night
                                          : 0
                                        }`
                                        : `- (${frequencyList.find(
                                          (x) =>
                                            x.tmf_id === item.tmm_freq_type
                                        ) !== undefined
                                          ? frequencyList.find(
                                            (x) =>
                                              x.tmf_id ===
                                              item.tmm_freq_type
                                          ).tmf_title
                                          : ""
                                        })`}
                                      <br />
                                      {timingList.find(
                                        (x) => x.tmt_id === item.tmm_time
                                      ) !== undefined
                                        ? timingList.find(
                                          (x) => x.tmt_id === item.tmm_time
                                        ).tmt_title
                                        : ""}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {isNumeric(item.tmm_days)
                                        ? `${item.tmm_days} - ${item.tmm_duration_type}`
                                        : "-"}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.display_qty
                                        ? item.display_qty.toFixed(2)
                                        : "-"}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.tmm_remarks
                                        ? item.tmm_remarks
                                        : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </table>
                          </div>
                        ))}

                      {caseManagerData.advice.length > 0 &&
                        printSettings?.prescription?.case_option[4]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[4]?.format ===
                          "inline" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Advices:&nbsp;
                            </label>
                            {caseManagerData.advice.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-medium">
                                    {item.advice_name}&nbsp;
                                  </label>
                                  <>
                                    {caseManagerData.advice.length - 1 != i
                                      ? ","
                                      : ""}
                                    &nbsp;
                                  </>
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[4]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Advices:&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.advice.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-medium mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-medium"
                                    >
                                      {item.advice_name}&nbsp;
                                    </label>
                                    <br />
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Advices:&nbsp;
                            </label>
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                            >
                              <tr>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NAME
                                </th>
                              </tr>
                              {caseManagerData.advice.map((item, i) => {
                                return (
                                  <tr key={i}>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.advice_name}
                                    </td>
                                  </tr>
                                );
                              })}
                            </table>
                          </div>
                        ))}

                      {caseManagerData.investigation.length > 0 &&
                        printSettings?.prescription?.case_option[5]?.enable ===
                        "Y" &&
                        (printSettings?.prescription?.case_option[5]?.format ===
                          "inline" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Lab Investigation:&nbsp;
                            </label>
                            {caseManagerData.investigation.map((item, i) => {
                              return (
                                <label
                                  key={i}
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  <label className="fw-bold">
                                    {item.investigation_name}&nbsp;
                                  </label>
                                  {item.note ? (
                                    <>
                                      {`(${Object.values(
                                        Object.fromEntries(
                                          Object.entries(
                                            (({ note }) => ({ note }))(
                                              caseManagerData.investigation[i]
                                            )
                                          ).filter(([_, v]) => v)
                                        )
                                      ).join(", ")})`}
                                      {caseManagerData.investigation.length -
                                        1 !=
                                        i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  ) : (
                                    <>
                                      {caseManagerData.investigation.length -
                                        1 !=
                                        i
                                        ? ","
                                        : ""}
                                      &nbsp;
                                    </>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        ) : printSettings?.prescription?.case_option[5]
                          ?.format === "listview" ? (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Lab Investigation:&nbsp;
                            </label>{" "}
                            <br />
                            <label
                              className={`${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              {caseManagerData.investigation.map((item, i) => {
                                return (
                                  <>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold mt-1"
                                    >
                                      &nbsp;{i + 1}.&nbsp;
                                    </label>
                                    <label
                                      key={Math.random()}
                                      className="fw-bold"
                                    >
                                      {item.investigation_name}&nbsp;
                                    </label>
                                    {item.note && (
                                      <>
                                        {`(${Object.values(
                                          Object.fromEntries(
                                            Object.entries(
                                              (({ note }) => ({ note }))(
                                                caseManagerData.investigation[i]
                                              )
                                            ).filter(([_, v]) => v)
                                          )
                                        ).join(", ")})`}
                                        <br />
                                      </>
                                    )}
                                  </>
                                );
                              })}
                            </label>
                          </div>
                        ) : (
                          <div
                            className="mb-15"
                            style={{
                              fontSize: printSettings.page_format.font_size,
                            }}
                          >
                            <label
                              className={`fw-bold mb-1 ${printSettings.page_format.font_family}`}
                              style={{
                                fontSize: printSettings.page_format.font_size,
                              }}
                            >
                              Lab Investigation:&nbsp;
                            </label>
                            <table
                              className="w-100 mb-15 print_table"
                              cellPadding={5}
                              cellSpacing={5}
                            >
                              <tr>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NAME
                                </th>
                                <th
                                  className={`${printSettings.page_format.font_family}`}
                                  style={{
                                    fontSize:
                                      printSettings.page_format.font_size,
                                  }}
                                >
                                  NOTE
                                </th>
                              </tr>
                              {caseManagerData.investigation.map((item, i) => {
                                return (
                                  <tr key={i}>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.investigation_name}
                                    </td>
                                    <td
                                      className={`${printSettings.page_format.font_family}`}
                                      style={{
                                        fontSize:
                                          printSettings.page_format.font_size,
                                      }}
                                    >
                                      {item.note ? item.note : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </table>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Signature & QR code section */}
                  <div>
                    {printSettings?.signature_enable === "Y" &&
                      fileSignature &&
                      fileSignature?.imageShow && (
                        <div className="d-flex">
                          <div
                            style={{ flex: 1 }}
                            className={`${printSettings?.header_footer?.other_settings
                              ?.signature_place === "R" && "text-end"
                              }`}
                          >
                            <img
                              style={{
                                width: 139,
                                height: 60,
                                objectFit: "contain",
                              }}
                              src={fileSignature?.showFile}
                            />
                          </div>
                        </div>
                      )}
                    {printSettings?.qrcode_enable === "Y" &&
                      printSettings?.signature_enable === "Y" ? (
                      printSettings?.header_footer?.other_settings
                        ?.signature_place === "R" ? (
                        <div className="d-flex pb-4">
                          <div style={{ flex: 1 }}>
                            <div className="d-flex align-items-center">
                              <div>
                                <img
                                  style={{
                                    width: 61,
                                    height: 61,
                                    objectFit: "contain",
                                  }}
                                  src={printSettings?.qrcode}
                                />
                              </div>
                              <div
                                className="fontroboto ms-2 text-blacks"
                                style={{ fontSize: 10 }}
                              >
                                Scan QR code to book an appointment <br /> with
                                your doctor or download your old <br /> digital
                                prescription
                              </div>
                            </div>
                          </div>
                          <div style={{ flex: 1 }} className={"text-end"}>
                            {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                              <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                {caseManagerData?.doctor_data?.doctor_name}
                              </div>
                            )}
                            {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                              <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                {`Medical Registration No.: ${caseManagerData?.doctor_data?.gmc_no}`}
                              </div>
                            )}
                            {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                              <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : caseManagerData?.doctor_data?.um_qualifications}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex pb-4">
                          <div style={{ flex: 1 }}>
                            {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                              <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                {caseManagerData?.doctor_data?.doctor_name}
                              </div>
                            )}
                            {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                              <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                {`Medical Registration No.: ${caseManagerData?.doctor_data?.gmc_no}`}
                              </div>
                            )}
                            {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                              <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : caseManagerData?.doctor_data?.um_qualifications}
                              </div>
                            )}
                          </div>
                          <div className={"text-end"}>
                            <div className="d-flex align-items-center">
                              <div
                                className="fontroboto text-blacks"
                                style={{ fontSize: 10 }}
                              >
                                Scan QR code to book an appointment <br /> with
                                your doctor or download your old <br /> digital
                                prescription
                              </div>
                              <div className="ms-2">
                                <img
                                  style={{
                                    width: 61,
                                    height: 61,
                                    objectFit: "contain",
                                  }}
                                  src={printSettings?.qrcode}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      (printSettings?.qrcode_enable === "Y" ||
                        printSettings?.signature_enable === "Y") && (
                        <div className="d-flex pb-4">
                          {printSettings?.qrcode_enable === "Y" && (
                            <div style={{ flex: 1 }}>
                              <div className="d-flex align-items-center">
                                <div>
                                  <img
                                    style={{
                                      width: 61,
                                      height: 61,
                                      objectFit: "contain",
                                    }}
                                    src={printSettings?.qrcode}
                                  />
                                </div>
                                <div
                                  className="fontroboto ms-2 text-blacks"
                                  style={{ fontSize: 10 }}
                                >
                                  Scan QR code to book an appointment <br />{" "}
                                  with your doctor or download your old <br />{" "}
                                  digital prescription
                                </div>
                              </div>
                            </div>
                          )}
                          {printSettings?.signature_enable === "Y" && (
                            <div
                              style={{ flex: 1 }}
                              className={`${printSettings?.header_footer?.other_settings
                                ?.signature_place === "R" && "text-end"
                                }`}
                            >
                              {printSettings?.header_footer?.other_settings?.name_of_doctor_enable === 'Y' && (
                                <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                  {caseManagerData?.doctor_data?.doctor_name}
                                </div>
                              )}
                              {printSettings?.header_footer?.other_settings?.registration_no_enable === 'Y' && (
                                <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                  {`Medical Registration No.: ${caseManagerData?.doctor_data?.gmc_no}`}
                                </div>
                              )}
                              {printSettings?.header_footer?.other_settings?.qualification_enable === 'Y' && (
                                <div className="fontroboto fw-bold fs-12-1" style={{ color: "#000 !important" }}>
                                  {printSettings?.header_footer?.other_settings?.qualification ? printSettings?.header_footer?.other_settings?.qualification : caseManagerData?.doctor_data?.um_qualifications}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <div className="page-footer-space"></div>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Footer Section */}
      <div className="page-footer">
        {printSettings?.letterhead_format === 1 &&
          fileFooter &&
          fileFooter?.imageShow && (
            <img
              className="footer-fixed"
              style={{ width: "100%", objectFit: "contain" }}
              src={fileFooter?.showFile}
            />
          )}
      </div>
    </div>
  );
}
export default React.memo(PrintHtmlPage);
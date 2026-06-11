import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import { combineReducers } from "redux";
import storage from "redux-persist/lib/storage";

import appointmentsSlice from "./appointmentsSlice";
import doctorsSlice from "./doctorsSlice";
import symptomsSlice from "./symptomsSlice";
import examinationSlice from "./examinationSlice";
import diagnosisSlice from "./diagnosisSlice";
import adviceSlice from "./adviceSlice";
import investigationSlice from "./investigationSlice";
import medicationSlice from "./medicationSlice";
import vitalsSlice from "./vitalsSlice";
import medicalhistorySlice from "./medicalhistorySlice";
import caseManagerSlice from "./caseManagerSlice";
import followUpSlice from "./followUpSlice";
import vaccineSlice from "./vaccineSlice";
import growthChartSlice from "./growthChartSlice";
import doctorWebsiteSlice from "./doctorWebsiteSlice";
import obstetricSlice from "./obstetricSlice";
import uploadDocSlice from "./uploadDocSlice";
import ddxSlice from "./ddxSlice";
import subscriptionReducer from "./subscriptionSlice";
import doctorModalReducer from "./doctorModalSlice";
import surgicalSlice from "./surgicalSlice";
import bulkMessagesSlice from "./bulkMessagesSlice";
import customModuleReducer from "./customModuleSlice";
import snapRxDigitizationSlice from "./snapRxDigitizationSlice";
import billingSlice from "./billingSlice";
import shortLinkSlice from "./shortLinkSlice";
import monetizationSlice from "./monetizationSlice";
import abhaSlice from "./abhaSlice";
import ipdSlice from "./ipdSlice";
import billingPackageSlice from "./billingPackageSlice";
import ophthalSnapRxDigitizationSlice from "./ophthalSnapRxDigitizationSlice";
import ophthalmologyExamSlice from "./ophthalmologyExamSlice";
import slitLampTemplateSlice from "./slitLampTemplateSlice";
import fundusTemplateSlice from "./fundusTemplateSlice";
import teleconsultNotificationReducer from "./teleconsultNotificationSlice";
import healthCheckupReportSlice from "./healthCheckupReportSlice";
import dentalRxSlice from "./dentalRxSlice";
import voiceDigitizationReducer from "./voiceDigitizationSlice";
import pastVisitsReducer from "./pastVisitsSlice";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["doctors"],
};

const rootReducer = combineReducers({
  records: appointmentsSlice,
  doctors: doctorsSlice,
  symptoms: symptomsSlice,
  examination: examinationSlice,
  surgical: surgicalSlice,
  diagnosis: diagnosisSlice,
  advice: adviceSlice,
  investigation: investigationSlice,
  medication: medicationSlice,
  vitals: vitalsSlice,
  medicalhistory: medicalhistorySlice,
  caseManager: caseManagerSlice,
  followUp: followUpSlice,
  vaccines: vaccineSlice,
  growthChart: growthChartSlice,
  doctorWebsite: doctorWebsiteSlice,
  obstetric: obstetricSlice,
  uploadDoc: uploadDocSlice,
  ddx: ddxSlice,
  subscription: subscriptionReducer,
  doctorModal: doctorModalReducer,
  bulkMessages: bulkMessagesSlice,
  customModules: customModuleReducer,
  billing: billingSlice,
  snapRx: snapRxDigitizationSlice,
  ophthalSnapRx: ophthalSnapRxDigitizationSlice,
  shortLink: shortLinkSlice,
  monetization: monetizationSlice,
  abha: abhaSlice,
  ipd: ipdSlice,
  billingPackage: billingPackageSlice,
  ophthalmologyExam: ophthalmologyExamSlice,
  slitLampTemplates: slitLampTemplateSlice,
  fundusTemplates: fundusTemplateSlice,
  teleconsultNotification: teleconsultNotificationReducer,
  healthCheckupReport: healthCheckupReportSlice,
  dentalRx: dentalRxSlice,
  voiceDigitization: voiceDigitizationReducer,
  pastVisits: pastVisitsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }),
});

const persistor = persistStore(store);

export { store, persistor };

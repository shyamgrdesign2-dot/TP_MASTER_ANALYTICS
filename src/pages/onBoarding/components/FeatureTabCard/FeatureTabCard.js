import React, { useState, useEffect } from "react";

import "./FeatureTabCard.scss";

// Import all landing page icons for the feature tab cards

import { isMobile } from "react-device-detect";
import { ASSETS } from "../../../../assets";
const {
  emr: Emr,
  practice: Practice,
  aisymbol: Ai,
} = ASSETS.images;
const Abdm = ASSETS.images.websiteImages.lpAbdm;
const AdminTasks = ASSETS.images.websiteImages.lpAdmintasks;
const Analytics = ASSETS.images.websiteImages.lpAnalytics;
const ClinicCare = ASSETS.images.websiteImages.lpCliniccare;
const TatvaAssist = ASSETS.images.websiteImages.lpDdx;
const DigitalCare = ASSETS.images.websiteImages.lpDigitalcare;
const RemoteCare = ASSETS.images.websiteImages.lpRemotecare;
const SmartSync = ASSETS.images.websiteImages.lpSmartsync;
const TatvaAi = ASSETS.images.websiteImages.lpTatvaai;
const VoiceRx = ASSETS.images.websiteImages.lpVoicerx;
const briefcase = ASSETS.images.onboardPageIcons.briefcase;
const clipboardText = ASSETS.images.onboardPageIcons.clipboardText;
const ddx = ASSETS.images.onboardPageIcons.ddx;
const documentCloud = ASSETS.images.onboardPageIcons.documentCloud;
const documentText = ASSETS.images.onboardPageIcons.documentText;
const examination = ASSETS.images.onboardPageIcons.examination;
const graph = ASSETS.images.onboardPageIcons.graph;
const health = ASSETS.images.onboardPageIcons.health;
const lampCharge = ASSETS.images.onboardPageIcons.lampCharge;
const medication = ASSETS.images.onboardPageIcons.medication;
const messages1 = ASSETS.images.onboardPageIcons.messages1;
const messages2 = ASSETS.images.onboardPageIcons.messages2;
const monitor = ASSETS.images.onboardPageIcons.monitor;
const note = ASSETS.images.onboardPageIcons.note;
const note1 = ASSETS.images.onboardPageIcons.note1;
const note2 = ASSETS.images.onboardPageIcons.note2;
const people = ASSETS.images.onboardPageIcons.people;
const profile2user = ASSETS.images.onboardPageIcons.profile2user;
const receiptText = ASSETS.images.onboardPageIcons.receiptText;
const statusUp = ASSETS.images.onboardPageIcons.statusUp;
const statusUp1 = ASSETS.images.onboardPageIcons.statusUp1;
const statusUp2 = ASSETS.images.onboardPageIcons.statusUp2;
const taskSquare = ASSETS.images.onboardPageIcons.taskSquare;
const vitals = ASSETS.images.onboardPageIcons.vitals;
const voiceSquare = ASSETS.images.onboardPageIcons.voiceSquare;
const wallet = ASSETS.images.onboardPageIcons.wallet;
const repeatCircle = ASSETS.images.onboardPageIcons.repeatCircle;
const webStructure = ASSETS.images.webstructure;

const featureCardConfig = {
  "EMR Features": {
    colors: {
      primary: "#4CAF50",
      secondary: "#E8F5E9"
    },
    tabConfig: {
      "Clinical Care": {
        heading: <>Improve Clinical Care</>,
        points: [
          {
            icon: clipboardText,
            text: "Write Rx in 30 seconds"
          },
          {
            icon: examination,
            text: "Speciality Specific Modules"
          },
          {
            icon: profile2user,
            text: "Patient Engagement"
          }
        ],
        image: ClinicCare
      },
      "Admin Tasks": {
        heading: <>Simplify<br/>Clinic Management</>,
        points: [
          {
            icon: note,
            text: "Manage walk-ins and appointments"
          },
          {
            icon: receiptText,
            text: "Streamline billing and payments"
          },
          {
            icon: messages1,
            text: "Send Bulk Campaign Messages"
          }
        ],
        image: AdminTasks
      },
      "Analytics": {
        heading: <>Clinical<br/>Analytics Simplified</>,
        points: [
          {
            icon: graph,
            text: "Monitor patient trends"
          },
          {
            icon: health,
            text: "Evaluate treatment outcomes"
          },
          {
            icon: statusUp,
            text: "Access real-time revenue data"
          }
        ],
        image: Analytics
      }
    },
    icon:Emr
  },
  "Ai Features": {
    colors: {
      primary: "#2196F3",
      secondary: "#E3F2FD"
    },
    tabConfig: {
      "DDx": {
        heading: <><div className="ai-feature-heading">AI-Powered</div>Differential Diagnosis</>,
        points: [
          {
            icon: vitals,
            text: "Get DDx within Seconds"
          },
          {
            icon: ddx,
            text: "Identify Potential Diagnosis"
          },
          {
            icon: medication,
            text: "Discover effective treatment options"
          }
        ],
        image: TatvaAssist
      },
      "Smart Sync": {
        heading: <><div className="ai-feature-heading">Simplify</div>Prescription Writing</>,
        points: [
          {
            icon: documentText,
            text: "Write naturally with digital ink technology"
          },
          {
            icon: ddx,
            text: "Instantly capture and digitise prescriptions"
          },
          {
            icon: repeatCircle,
            text: "Sync effortlessly across all your devices"
          }
        ],
        image: SmartSync
      },
      "Voice Rx": {
        heading: <><div className="ai-feature-heading">AI-Powered</div>Prescription Writing</>,
        points: [
          {
            icon: documentText,
            text: "Generate Structured Prescriptions Quickly"
          },
          {
            icon: voiceSquare,
            text: "Combine Voice and Typing for Easier Input"
          },
          {
            icon: lampCharge,
            text: "Save Time and Enhance Efficiency"
          }
        ],
        image: VoiceRx
      },
      "TatvaAI": {
        heading: <><div className="ai-feature-heading">AI-Powered</div>Platform for Doctors</>,
        points: [
          {
            icon: documentCloud,
            text: "Personalized AI platform for smart care"
          },
          {
            icon: lampCharge,
            text: "Access reliable insights from PubMed"
          },
          {
            icon: taskSquare,
            text: "Make informed decisions with ease"
          }
        ],
        image: TatvaAi
      }
    },
    icon:Ai
  },
  "Digital Features": {
    colors: {
      primary: "#FF5722",
      secondary: "#FBE9E7"
    },
    tabConfig: {
      "Digital Presence": {
        heading: <>Supercharge<br/>Your Online Reach</>,
        points: [
          {
            icon: monitor,
            text: "Get a personalized practice website"
          },
          {
            icon: briefcase,
            text: "Optimize your Google Business Profile"
          },
          {
            icon: note2,
            text: "Accept online appointments effortlessly"
          }
        ],
        image: DigitalCare
      },
      "Remote Care": {
        heading: <>Empower<br/>Patient Care Anywhere</>,
        points: [
          {
            icon: wallet,
            text: "Earn by referring care programs"
          },
          {
            icon: people,
            text: "Easily access and review patient logs"
          },
          {
            icon: messages2,
            text: "Available on mobile app for easy access"
          }
        ],
        image: RemoteCare
      },
      "ABDM": {
        heading: <>Maximize<br/>Earnings with ABDM</>,
        points: [
          {
            icon: wallet,
            text: "Earn DHIS incentives via ABDM"
          },
          {
            icon: statusUp2,
            text: "Boost income with government support"
          },
          {
            icon: messages2,
            text: "Enhance practice visibility and credibility"
          }
        ],
        image: Abdm
      }
    },
    icon:Practice
  }
};

const FeatureTabCard = ({ feature, title, subTitle, tabs }) => {
  // States
  const [activeTab, setActiveTab] = useState('');
  const [cardConfig, setCardConfig] = useState({
    colors: {
      primary: "#4CAF50",
      secondary: "#E8F5E9"
    },
    tabConfig: {}
  });
  const [activeTabContent, setActiveTabContent] = useState({
    heading: "",
    points: [],
    image: ""
  });

  // Effect to set initial active tab
  useEffect(() => {
    if (tabs && tabs.length > 0) {
      setActiveTab(tabs[0]);
    }
  }, [tabs]);

  // Effect to update card configuration when feature changes
  useEffect(() => {
    if (feature) {
      const config = featureCardConfig[feature] || {
        colors: {
          primary: "#4CAF50",
          secondary: "#E8F5E9"
        },
        tabConfig: {}
      };
      setCardConfig(config);
    }
  }, [feature]);

  // Effect to update active tab content when tab or config changes
  useEffect(() => {
    if (cardConfig?.tabConfig && activeTab) {
      const content = cardConfig.tabConfig[activeTab] || {
        heading: "",
        points: [],
        image: ""
      };
      setActiveTabContent(content);
    }
  }, [activeTab, cardConfig]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  // Function to generate gradient style
  const getTabStyle = (isActive, isBackground = false) => {
    if (isActive && !isBackground) {
      // Define gradients based on feature type
      const gradients = {
        "EMR Features": `url(${webStructure}) right center/45% no-repeat,linear-gradient(92deg, #27276F -7.09%, #5C5BD6 46.98%, #27276F 107.96%)`,
        "Ai Features": `url(${webStructure}) right center/45% no-repeat,linear-gradient(92deg, #4558D0 -7.09%, #C95BC3 46.98%, #E0657B 107.96%)`,
        "Digital Features": `url(${webStructure}) right center/45% no-repeat,linear-gradient(92deg, #27276F -7.09%, #5C5BD6 46.98%, #27276F 107.96%)`
      };

      return {
        background: gradients[feature] || gradients["EMR Features"],
        color: 'white'
      };
    }
    if (isActive && isBackground) {
      // Option 1: Import the SVG directly at the top of the file and use it
      const backgroundGradients = {
        "EMR Features": `url(${webStructure}) right center/45% no-repeat, linear-gradient(119deg, #46286C -8.1%, #481C7F 14.33%, #181346 45.83%, #1A1A2F 94.62%)`,
        "Ai Features": `url(${webStructure}) right center/45% no-repeat, linear-gradient(112deg, #F8E1FB 1.39%, #D7A5EB 30.56%, #7946CB 89.33%)`,
        "Digital Features": `url(${webStructure}) right center/45% no-repeat, linear-gradient(114deg, #FEEDC0 -2.49%, #FDEAB8 16.82%, #FAD882 39.96%, #D59700 71.6%)`
      };

      const backgroundGradientsMobile = {
        "EMR Features": `url(${webStructure}) right bottom / 85% no-repeat, linear-gradient(119deg, #46286C -8.1%, #481C7F 14.33%, #181346 45.83%, #1A1A2F 94.62%)`,
        "Ai Features": `url(${webStructure}) right bottom / 85% no-repeat, linear-gradient(112deg, #F8E1FB 1.39%, #D7A5EB 30.56%, #7946CB 89.33%)`,
        "Digital Features": `url(${webStructure}) right bottom / 85% no-repeat, linear-gradient(114deg, #FEEDC0 -2.49%, #FDEAB8 16.82%, #FAD882 39.96%, #D59700 71.6%)`
      };

      // Option 2: Add additional background properties
      return {
        background: isMobile ? backgroundGradientsMobile[feature] || backgroundGradientsMobile["EMR Features"] : backgroundGradients[feature] || backgroundGradients["EMR Features"],
        backgroundSize: '45%, 100%', // First value for SVG, second for gradient
        backgroundPosition: 'right center, 0 0',
        backgroundRepeat: 'no-repeat, no-repeat',
        color: 'white'
      };
    }
    return {
      background: 'transparent',
      color: "#000"
    };
  };

  return (
    <div 
      className="feature-card-container"
    >
      <h1 className="main-heading">
        {title || 'Feature Card'}
        <br />
        {subTitle} 
        {featureCardConfig[feature]?.icon && (
          <img 
            src={featureCardConfig[feature].icon} 
            alt="feature-icon" 
            className="emoji"
            style={{ width: '3rem', height: '3rem' }}
          />
        )}
      </h1>

      <div 
        className="feature-tab-card"
        style={getTabStyle(true, true)} // Pass both parameters here
      >
        <div className="feature-tab-card__tabs">
          <div className="curved-shadow left"></div>
          <div className="curved-shadow right"></div>
          {(tabs || []).map((tab) => (
            <button
              key={tab}
              className={`feature-tab-card__tab ${tab === activeTab ? "active" : ""}`}
              onClick={() => handleTabClick(tab)}
              style={getTabStyle(tab === activeTab, false)} // Pass both parameters here
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="feature-tab-card__content">
          <div className="feature-tab-card__text">
            <h2 className="feature-tab-card__heading" style={{ color: feature === "Ai Features" || feature === "Digital Features" ? "#000000" : "#fff" }}>
              {activeTabContent?.heading || ''}
            </h2>

            <ul className="feature-tab-card__points">
              {(activeTabContent?.points || []).map((point, idx) => (
                <li key={idx} style={{ color: feature === "Ai Features" || feature === "Digital Features" ? "#000000" : "#fff" }}>
                  <img src={point.icon} alt="icon" className="icon"/>
                  {point.text}
                </li>
              ))}
            </ul>
          </div>

          {activeTabContent?.image && (
            <div className="feature-tab-card__image">
              <img 
                src={activeTabContent.image} 
                alt={`${activeTab} Demo`} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureTabCard;

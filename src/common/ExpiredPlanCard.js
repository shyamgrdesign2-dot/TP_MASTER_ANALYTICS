import React from "react";
import { Card, Button } from "antd";
import styles from "./ExpiredPlanCard.module.scss";

import { useSelector } from "react-redux";
import { ASSETS } from "../assets";
const {
  tag: tagImg,
  checkIcon,
  sandClock: sandClockIcon,
} = ASSETS.images;

const ExpiredPlanCard = () => {
  const { planDetails } = useSelector((state) => state.subscription);
  const { currentPlanStatus, expiresIn, lastPlanStatus } = planDetails || {};
  return (
    currentPlanStatus === "EXPIRED" && (
      <div className={styles.backdrop}>
        <div className={styles.cardContainer}>
          <Card bordered={false} className={styles.expiredPlanCard}>
            <div className={styles.modalContent}>
              {/* Left Section */}
              <div className={styles.leftSection}>
                {currentPlanStatus === "EXPIRED" &&
                  lastPlanStatus === "TRIAL" && (
                    <>
                      <h2>Your Trial Plan has Expired!</h2>
                      <p>
                        Your <strong>trial plan</strong> has expired{" "}
                        <strong>{Math.abs(expiresIn)} days</strong> ago. Upgrade
                        now to continue a hassle-free access!
                      </p>

                      <div
                        className={styles.offerBox}
                        style={{ backgroundImage: `url(${tagImg})` }}
                      >
                        <div className={styles.offerText}>
                          <span className={styles.discount}>10% off</span>
                          <span className={styles.exclusive}>
                            Exclusive, just for you!
                          </span>
                        </div>
                        <hr
                          style={{
                            borderTop: "1.5px dotted #00000024",
                            margin: "13px",
                          }}
                        />
                        <span className={styles.validity}>
                          Valid until 23 Aug 2024
                        </span>
                      </div>
                    </>
                  )}
                {currentPlanStatus === "EXPIRED" &&
                  ["PAID", "EXPIRED"].includes(lastPlanStatus) && (
                    <>
                      <h2>Your Plan has Expired!</h2>
                      <p>
                        Your <strong>Pro plan</strong> has expired{" "}
                        <strong>{Math.abs(expiresIn)} days</strong> ago. Renew
                        your plan now to continue a hassle free experience!
                      </p>
                      <img
                        src={sandClockIcon}
                        alt=""
                        className={styles.sandClockIcon}
                      />{" "}
                    </>
                  )}
              </div>

              {/* Right Section */}
              <div className={styles.rightSection}>
                <h2>Don't Lose Your Digital Advantage!</h2>
                <p className={styles.subtitle}>Upgrade your plan to continue</p>

                <ul className={styles.benefitsList}>
                  <li>
                    <img src={checkIcon} alt="" className={styles.checkIcon} />{" "}
                    Seamless clinic management all in one place
                  </li>
                  <li>
                    <img src={checkIcon} alt="" className={styles.checkIcon} />{" "}
                    Secure & instant access to patient records
                  </li>
                  <li>
                    <img src={checkIcon} alt="" className={styles.checkIcon} />{" "}
                    Effortless e-prescriptions with less paperwork
                  </li>
                  <li>
                    <img src={checkIcon} alt="" className={styles.checkIcon} />{" "}
                    Advanced analytics for better patient care
                  </li>
                </ul>

                <p className={styles.upgradeText}>
                  Keep your clinic smart & efficient with TatvaCare. Upgrade now
                  and get an exclusive <strong>10% off</strong>.
                </p>

                <Button type="primary" className={styles.contactButton}>
                  Contact Support
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  );
};

export default ExpiredPlanCard;

import React from "react";
import { Card, Typography } from "antd";
import ProfileIcon from "../../../common/ProfileIcon";
import "./styles.scss";
import { ASSETS } from "../../../assets";
const theme = ASSETS.scss.variables;

const { Text } = Typography;

const PatientInfoCard = ({
  name,
  gender,
  age,
  phone,
  className = "",
  ...rest
}) => (
  <Card
    bordered={true}
    className={`patient-info-card p-12 ${className}`}
    {...rest}
  >
    <div className="d-flex align-items-center justify-content-start">
      <ProfileIcon
        className="rounded-circle"
        fill={theme.themeShade2}
        bgFill={theme.grayLight}
      />
      <div className="ps-2">
        <div className="pb-1">
          <Text className="pe-1 fw-semibold">{name}</Text>
          <Text>
            ({gender}, {age})
          </Text>
        </div>
        <Text>{phone}</Text>
      </div>
    </div>
  </Card>
);

export default PatientInfoCard;

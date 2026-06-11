

import LoopingVideo from "../../common/LoopingVideo";
import { ASSETS } from "../../../assets";
const {
  succcessAbhaAnimation_2: SuccessWebm,
  succcessAbhaAnimation: SuccessMp4,
} = ASSETS.images;

const AbhaSuccessScreen = () => {
  return (
    <div className="abha_verified_container">
      <LoopingVideo
        webm={SuccessWebm}
        mp4={SuccessMp4}
        width={200}
        ariaLabel="Success"
      />
      <div className="verified_label">Verified successfully</div>
    </div>
  );
};

export default AbhaSuccessScreen;

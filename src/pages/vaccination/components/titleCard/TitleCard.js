import styles from "./titleCard.scss";
import { ASSETS } from "../../../../assets";

const TitleCard = () => {
  return (
    <div className={styles.frameParent}>
      <img
        className={styles.frameChild}
        alt="Baby"
        src={ASSETS.images.babyimage}
      />
      <div className={styles.frameGroup}>
        <div className={styles.productsListParent}>
          <div className={styles.productsList}>Baby Janvi</div>
        </div>
        <div className={styles.productsList1}>Age : 12 Years, Female</div>
      </div>
    </div>
  );
};

export default TitleCard;

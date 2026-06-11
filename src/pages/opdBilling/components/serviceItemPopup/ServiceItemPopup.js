import { Input, Radio } from "antd";
import CommonModal from "../../../../common/CommonModal";
import { Button } from "react-bootstrap";
import { useState } from "react";
import { upsertBillItem } from "../../service";
import { useSelector } from "react-redux";
import { calculateTotalAmount } from "../../utils/helper";
import {
  getClinic,
  onlyDecimalFormat,
  trackEvent,
} from "../../../../utils/utils";

const ServiceItemPopup = ({
  onCancel,
  editIndex,
  item,
  setDataSource,
  addRow,
  setSearchQuery,
}) => {
  const { advancedSettings } = useSelector((state) => state.billing);
  const [serviceItem, setServiceItem] = useState({
    id: item?.id || item?.masterId,
    name: item?.name,
    type: item?.type || "Service",
    price: item?.price || item?.amount,
    discount: item?.discount,
    discountType: item?.discountType || advancedSettings?.defaultDiscountType,
    gst: item?.gst,
  });
  const { profile } = useSelector((state) => state.doctors);
  const { planDetails } = useSelector((state) => state.subscription);

  const handleServiceItem = (key, value) => {
    setServiceItem((prev) => {
      return {
        ...prev,
        [key]: value,
        ...(key === "discountType" && { discount: undefined }),
      };
    });
  };

  const addOrEditServieItem = async () => {
    if (editIndex === -1) {
      const clinic = getClinic();
      trackEvent("TP_Billing_Addnewseriviceadd", {
        doctorSpeciality: profile?.dp_name,
        doctorId: profile?.doctor_unique_id,
        doctorContact: profile?.um_contact,
        city: clinic?.hm_city,
        pincode: clinic?.hm_pincode,
        subscriptionStatus: planDetails?.currentPlanStatus,
        type: serviceItem?.type
      });
    }
    serviceItem.totalAmount = calculateTotalAmount(serviceItem);
    handleServiceItem(serviceItem);
    const billItemRes = await upsertBillItem({
      ...serviceItem,
      discount: serviceItem?.discount || undefined,
      gst: serviceItem?.gst || undefined,
    });
    if (billItemRes?.id) {
      setDataSource((prev) => {
        const updatedData = [...prev];
        const updateIndex = editIndex > -1 ? editIndex : item?.index;

        if (updateIndex > -1 && updatedData[updateIndex]) {
          updatedData[updateIndex] = {
            ...billItemRes,
            ...updatedData[updateIndex], // Keep existing values
            masterId: billItemRes?.id,
            quantity: 1,
            name: serviceItem?.name,
            amount: serviceItem?.price,
            discount: serviceItem?.discount,
            discountType: serviceItem?.discountType,
            type: serviceItem?.type,
            gst: serviceItem?.gst,
            totalAmount: serviceItem?.totalAmount,
            createdBy: billItemRes?.createdBy,
          };
          addRow &&
            updateIndex === prev?.length - 1 &&
            updatedData.push({
              masterId: "",
              name: "",
              quantity: "",
              amount: "",
              discount: "",
              discountType: "",
              gst: "",
              totalAmount: "",
              createdBy: "",
            });
        } else {
          // If no valid index, add a new item
          updatedData.push({
            masterId: billItemRes?.id,
            quantity: 1,
            name: serviceItem?.name,
            amount: serviceItem?.price,
            discount: serviceItem?.discount,
            discountType: serviceItem?.discountType,
            type: serviceItem?.type,
            gst: serviceItem?.gst,
            totalAmount: serviceItem?.totalAmount,
            createdBy: billItemRes?.createdBy,
            ...billItemRes,
          });
        }
        return updatedData;
      });
      setSearchQuery && setSearchQuery("");
      onCancel();
    }
  };

  return (
    <div>
      <CommonModal
        isModalOpen={true}
        onCancel={onCancel}
        modalWidth={500}
        title={editIndex === -1 ? "Add New Item" : "Edit Item"}
        modalBody={
          <>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex gap-5 align-items-center">
                <label
                  className="d-flex"
                  style={{ fontWeight: 500, width: 110 }}
                >
                  Name <span className="bdg-danger">*</span>
                </label>
                <Input
                  value={serviceItem.name}
                  style={{ height: 38 }}
                  onChange={(e) => handleServiceItem("name", e.target.value)}
                />
              </div>

              <div className="d-flex gap-5 align-items-center">
                <label
                  className="d-flex"
                  style={{ fontWeight: 500, width: 110 }}
                >
                  Price/Unit <span className="bdg-danger">*</span>
                </label>
                <Input
                  value={serviceItem.price}
                  inputMode="decimal"
                  onChange={(e) => {
                    const price = onlyDecimalFormat(e.target.value);
                    if (price <= 1000000000) {
                      handleServiceItem("price", price);
                    }
                  }}
                  style={{ height: 38 }}
                  prefix={<i style={{ fontSize: 14 }}>₹</i>}
                />
              </div>

              <div className="d-flex gap-5 align-items-center">
                <label
                  className="d-flex"
                  style={{ fontWeight: 500, width: 110 }}
                >
                  Discount
                </label>
                <Input
                  value={serviceItem.discount}
                  inputMode="decimal"
                  onChange={(e) => {
                    const discount = onlyDecimalFormat(e.target.value);
                    if (
                      (serviceItem.discountType === "percentage" &&
                        discount <= 100) ||
                      (serviceItem.discountType === "flat" &&
                        Number(discount) <= Number(serviceItem.price))
                    ) {
                      handleServiceItem(
                        "discount",
                        discount ? discount : undefined
                      );
                    }
                  }}
                  style={{ height: 38 }}
                />
                <div
                  style={{ position: "absolute", right: "35px", zIndex: 10 }}
                >
                  <Radio.Group
                    value={serviceItem.discountType}
                    style={{ display: "flex", width: "60px" }}
                    onChange={(e) =>
                      handleServiceItem("discountType", e.target.value)
                    }
                  >
                    <Radio.Button
                      value={"percentage"}
                      style={{
                        width: "50%",
                        height: "23px",
                      }}
                      className="custom-radio-button d-flex align-items-center justify-content-center"
                    >
                      %
                    </Radio.Button>
                    <Radio.Button
                      value={"flat"}
                      style={{
                        width: "50%",
                        height: "23px",
                      }}
                      className="custom-radio-button  d-flex align-items-center justify-content-center"
                    >
                      ₹
                    </Radio.Button>
                  </Radio.Group>
                </div>
              </div>

              <div className="d-flex gap-5 align-items-center">
                <label
                  className="d-flex"
                  style={{ fontWeight: 500, width: 110 }}
                >
                  GST
                </label>
                <Input
                  value={serviceItem.gst}
                  inputMode="decimal"
                  onChange={(e) => {
                    const value = onlyDecimalFormat(e.target.value);
                    handleServiceItem(
                      "gst",
                      value > 100 ? serviceItem.gst : value ? value : undefined
                    );
                  }}
                  style={{ height: 38 }}
                  suffix={
                    <i style={{ fontFamily: "Roboto", fontSize: 14 }}>%</i>
                  }
                />
              </div>

              <div className="d-flex gap-5 align-items-center">
                <label
                  className="d-flex"
                  style={{ fontWeight: 500, width: 110 }}
                >
                  Type <span className="bdg-danger">*</span>
                </label>
                <Radio.Group
                  value={serviceItem.type}
                  style={{ display: "flex", width: "100%" }}
                  onChange={(e) => handleServiceItem("type", e.target.value)}
                >
                  <Radio.Button
                    value={"Service"}
                    style={{
                      width: "50%",
                      height: "41px",
                      padding: "5px 0 0 20px",
                    }}
                    className="custom-radio-button"
                  >
                    Service
                  </Radio.Button>
                  <Radio.Button
                    value={"Consumables"}
                    style={{
                      width: "50%",
                      height: "41px",
                      padding: "5px 0 0 20px",
                    }}
                    className="custom-radio-button"
                  >
                    Consumables
                  </Radio.Button>
                </Radio.Group>
              </div>
            </div>

            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={onCancel}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  {"Cancel"}
                </div>
                <Button
                  onClick={addOrEditServieItem}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                  disabled={
                    !serviceItem.type || !serviceItem.name || !serviceItem.price
                  }
                >
                  <span>{editIndex === -1 ? "Add" : "Save"}</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    </div>
  );
};

export default ServiceItemPopup;

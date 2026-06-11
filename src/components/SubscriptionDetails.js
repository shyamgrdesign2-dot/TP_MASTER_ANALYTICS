import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchSubscriptionDetails } from "../redux/subscriptionSlice";

const SubscriptionDetails = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchSubscriptionDetails()); // Fetch subscription details on every reload
  }, [dispatch]);

  return <></>;
};

export default SubscriptionDetails;

import React, { useState } from "react";
import "./FAQ.scss";
import { ASSETS } from "../../../../assets";
import config from "../../../../config";
const testimonialIcon = ASSETS.images.onboardPageIcons.lpFaqIcon;

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqData = [
    {
      question: "Why do I need to validate my government ID proof?",
      answer:
        "ID proof validation confirms the identity of doctors joining our platform. It ensures regulatory compliance and builds a secure, trustworthy environment for all users.",
    },
    {
      question: "How long will my account stay active after onboarding?",
      answer:
        "Your account stays active for 30 days post-onboarding. During this time, you must complete key steps like uploading your MCI certificate to continue using the platform without interruption.",
    },
    {
      question: "What happens if I don’t complete onboarding within 30 days?",
      answer:
        "After 30 days, your account may face restricted access. Complete the required steps in time to maintain seamless access to all features.",
    },
    {
      question: "Where do I upload my MCI certificate?",
      answer:
        "You can upload your MCI certificate within 7 days of account creation. Go to 'My Profile' on the platform’s landing page and follow the instructions to upload.",
    },
    {
      question: "What if I miss the MCI certificate upload deadline?",
      answer:
        "Missing the 7-day deadline may restrict key functionalities like writing prescriptions. Please upload it on time to avoid disruptions.",
    },
    {
      question: "Can I use the platform on multiple devices?",
      answer: `Yes, you can use the app on iPads, Android tablets, and iOS tablets. For desktop or laptop, visit ${config.doctor_portal_url} and log in using your credentials.`,
    },
    {
      question:
        "What should I do if I face issues during onboarding or using the platform?",
      answer:
        "Reach out to your assigned Key Account Manager or contact our support team at +91 99740 42363 or support@tatvacare.in. We’re here to help.",
    },
    {
      question: "What does it mean to be a paid user?",
      answer:
        "Converted users enjoy one-year account validity and access to premium features. This status is granted after completing steps like payment, agreement submissions, and consistent prescription quality.",
    },
    {
      question: "Do I need internet access to use the platform?",
      answer:
        "Yes, a stable internet connection is necessary for real-time prescription generation and to access all platform features effectively.",
    },
    {
      question: "How can I share feedback about the platform?",
      answer:
        "We’d love to hear from you. Email your feedback to support@tatvacare.in or comment on update posts via the notification panel on your homepage.",
    },
    {
      question: "Where can I find my payment invoices?",
      answer:
        "Log in and head to 'My Profile' to view all your payment invoices. Each transaction is automatically recorded and documented there.",
    },
    {
      question: "What payment methods are supported?",
      answer:
        "We accept payments via UPI, credit/debit cards, and online banking.",
    },
  ];  

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="faq-container">
      <h2 className="faq-title">
        <img src={testimonialIcon} alt="feature-icon" />
        FAQs
        <img src={testimonialIcon} alt="feature-icon" />
      </h2>

      <div className="faq-list">
        {faqData.map((item, index) => (
          <div
            key={index}
            className={`faq-item ${activeIndex === index ? "active" : ""}`}
            onClick={() => toggleAccordion(index)}
          >
            <div className="faq-question">
              <span>{item.question}</span>
              <i
                className="icon-right"
                style={{
                  display: "block",
                  transform: activeIndex === index ? "rotate(90deg)" : "rotate(270deg)",
                  color: "#8077B7",
                }}
              />
            </div>
            <div className="faq-answer">{item.answer}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;

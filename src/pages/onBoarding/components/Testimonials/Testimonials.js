import React, { useState, useRef, useEffect } from "react";
import "./Testimonials.scss";
import { ASSETS } from "../../../../assets";
const testimonialIcon = ASSETS.images.onboardPageIcons.lpTestimonialIcon;
const profile = ASSETS.images.defaultProfile;
const Dr_Nisheet = ASSETS.images.onboardPageIcons.docNisheetDave;
const Dr_Kautuk = ASSETS.images.onboardPageIcons.docKautukPatel;
const Dr_Amit = ASSETS.images.onboardPageIcons.docAmitMadan;
const Dr_Pratibha = ASSETS.images.onboardPageIcons.docPratibhaSingh;
const Dr_Sneha = ASSETS.images.onboardPageIcons.docSnehaJhadhav;
const Dr_Deep = ASSETS.images.onboardPageIcons.docDeepFultera;
const Dr_Garima = ASSETS.images.onboardPageIcons.docGarima;

const Testimonials = () => {
  const testimonials = [
    {
      name: "Dr. Amit Madan",
      qualification: "Dermatologist",
      image: Dr_Amit,
      rating: 5,
      hospitalLogo: "",
      location: "Lucknow",
      review:
        '"I am  extremely satisfied with the platform’s performance. The timely support physical and online, regular features upgrades, and seamless AI integration have significantly enhanced my workflow. The data back up with follow up photos of patients add to treatment satisfaction and keeping record more organized with smart clinical tools."',
    },
    {
      name: "Dr. Garima Jain",
      qualification: "Obs and Gynaec",
      image: Dr_Garima,
      rating: 5,
      hospitalLogo: "",
      location: "Bangalore",
      review:
        '"I have been using the Tatva Practice EMR at Apollo Cradle and Childrens hospital at Bangalore. Very user friendly and gives the user the choice to modify the pattern of case sheets by their convenience. Features like save templates for everything on the case sheets had made it very convenient to use. The back office support is also amazing."',
    },
    {
      name: "Dr. Kautuk Patel",
      qualification: "Emergency physician & Intensivist",
      image: Dr_Kautuk,
      rating: 5,
      hospitalLogo: "",
      location: "Mehsana",
      review:
        '"Tatvacare is feature loaded yet simple to use HMIS. Very useful in Outpatient as well as Inpatient management. Regular  updates & support team is added benefit. Quite happy after using their service."',
    },
    {
      name: "Dr. Deep Fultera",
      qualification: "M.D, Paediatrics",
      image: Dr_Deep,
      rating: 5,
      hospitalLogo: "",
      location: "Rajkot",
      review:
        '"Tatvacare offers a seamless and intuitive interface, making patient management and billing incredibly efficient. Its feature and customizable templates streamline clinical workflows, saving time and enhancing accuracy. Highly recommended for modern healthcare practitioner."',
    },
    {
      name: "Dr. Sneha Jhadhav",
      qualification: "M.D, General Practice",
      image: Dr_Sneha,
      rating: 5,
      hospitalLogo: "",
      location: "Mumbai",
      review:
        '"TatvaPractice is very easy to operate. It covers all the parameters required considering the patient case history. Even the patient are able to read & understand prescription very easily. I am happy with this app. Even the helping team of the app are very helpful. They guide us every time when we have an issue."',
    },
    {
      name: "Dr Nisheet Dave",
      qualification: "Orthopaedic",
      image: Dr_Nisheet,
      rating: 5,
      hospitalLogo: "",
      location: "Ahmedabad",
      review:
        '"TatvaPractice with AI feature has transformed how I diagnose and manage patients. Now I spend less time on admin work and more time on patient care.",'
    },
    {
      name: "Dr. Pratibha Singh",
      qualification: "Obs and Gynaec",
      image: Dr_Pratibha,
      rating: 5,
      hospitalLogo: "",
      location: "Lucknow",
      review:
        '"As a Gynecologist and Head of the IVF Department at a Superspecialty Hospital, I have been using Tatvacare EMR and am extremely pleased with its performance. The platform is reliable, easy to navigate, and the timely support and consistent upgrades have made it an essential part of our daily clinical workflow"',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const wrapperRef = useRef(null);
  const isScrolling = useRef(false);

  const handleScroll = () => {
    if (!isScrolling.current && wrapperRef.current) {
      const scrollPosition = wrapperRef.current.scrollLeft;
      const cardWidth = wrapperRef.current.offsetWidth;
      const newIndex = Math.round(scrollPosition / cardWidth);
      setCurrentIndex(newIndex);
    }
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener("scroll", handleScroll);
      return () => wrapper.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const scrollToIndex = (index) => {
    if (wrapperRef.current && !isScrolling.current) {
      isScrolling.current = true;
      const cardWidth = wrapperRef.current.offsetWidth;
      wrapperRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });

      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrolling.current = false;
        setCurrentIndex(index);
      }, 500); // Match this with your transition duration
    }
  };

  const handlePrev = () => {
    if (wrapperRef.current) {
      const scrollAmount = wrapperRef.current.offsetWidth;
      wrapperRef.current.scrollBy({
        left: -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleNext = () => {
    if (wrapperRef.current) {
      const scrollAmount = wrapperRef.current.offsetWidth;
      wrapperRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const visibleTestimonials = testimonials.slice(
    currentIndex,
    currentIndex + 3
  );

  return (
    <div className="testimonials-container">
      <h2 className="testimonials-title">
        Hear from
        <br />
        Healthcare Professionals
        <img src={testimonialIcon} alt="feature-icon" />
      </h2>
      <div className="testimonials-carousel">
        <button className="prev" onClick={handlePrev}>
          ←
        </button>
        <div className="testimonials-wrapper" ref={wrapperRef}>
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-header">
                <div className="doctor-info">
                  <img
                    src={testimonial.image ? testimonial.image : profile}
                    alt={testimonial.name}
                    className="doctor-image"
                  />
                  <div>
                    <h3>{testimonial.name}</h3>
                    <p>{testimonial.qualification}</p>
                    <div className="rating">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < testimonial.rating ? "star filled" : "star"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {testimonial.hospitalLogo && (
                  <img
                    src={testimonial.hospitalLogo}
                    alt="Hospital"
                    className="hospital-logo"
                  />
                )}
              </div>
              <p className="testimonial-text">{testimonial.review}</p>
            </div>
          ))}
        </div>
        <button className="next" onClick={handleNext}>
          →
        </button>
      </div>
      <div className="mobile-dots">
        {testimonials.map((_, index) => (
          <React.Fragment key={index}>
            <button
              className={`dot ${currentIndex === index ? "active" : ""}`}
              onClick={() => scrollToIndex(index)}
            />
            {index < testimonials.length - 1 && <div className="slider-dash" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;

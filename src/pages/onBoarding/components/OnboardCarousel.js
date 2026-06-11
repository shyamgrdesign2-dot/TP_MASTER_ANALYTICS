import React, { useState, useEffect, useRef } from "react";
import { Carousel } from "antd";
import "./Onboarding.scss";

import LoopingVideo from "../../../components/common/LoopingVideo";
import { getUtmParams } from "../../../components/userOnboarding/services/userDataService";
import { detectOperatingSystem } from "../../../utils/loginUtils";
import { ASSETS } from "../../../assets";
const smartSync = ASSETS.images.websiteImages.smartsyncbanner;
const practiceManagement = ASSETS.images.websiteImages.practicemanagementbanner;
const ddxBanner = ASSETS.images.websiteImages.ddxbanner;
const emrBanner = ASSETS.images.websiteImages.emrbanner;
const tatvaAiBanner = ASSETS.images.websiteImages.tatvaaibanner;
const fastBackwardWebm = ASSETS.images.onboardPageIcons.fastBackward_2;
const fastBackwardMp4 = ASSETS.images.onboardPageIcons.fastBackward;

const OnboardingCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const carouselRef = useRef(null);
  
  // Get UTM params
  const utm = getUtmParams();

  const baseCarouselItems = [
    {
      id: 1,
      title: "Boost Your Practice with",
      subtitle: "Our AI-Powered Smart Sync",
      image: smartSync,
      imageAvif: null,
      utmKey: "smartsync",
    },
    {
      id: 2,
      title: "AI-Powered",
      subtitle: "Clinical Decision Support",
      image: ddxBanner,
      imageAvif: null,
      utmKey: "ddx",
    },
    {
      id: 3,
      title: "Build and Scale Your",
      subtitle: "Online Presence with Us",
      image: practiceManagement,
      imageAvif: null,
      utmKey: "practice",
    },
    {
      id: 4,
      title: "Supercharge Your",
      subtitle: "Research with TatvaAI",
      image: tatvaAiBanner,
      imageAvif: null,
      utmKey: "tatvaai",
    },
    {
      id: 5,
      title: "India's Best EMR",
      subtitle: "Trusted by 10,000+ Doctors",
      image: emrBanner,
      imageAvif: null,
      utmKey: "emr",
    },
  ];

  const sortCarouselItems = () => {
    const utm = getUtmParams();
    const utmTerm = utm.utm_term;
    // If no UTM term, return original order
    if (!utmTerm) return baseCarouselItems;

    return [
      // First, find the item that matches the UTM term
      ...baseCarouselItems.filter((item) => item.utmKey === utmTerm),
      // Then add all other items
      ...baseCarouselItems.filter((item) => item.utmKey !== utmTerm),
    ];
  };

  const carouselItems = sortCarouselItems();

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        const newProgress = oldProgress + 1;
        if (newProgress === 100) {
          // Move to next slide when progress reaches 100%
          if (carouselRef.current) {
            carouselRef.current.next();
          }
          return 0;
        }
        return newProgress;
      });
    }, 50); // 50ms * 100 steps = 5000ms total duration

    return () => {
      clearInterval(timer);
    };
  }, []);

  const settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    effect: "rtl",
    cssEase: "ease-in-out",
    beforeChange: (_, next) => {
      setCurrentSlide(next);
      setProgress(0);
    },
  };

  const handleExploreMore = () => {
    window.Moengage.track_event("TP_NewLoginFlow_Explore_more", {
      clicked: true,
      operating_system: detectOperatingSystem(),
      utm_campaign: utm.utm_campaign ?? 'NA',
      utm_source: utm.utm_source ?? 'NA',
      utm_medium: utm.utm_medium ?? 'NA',
      utm_content: utm.utm_content ?? 'NA',
      utm_term: utm.utm_term ?? 'NA',
      is_marketing: Object.values(utm).some(value => value && value.length > 0),
    });
    const trustedBySection = document.getElementById("trusted-by-section");
    if (trustedBySection) {
      trustedBySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="onboarding-carousel-wrapper">
      <div className="logo-container">
        <img
          src={ASSETS.images.logo}
          className="d-inline-block align-top"
          width="150px"
          height="35px"
          alt="Logo"
        />
      </div>

      <div className="carousel-container">
        <Carousel ref={carouselRef} {...settings}>
          {carouselItems.map((item, index) => (
            <div key={index} className="carousel-item">
              <div className="text-content">
                <h1>{item.title}</h1>
                <h1>{item.subtitle}</h1>
              </div>
              <div className="banner-container">
                <picture>
                  {item.imageAvif ? (
                    <source srcSet={item.imageAvif} type="image/avif" />
                  ) : null}
                  <source srcSet={item.image} type="image/webp" />
                  <img
                    src={item.image}
                    alt={item.title}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    decoding="async"
                    width={641}
                    height={496}
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "641px",
                      height: "auto",
                      aspectRatio: "641 / 496",
                    }}
                  />
                </picture>
              </div>
            </div>
          ))}
        </Carousel>

        <div className="custom-dots">
          {carouselItems.map((_, index) => (
            <div
              key={index}
              className="dot-container"
              onClick={() => {
                if (carouselRef.current) {
                  carouselRef.current.goTo(index);
                }
              }}
            >
              <div
                className="progress-bar"
                style={{
                  width: `${
                    index === currentSlide
                      ? progress
                      : index < currentSlide
                      ? 100
                      : 0
                  }%`,
                  backgroundColor:
                    index <= currentSlide ? "#5857DC" : "#E4E4E7",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="explore-more" onClick={handleExploreMore} style={{ cursor: 'pointer' }}>
        <button>
          Explore more
          <LoopingVideo
            webm={fastBackwardWebm}
            mp4={fastBackwardMp4}
            className="scroll-arrow"
            ariaLabel="scroll down"
          />
        </button>
      </div>
    </div>
  );
};

export default OnboardingCarousel;

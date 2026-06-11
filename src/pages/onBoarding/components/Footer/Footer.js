import React from 'react';
import { Row, Col } from 'antd';
import { FacebookOutlined, TwitterOutlined, LinkedinOutlined, YoutubeOutlined, PhoneOutlined, MailOutlined, InstagramOutlined } from '@ant-design/icons';
import "./Footer.scss";
import { ASSETS } from "../../../../assets";
const Logo = ASSETS.images.websiteImages.tatvacareLogo;
const call = ASSETS.images.onboardPageIcons.call;
const emailIcon = ASSETS.images.onboardPageIcons.emailicon;
const locationIcon = ASSETS.images.onboardPageIcons.locationicon;

// 

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="company-info">
          <img src={Logo} alt="logo" className="footer-logo" />
          <p className="company-description">
            We are a full-spectrum technology solution that solves across various aspects of both patients' and doctors' needs and their interactions to significantly improve health outcomes.
          </p>
        </div>
        <div className="footer-section">
          <h3>Offices</h3>
          <div className="office-locations">
            <div className="office">
              <h4 style={{ textDecoration: 'underline' }}>Bangalore</h4>
              <p>Digicare Health Solutions Pvt. Ltd., 2nd Floor, 14th Main Rd, Sector 5, Agara Village, 1st Sector, HSR Layout, Bangalore, Karnataka - 560102</p>
            </div>
            <div className="office">
              <h4 style={{ textDecoration: 'underline' }}>Ahmedabad</h4>
              <p>Digicare Health Solutions Pvt. Ltd., 4th Floor, Plot No 115/5, TP Scheme No. 51, off Ambli-Bopal Road, Ahmedabad, Gujarat - 380058</p>
            </div>
          </div>
        </div>
        <div className="footer-section-contact">
          <h5>Contact Us</h5>
          <div className="contact-info">
            <div className="contact-item">
              <img src={call} alt="call" className="contact-icon" />
              +91 99740 42363
            </div>
            <p className="timing">(Monday - Saturday | 9am to 8pm)</p>
            <div className="contact-item">
              <img src={emailIcon} alt="email" className="contact-icon" />
              support@tatvacare.in
            </div>
          </div>
          <div className="social-links">
            <h5>Follow Us</h5>
            <div className="social-icons">
              <a href="https://www.instagram.com/tatvapractice.in/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramOutlined /></a>
              <a href="https://www.linkedin.com/showcase/tatvapractice/about/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><LinkedinOutlined /></a>
              {/* <a href="https://www.youtube.com/TatvaCare" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><YoutubeOutlined /></a> */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;